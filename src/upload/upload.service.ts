import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    // Initialize Google Cloud Storage
    this.bucketName = this.configService.get('GCP_BUCKET') || 'ebs-storage';
    const projectId = this.configService.get('GCP_PROJECT_ID') || 'ebs-cloud-456404';
    
    this.logger.log(`Initializing Google Cloud Storage with bucket: ${this.bucketName}, project: ${projectId}`);
    
    try {
      const credentialsJson = this.configService.get('         GOOGLE_CLOUD_KEY_FILE ');
      if (credentialsJson && credentialsJson.trim().startsWith('{')) {
        // Cloud Run/production: credentials as JSON string in env var
        this.logger.log('Using Google Cloud credentials from JSON content (Cloud Run/production)');
        try {
          const credentials = JSON.parse(credentialsJson);
          this.storage = new Storage({ credentials, projectId });
          this.logger.log('Google Cloud Storage initialized with JSON credentials');
        } catch (parseError) {
          this.logger.error('Failed to parse credentials JSON:', parseError.message);
          throw new Error(`Invalid JSON credentials: ${parseError.message}`);
        }
      } else if (credentialsJson) {
        // Local dev: credentials as file path
        const keyFilePath = path.isAbsolute(credentialsJson)
          ? credentialsJson
          : path.join(process.cwd(), credentialsJson);
        this.logger.log('Using Google Cloud credentials from file');
        this.logger.log(`Key file path: ${keyFilePath}`);
        if (!fs.existsSync(keyFilePath)) {
          this.logger.error(`Google Cloud key file not found at: ${keyFilePath}`);
          throw new Error(`Google Cloud key file not found at: ${keyFilePath}`);
        }
        this.storage = new Storage({ keyFilename: keyFilePath, projectId });
      } else {
        // Fallback: Application Default Credentials
        this.logger.log('Using Application Default Credentials');
        this.storage = new Storage({ projectId });
      }
      this.logger.log('Google Cloud Storage initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Cloud Storage:', {
        error: error.message,
        projectId,
        bucketName: this.bucketName
      });
      throw new Error(`Google Cloud Storage initialization failed: ${error.message}`);
    }
  }

  async uploadFile(file: any, uploadPath?: string): Promise<string> {
    try {
      this.logger.log('Upload service - File received:', {
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        size: file?.size,
        hasBuffer: !!file?.buffer,
        bufferLength: file?.buffer?.length,
        uploadPath,
      });

      if (!file) {
        throw new BadRequestException('No file provided');
      }

      if (!file.buffer) {
        throw new BadRequestException('File buffer is missing');
      }

      // Check if storage is properly initialized
      if (!this.storage) {
        this.logger.error('Google Cloud Storage is not initialized');
        throw new BadRequestException('Cloud storage service is not available');
      }

      // Determine the upload path
      const basePath = uploadPath || 'uploads';
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname || '.jpg');
      const filename = `${basePath}/${uuidv4()}-${Date.now()}${fileExtension}`;
      
      this.logger.log(`Generated filename: ${filename}`);

      // Test bucket access first
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const [bucketExists] = await bucket.exists();
        
        if (!bucketExists) {
          this.logger.error(`Bucket ${this.bucketName} does not exist`);
          throw new BadRequestException(`Storage bucket ${this.bucketName} does not exist`);
        }
        
        this.logger.log(`Bucket ${this.bucketName} exists and is accessible`);
      } catch (bucketError) {
        this.logger.error('Bucket access error:', {
          error: bucketError.message,
          code: (bucketError as any).code,
          details: (bucketError as any).details,
          bucketName: this.bucketName
        });
        throw new BadRequestException(`Cannot access storage bucket: ${bucketError.message}`);
      }

      // Get the bucket and file reference
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

      this.logger.log('Created write stream, starting upload...');

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          this.logger.error('Stream error during upload:', {
            error: error.message,
            code: (error as any).code,
            details: (error as any).details,
            stack: error.stack
          });
          reject(new BadRequestException(`Failed to upload file to cloud storage: ${error.message}`));
        });

        stream.on('finish', async () => {
          try {
            this.logger.log('Upload stream finished, making file public...');
            
            // Make the file publicly readable
            await fileUpload.makePublic();
            
            // Return the public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;
            this.logger.log(`Successfully uploaded file to GCS: ${publicUrl}`);
            resolve(publicUrl);
          } catch (error) {
            this.logger.error('Failed to make file public:', {
              error: error.message,
              code: (error as any).code,
              details: (error as any).details
            });
            reject(new BadRequestException(`Failed to make uploaded file accessible: ${error.message}`));
          }
        });

        // Upload the file buffer
        try {
          this.logger.log(`Writing buffer to stream (${file.buffer.length} bytes)`);
          stream.end(file.buffer);
        } catch (writeError) {
          this.logger.error('Error writing buffer to stream:', writeError);
          reject(new BadRequestException(`Failed to write file data: ${writeError.message}`));
        }
      });
    } catch (error) {
      this.logger.error('Upload service error:', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }
} 