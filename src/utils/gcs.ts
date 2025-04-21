import { Storage } from '@google-cloud/storage';
import env from '../config/env';

const storage = new Storage(
  env.GCS_KEYFILE
    ? { projectId: env.GCS_PROJECT_ID, keyFilename: env.GCS_KEYFILE }
    : {}
);
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