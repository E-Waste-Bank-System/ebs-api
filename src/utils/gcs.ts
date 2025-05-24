import { Storage } from '@google-cloud/storage';
import env from '../config/env';
import logger from './logger';
import path from 'path';
import { getErrorMessage } from './error-utils';
import { v4 as uuidv4 } from 'uuid';

process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
// process.env.GOOGLE_APPLICATION_CREDENTIALS = 'ebs-cloud-456404-472153b611d9.json';

logger.info('Initializing Google Cloud Storage client with workload identity authentication');
const storage = new Storage({
  projectId: env.gcsProjectId,
  keyFilename: undefined, 
});
const bucket = storage.bucket(env.gcsBucket);

const MAX_RETRIES = 3;

const DEFAULT_CACHE_DURATION = 86400;

function createSafeFilename(originalFilename: string): string {
  const extension = originalFilename.includes('.') 
    ? originalFilename.split('.').pop() 
    : '';
  return `detection_${uuidv4()}${extension ? '.' + extension.replace(/[^\w.-]/g, '') : ''}`;
}

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
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty file buffer provided');
    }
    
    if (!filename || typeof filename !== 'string') {
      throw new Error(`Invalid filename provided: ${filename}`);
    }
    
    const safeFilename = createSafeFilename(filename);
    
    logger.info(`Uploading file "${safeFilename}" to bucket "${env.gcsBucket}"`);
    logger.debug(`File content type: ${contentType}, size: ${buffer.length} bytes`);
    
    if (!env.gcsBucket) {
      throw new Error('GCS bucket name is not configured');
    }

    const file = bucket.file(safeFilename);
    
    const isPublic = options.isPublic ?? true; 
    const cacheMaxAge = options.cacheMaxAge ?? DEFAULT_CACHE_DURATION;
    
    const metadata = {
      contentType: contentType,
      cacheControl: `public, max-age=${cacheMaxAge}`,
      ...options.metadata
    };
    
    let retries = 0;
    let uploadError: Error | null = null;
    
    while (retries <= MAX_RETRIES) {
      try {
        const useResumableUpload = buffer.length > 5 * 1024 * 1024;
        
        await file.save(buffer, {
          resumable: useResumableUpload,
          contentType: contentType,
          metadata: metadata,
          gzip: true
        });
        
        logger.info(`File saved successfully to GCS: ${safeFilename} (attempt ${retries + 1})`);
        uploadError = null;
        break;
      } catch (saveError: unknown) {
        retries++;
        uploadError = saveError as Error;
        const errorMessage = getErrorMessage(saveError);
        logger.warn(`Error saving file to GCS (attempt ${retries}/${MAX_RETRIES}): ${errorMessage}`);
        
        if (retries <= MAX_RETRIES) {
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
    
    let fileUrl: string;
    
    if (isPublic) {
      await file.makePublic();
      fileUrl = `https://storage.googleapis.com/${env.gcsBucket}/${safeFilename}`;
      logger.info(`File made public successfully: ${safeFilename}`);
    } 
    else {
      const signedUrlExpiry = 7 * 24 * 60 * 60 * 1000; 
      
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
    throw error; 
  }
}

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