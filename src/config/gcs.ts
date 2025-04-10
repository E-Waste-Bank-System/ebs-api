import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Check if GCS project ID and keyfile are defined
if (!process.env.GCS_PROJECT_ID || !process.env.GCS_KEYFILE) {
  throw new Error('Missing GCS project ID or keyfile in environment variables');
}

// Create a storage client
export const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: path.resolve(process.env.GCS_KEYFILE),
});

// Define bucket names
export const ewasteBucket = storage.bucket(process.env.GCS_BUCKET_EWASTE || 'ewaste-images');
export const modelsBucket = storage.bucket(process.env.GCS_BUCKET_MODELS || 'models');

// Utility function to generate signed URL for images
export const getSignedUrl = async (bucketName: string, fileName: string): Promise<string> => {
  const options = {
    version: 'v4' as const,
    action: 'read' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
  return url;
}; 