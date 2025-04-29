import { Storage, StorageOptions } from '@google-cloud/storage';
import env from '../config/env';
import logger from './logger'; // Import logger

let storageOptions: StorageOptions = {};

if (env.GCS_KEYFILE) {
  try {
    // Attempt to parse the env var as JSON content
    const credentials = JSON.parse(env.GCS_KEYFILE);
    storageOptions = { projectId: env.GCS_PROJECT_ID, credentials };
    logger.info('Using GCS credentials from GCS_KEYFILE content.');
  } catch (e) {
    // If parsing fails, assume it's a file path
    storageOptions = { projectId: env.GCS_PROJECT_ID, keyFilename: env.GCS_KEYFILE };
    logger.info(`Using GCS key file path from GCS_KEYFILE: ${env.GCS_KEYFILE}`);
  }
} else {
  logger.info('Using Application Default Credentials for GCS.');
  // Use ADC if GCS_KEYFILE is not set
  if (env.GCS_PROJECT_ID) {
    storageOptions = { projectId: env.GCS_PROJECT_ID };
  }
}

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