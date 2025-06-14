import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Storage } from '@google-cloud/storage';

import { Scan, ScanStatus } from './entities/scan.entity';
import { DetectedObject } from '../objects/entities/object.entity';
import { CreateScanDto, ScanListQueryDto, AIResponseDto, AIPredictionDto } from './dto/scan.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);
  private readonly AI_SERVICE_URL = 'https://ebs-ai-981332637673.asia-southeast2.run.app/predict';
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(
    @InjectRepository(Scan)
    private scanRepository: Repository<Scan>,
    @InjectRepository(DetectedObject)
    private objectRepository: Repository<DetectedObject>,
    private configService: ConfigService,
  ) {
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

  async create(file: any, createScanDto: CreateScanDto, userId: string): Promise<Scan> {
    try {
      // Upload image and get URL
      const imageUrl = await this.uploadImage(file);
      
      // Create scan record
      const scan = this.scanRepository.create({
        image_url: imageUrl,
        original_filename: createScanDto.original_filename || file.originalname,
        user_id: userId,
        status: ScanStatus.PROCESSING,
      });

      const savedScan = await this.scanRepository.save(scan);
      this.logger.log(`Created scan ${savedScan.id} for user ${userId}`);

      // Process with AI asynchronously
      this.processWithAI(savedScan.id, imageUrl).catch(error => {
        this.logger.error(`AI processing failed for scan ${savedScan.id}:`, error);
      });

      return savedScan;
    } catch (error) {
      this.logger.error('Failed to create scan:', error);
      throw new BadRequestException('Failed to create scan');
    }
  }

  async findAll(query: ScanListQueryDto, userId?: string): Promise<PaginatedResponse<Scan>> {
    const { page = 1, limit = 20, status, user_id } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.scanRepository
      .createQueryBuilder('scan')
      .leftJoinAndSelect('scan.user', 'user')
      .leftJoinAndSelect('scan.objects', 'objects');

    // If not admin, filter by user
    if (userId) {
      queryBuilder.where('scan.user_id = :userId', { userId });
    }

    if (status) {
      queryBuilder.andWhere('scan.status = :status', { status });
    }

    if (user_id) {
      queryBuilder.andWhere('scan.user_id = :user_id', { user_id });
    }

    const [scans, total] = await queryBuilder
      .orderBy('scan.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: scans,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<Scan> {
    const queryBuilder = this.scanRepository
      .createQueryBuilder('scan')
      .leftJoinAndSelect('scan.objects', 'objects')
      .leftJoinAndSelect('scan.user', 'user')
      .where('scan.id = :id', { id });

    if (userId) {
      queryBuilder.andWhere('scan.user_id = :userId', { userId });
    }

    const scan = await queryBuilder.getOne();

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    return scan;
  }

  private async uploadImage(file: any): Promise<string> {
    try {
      this.logger.log('File received:', {
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        size: file?.size,
        hasBuffer: !!file?.buffer,
        hasPath: !!file?.path,
      });

      // Generate unique filename
      const filename = `scans/scan-${uuidv4()}-${Date.now()}${path.extname(file.originalname || '.jpg')}`;
      
      // Get the bucket
      const bucket = this.storage.bucket(this.bucketName);
      const fileUpload = bucket.file(filename);

      // Create a write stream
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype || 'image/jpeg',
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        },
        resumable: false,
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          this.logger.error('Failed to upload to GCS:', error);
          reject(new BadRequestException('Failed to upload image to cloud storage'));
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
        } else if (file.path) {
          // Read file from disk and upload
          const fileBuffer = fs.readFileSync(file.path);
          stream.end(fileBuffer);
          // Clean up temporary file
          fs.unlinkSync(file.path);
        } else {
          reject(new BadRequestException('No file buffer or path available'));
        }
      });
    } catch (error) {
      this.logger.error('Failed to upload image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  private async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract filename from GCS URL
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const filePath = `scans/${filename}`;
      
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      await file.delete();
      this.logger.log(`Successfully deleted image from GCS: ${filePath}`);
    } catch (error) {
      this.logger.error('Failed to delete image from GCS:', error);
      // Don't throw error as this is cleanup operation
    }
  }

  private async processWithAI(scanId: string, imageUrl: string) {
    try {
      this.logger.log(`Starting AI processing for scan ${scanId}`);
      
      const scan = await this.scanRepository.findOne({
        where: { id: scanId },
      });

      if (!scan) {
        this.logger.error(`Scan ${scanId} not found for AI processing`);
        return;
      }

      // Prepare form data for AI service
      const formData = new FormData();
      
      // Download image and convert to blob for AI service
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBlob = await imageResponse.blob();
      formData.append('file', imageBlob, scan.original_filename || 'scan.jpg');

      // Call AI service
      this.logger.log(`Calling AI service at ${this.AI_SERVICE_URL}`);
      const aiResponse = await fetch(this.AI_SERVICE_URL, {
        method: 'POST',
        body: formData,
      });

      if (!aiResponse.ok) {
        throw new Error(`AI service error: ${aiResponse.status} ${aiResponse.statusText}`);
      }

      const aiResult: AIResponseDto = await aiResponse.json();
      this.logger.log(`AI service returned ${aiResult.predictions?.length || 0} predictions`);

      // Process AI predictions and save detected objects
      let totalValue = 0;
      const detectedObjects = [];

      for (const prediction of aiResult.predictions || []) {
        const detectedObject = this.objectRepository.create({
          name: prediction.category, // Using category as name
          category: prediction.category,
          confidence_score: prediction.confidence,
          bounding_box: {
            x: prediction.bbox[0],
            y: prediction.bbox[1],
            width: prediction.bbox[2] - prediction.bbox[0],
            height: prediction.bbox[3] - prediction.bbox[1],
          },
          estimated_value: prediction.regression_result,
          risk_level: prediction.risk_lvl,
          damage_level: prediction.damage_level,
          description: prediction.description,
          suggestions: prediction.suggestion,
          ai_metadata: {
            id: prediction.id,
            detection_source: prediction.detection_source,
          },
          scan_id: scanId,
        });

        const savedObject = await this.objectRepository.save(detectedObject);
        detectedObjects.push(savedObject);
        totalValue += prediction.regression_result || 0;
      }

             // Update scan with results
       await this.scanRepository.update(scanId, {
         status: ScanStatus.COMPLETED,
         processed_at: new Date(),
         objects_count: detectedObjects.length,
         total_estimated_value: totalValue,
         metadata: {
           ai_service_response: JSON.parse(JSON.stringify(aiResult)),
           processing_completed_at: new Date().toISOString(),
         } as any,
       });

      this.logger.log(`Successfully processed scan ${scanId} with ${detectedObjects.length} objects, total value: ${totalValue}`);

    } catch (error) {
      this.logger.error(`AI processing failed for scan ${scanId}:`, error);
      
             // Update scan status to failed
       await this.scanRepository.update(scanId, {
         status: ScanStatus.FAILED,
         processed_at: new Date(),
         error_message: (error as Error).message || 'AI processing failed',
       });
    }
  }
} 