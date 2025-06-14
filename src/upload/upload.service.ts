import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    // Initialize Google Cloud Storage
    this.bucketName = this.configService.get('GCP_BUCKET') || 'ebs-storage';
    
    // Initialize storage with service account key file
    const keyFilename = this.configService.get('GOOGLE_CLOUD_KEY_FILE') || 'ebs-cloud-456404-472153b611d9.json';
    const keyFilePath = path.join(process.cwd(), keyFilename);
    const projectId = this.configService.get('GCP_PROJECT_ID') || 'ebs-cloud-456404';
    
    this.logger.log(`Initializing Google Cloud Storage with bucket: ${this.bucketName}, project: ${projectId}`);
    
    try {
      this.storage = new Storage({
        keyFilename: keyFilePath,
        projectId,
      });
      this.logger.log('Google Cloud Storage initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Cloud Storage:', error);
      throw new Error('Google Cloud Storage initialization failed');
    }
  }

  async uploadFile(file: any, uploadPath?: string): Promise<string> {
    try {
      this.logger.log('File received:', {
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        size: file?.size,
        hasBuffer: !!file?.buffer,
        uploadPath,
      });

      // Determine the upload path
      const basePath = uploadPath || 'uploads';
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname || '.jpg');
      const filename = `${basePath}/${uuidv4()}-${Date.now()}${fileExtension}`;
      
      // Get the bucket
      const bucket = this.storage.bucket(this.bucketName);
      const fileUpload = bucket.file(filename);

      // Create a write stream
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype || 'application/octet-stream',
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            uploadPath: basePath,
          },
        },
        resumable: false,
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          this.logger.error('Failed to upload to GCS:', error);
          reject(new BadRequestException('Failed to upload file to cloud storage'));
        });

        stream.on('finish', async () => {
          try {
            // Make the file publicly readable
            await fileUpload.makePublic();
            
            // Return the public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;
            this.logger.log(`Successfully uploaded file to GCS: ${publicUrl}`);
            resolve(publicUrl);
          } catch (error) {
            this.logger.error('Failed to make file public:', error);
            reject(new BadRequestException('Failed to make uploaded file accessible'));
          }
        });

        // Upload the file buffer
        if (file.buffer) {
          stream.end(file.buffer);
        } else {
          reject(new BadRequestException('No file buffer available'));
        }
      });
    } catch (error) {
      this.logger.error('Failed to upload file:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }
} 