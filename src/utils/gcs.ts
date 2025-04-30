import { Storage, StorageOptions } from '@google-cloud/storage';
import env from '../config/env';
import logger from './logger';
import path from 'path';
import fs from 'fs';

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
  logger.info(`Uploading file ${filename} to bucket ${env.gcsBucket}`);
  const file = bucket.file(filename);
  await file.save(buffer, { contentType });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${env.gcsBucket}/${filename}`;
  logger.info(`Upload complete: ${publicUrl}`);
  return publicUrl;
}