import { Storage, StorageOptions } from '@google-cloud/storage';
import env from '../config/env';
import logger from './logger';

// Initialize storage options, primarily setting the project ID if available.
// The @google-cloud/storage library will automatically use
// GOOGLE_APPLICATION_CREDENTIALS environment variable if set.
const storageOptions: StorageOptions = {};
if (env.gcsKeyfile) {
  storageOptions.keyFilename = env.gcsKeyfile;
}
if (env.gcsProjectId) {
  storageOptions.projectId = env.gcsProjectId;
  logger.info(`GCS Project ID set to: ${env.gcsProjectId}`);
} else {
  logger.warn('gcsProjectId not set.');
}

logger.info('Initializing Google Cloud Storage client with explicit keyfile...');
// Pass the options with keyFilename to the constructor
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