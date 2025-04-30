import { Storage } from '@google-cloud/storage';
import env from '../config/env';
import logger from './logger';
import path from 'path';
import { getErrorMessage } from './error-utils';

// Initialize storage client with default authentication
// When running in Cloud Run, it will automatically use the service account
// credentials of the Cloud Run service
logger.info('Initializing Google Cloud Storage client with default authentication');
const storage = new Storage();
const bucket = storage.bucket(env.gcsBucket);

// Maximum number of retry attempts for uploads
const MAX_RETRIES = 3;

// Default cache duration (1 day in seconds)
const DEFAULT_CACHE_DURATION = 86400;

/**
 * Uploads an image to Google Cloud Storage with retry logic and best practices
 * @param buffer - The file buffer to upload
 * @param filename - The filename to use in GCS
 * @param contentType - The MIME type of the file
 * @param options - Additional upload options
 * @returns Promise with the public URL or signed URL of the uploaded file
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string,
  options: {
    isPublic?: boolean; 
    cacheMaxAge?: number;
    metadata?: Record<string, string>;
  } = {}
): Promise<string> {
  try {
    // Validate inputs to prevent path-related issues
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty file buffer provided');
    }
    
    if (!filename || typeof filename !== 'string') {
      throw new Error(`Invalid filename provided: ${filename}`);
    }
    
    // Sanitize filename to prevent path traversal and invalid characters
    // Ensure we're only using the basename and not any path information
    const baseName = path.basename(filename);
    const sanitizedFilename = baseName.replace(/[^\w\s.-]/g, '_');
    
    logger.info(`Uploading file "${sanitizedFilename}" to bucket "${env.gcsBucket}"`);
    logger.debug(`File content type: ${contentType}, size: ${buffer.length} bytes`);
    
    if (!env.gcsBucket) {
      throw new Error('GCS bucket name is not configured');
    }

    const file = bucket.file(sanitizedFilename);
    
    // Default options
    const isPublic = options.isPublic ?? true; // Default to public
    const cacheMaxAge = options.cacheMaxAge ?? DEFAULT_CACHE_DURATION;
    
    // Setup file metadata with cache control and content type
    const metadata = {
      contentType: contentType,
      cacheControl: `public, max-age=${cacheMaxAge}`,
      ...options.metadata
    };
    
    // Upload with retry logic
    let retries = 0;
    let uploadError: Error | null = null;
    
    while (retries <= MAX_RETRIES) {
      try {
        // Use resumable uploads for files > 5MB for better reliability
        const useResumableUpload = buffer.length > 5 * 1024 * 1024;
        
        // Upload the file with proper options
        await file.save(buffer, {
          resumable: useResumableUpload,
          contentType: contentType,
          metadata: metadata,
          gzip: true // Enable gzip compression for better performance
        });
        
        logger.info(`File saved successfully to GCS: ${sanitizedFilename} (attempt ${retries + 1})`);
        uploadError = null;
        break;
      } catch (saveError: unknown) {
        retries++;
        uploadError = saveError as Error;
        const errorMessage = getErrorMessage(saveError);
        logger.warn(`Error saving file to GCS (attempt ${retries}/${MAX_RETRIES}): ${errorMessage}`);
        
        if (retries <= MAX_RETRIES) {
          // Exponential backoff (2^retries * 100ms)
          const backoffMs = Math.min(Math.pow(2, retries) * 100, 3000);
          logger.debug(`Retrying upload in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    if (uploadError) {
      logger.error(`Failed to upload file after ${MAX_RETRIES} attempts`);
      throw uploadError;
    }
    
    // Handle public vs signed URL access
    let fileUrl: string;
    
    if (isPublic) {
      // Make the file publicly accessible
      await file.makePublic();
      fileUrl = `https://storage.googleapis.com/${env.gcsBucket}/${sanitizedFilename}`;
      logger.info(`File made public successfully: ${sanitizedFilename}`);
    } else {
      // Generate a signed URL that expires in 7 days (configurable)
      const signedUrlExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + signedUrlExpiry
      });
      
      fileUrl = signedUrl;
      logger.info(`Signed URL generated with ${signedUrlExpiry/86400000} days expiry`);
    }
    
    logger.info(`Upload complete: ${fileUrl}`);
    return fileUrl;
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error(`File upload failed: ${errorMessage}`, { 
      error,
      filename,
      contentType,
      bufferSize: buffer ? buffer.length : 'N/A',
      bucket: env.gcsBucket
    });
    throw error; // Re-throw for handling by the caller
  }
}

/**
 * Generates a signed URL for an existing file in Google Cloud Storage
 * @param filename - The name of the file in the bucket
 * @param expiryMs - Expiry time in milliseconds (default: 7 days)
 * @returns Promise with the signed URL
 */
export async function getSignedUrl(
  filename: string,
  expiryMs = 7 * 24 * 60 * 60 * 1000
): Promise<string> {
  try {
    const file = bucket.file(filename);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiryMs
    });
    
    return signedUrl;
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error(`Failed to generate signed URL: ${errorMessage}`, { error, filename });
    throw error;
  }
}

/**
 * Deletes a file from Google Cloud Storage
 * @param filename - The name of the file to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFile(filename: string): Promise<void> {
  try {
    const file = bucket.file(filename);
    await file.delete();
    logger.info(`File deleted successfully: ${filename}`);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error(`Failed to delete file: ${errorMessage}`, { error, filename });
    throw error;
  }
}