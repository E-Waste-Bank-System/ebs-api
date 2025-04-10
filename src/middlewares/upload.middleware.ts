import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../utils/error';
import { ewasteBucket } from '../config/gcs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any);
    }
  },
});

// Middleware to upload a single file to Google Cloud Storage
export const uploadFile = (fieldName: string) => {
  return [
    upload.single(fieldName),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          throw new AppError(400, 'No file uploaded');
        }

        const blob = ewasteBucket.file(
          `${req.user?.id || 'anonymous'}/${uuidv4()}${path.extname(req.file.originalname)}`
        );

        const blobStream = blob.createWriteStream({
          resumable: false,
          metadata: {
            contentType: req.file.mimetype,
          },
        });

        // Create a promise to handle the stream events
        const streamPromise = new Promise<string>((resolve, reject) => {
          blobStream.on('error', (err) => {
            reject(err);
          });

          blobStream.on('finish', async () => {
            // The file upload is complete
            const publicUrl = `https://storage.googleapis.com/${ewasteBucket.name}/${blob.name}`;
            resolve(publicUrl);
          });
        });

        // Convert buffer to stream and pipe it to blobStream
        const bufferStream = new Readable();
        bufferStream.push(req.file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(blobStream);

        // Wait for the upload to complete
        const fileUrl = await streamPromise;
        req.fileUrl = fileUrl;

        next();
      } catch (error) {
        next(error instanceof AppError ? error : new AppError(500, 'File upload failed'));
      }
    },
  ];
};

// Add the fileUrl property to Express.Request
declare global {
  namespace Express {
    interface Request {
      fileUrl?: string;
    }
  }
} 