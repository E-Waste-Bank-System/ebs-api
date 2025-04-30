import { Storage, StorageOptions } from '@google-cloud/storage';
import env from '../config/env';
import logger from './logger'; // Import logger

// Initialize storage options, primarily setting the project ID if available.
// The @google-cloud/storage library will automatically use
// GOOGLE_APPLICATION_CREDENTIALS environment variable if set.
const storageOptions: StorageOptions = {
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Explicitly use the path from env var
};
if (env.GCS_PROJECT_ID) {
  storageOptions.projectId = env.GCS_PROJECT_ID;
  logger.info(`GCS Project ID set to: ${env.GCS_PROJECT_ID}`);
} else {
  logger.warn('GCS_PROJECT_ID environment variable not set.');
}

logger.info('Initializing Google Cloud Storage client with explicit keyfile...');
// Pass the options with keyFilename to the constructor
const storage = new Storage(storageOptions);
const bucket = storage.bucket(env.GCS_BUCKET);

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const file = bucket.file(filename);
  await file.save(buffer, { contentType });
  await file.makePublic();
  return `https://storage.googleapis.com/${env.GCS_BUCKET}/${filename}`;
}