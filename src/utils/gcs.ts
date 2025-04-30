import { Storage, StorageOptions } from '@google-cloud/storage';
import env from '../config/env';
import logger from './logger';
import path from 'path';
import fs from 'fs';
import { getErrorMessage } from './error-utils';

// Initialize storage options
const storageOptions: StorageOptions = {};

// Check for GCP Project ID
if (env.gcsProjectId) {
  storageOptions.projectId = env.gcsProjectId;
  logger.info(`GCS Project ID set to: ${env.gcsProjectId}`);
} else {
  logger.warn('gcsProjectId not set.');
}

// Handle credentials in a Docker-friendly way
if (process.env.NODE_ENV === 'production') {
  // In production (Docker container), use Google's default auth mechanism
  // which will use the appropriate service account credentials
  logger.info('Initializing Google Cloud Storage client with default authentication...');
} else if (env.gcsKeyfile) {
  // In development, use the keyfile if specified
  // Make sure path is resolved correctly
  const keyfilePath = path.resolve(process.cwd(), env.gcsKeyfile);
  
  if (fs.existsSync(keyfilePath)) {
    logger.info(`Using GCS keyfile at: ${keyfilePath}`);
    storageOptions.keyFilename = keyfilePath;
  } else {
    logger.error(`GCS keyfile not found at: ${keyfilePath}`);
  }
}

// Initialize storage client with appropriate options
const storage = new Storage(storageOptions);
const bucket = storage.bucket(env.gcsBucket);

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
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
    
    // More detailed logging for debugging
    logger.debug(`GCS file path: ${file.name}`);
    
    try {
      await file.save(buffer, { contentType });
      logger.info(`File saved successfully to GCS: ${sanitizedFilename}`);
    } catch (saveError: unknown) {
      const errorMessage = getErrorMessage(saveError);
      logger.error(`Error saving file to GCS: ${errorMessage}`, { error: saveError });
      throw new Error(`Failed to save file to GCS: ${errorMessage}`);
    }
    
    try {
      await file.makePublic();
      logger.info(`File made public successfully: ${sanitizedFilename}`);
    } catch (publicError: unknown) {
      const errorMessage = getErrorMessage(publicError);
      logger.error(`Error making file public: ${errorMessage}`, { error: publicError });
      throw new Error(`Failed to make file public: ${errorMessage}`);
    }
    
    const publicUrl = `https://storage.googleapis.com/${env.gcsBucket}/${sanitizedFilename}`;
    logger.info(`Upload complete: ${publicUrl}`);
    return publicUrl;
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