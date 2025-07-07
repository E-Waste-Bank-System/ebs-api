import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
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
    const projectId = this.configService.get('GCP_PROJECT_ID') || 'ebs-cloud-456404';
    
    this.logger.log(`Initializing Google Cloud Storage with bucket: ${this.bucketName}, project: ${projectId}`);
    
    try {
      // In Cloud Run, use default credentials instead of key file
      const keyFilename = this.configService.get('         GOOGLE_APPLICATION_CREDENTIALS');
      const keyFilePath = keyFilename ? path.join(process.cwd(), keyFilename) : null;
      
      // Check if we're in Cloud Run (no key file) or local development (with key file)
      if (keyFilePath && fs.existsSync(keyFilePath)) {
        this.logger.log('Using service account key file for authentication');
        this.storage = new Storage({
          keyFilename: keyFilePath,
          projectId,
        });
      } else {
        this.logger.log('Using default credentials (Cloud Run environment)');
        this.storage = new Storage({
          projectId,
        });
      }
      
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

  async delete(id: string, userId?: string): Promise<void> {
    try {
      // First, find the scan to ensure it exists and check permissions
      const queryBuilder = this.scanRepository
        .createQueryBuilder('scan')
        .leftJoinAndSelect('scan.objects', 'objects')
        .where('scan.id = :id', { id });

      if (userId) {
        queryBuilder.andWhere('scan.user_id = :userId', { userId });
      }

      const scan = await queryBuilder.getOne();

      if (!scan) {
        if (userId) {
          // Check if scan exists for another user (forbidden) or doesn't exist at all (not found)
          const scanExists = await this.scanRepository.findOne({
            where: { id },
            select: ['id'],
          });
          
          if (scanExists) {
            throw new ForbiddenException('You can only delete your own scans');
          }
        }
        throw new NotFoundException('Scan not found');
      }

      this.logger.log(`Deleting scan ${id} with ${scan.objects?.length || 0} objects`);

      // Delete associated objects first (cascade should handle this, but let's be explicit)
      if (scan.objects && scan.objects.length > 0) {
        await this.objectRepository.delete({ scan_id: id });
        this.logger.log(`Deleted ${scan.objects.length} objects for scan ${id}`);
      }

      // Delete any associated retraining data
      // Note: This would require the retraining repository if implemented
      // For now, the foreign key constraints should handle cascade deletion

      // Delete the image from cloud storage
      if (scan.image_url) {
        await this.deleteImage(scan.image_url);
      }

      // Finally, delete the scan record
      await this.scanRepository.delete(id);
      
      this.logger.log(`Successfully deleted scan ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Failed to delete scan ${id}:`, error);
      throw new BadRequestException(`Failed to delete scan: ${error.message}`);
    }
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

      if (!file) {
        throw new BadRequestException('No file provided');
      }

      if (!file.buffer && !file.path) {
        throw new BadRequestException('File has no buffer or path');
      }

      // Generate unique filename
      const filename = `scans/scan-${uuidv4()}-${Date.now()}${path.extname(file.originalname || '.jpg')}`;
      
      this.logger.log(`Attempting to upload file to GCS: ${filename}`);
      
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
          reject(new BadRequestException(`Failed to upload image to cloud storage: ${error.message}`));
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
            this.logger.error('Failed to make file public:', error);
            reject(new BadRequestException(`Failed to make uploaded file accessible: ${error.message}`));
          }
        });

        // Upload the file buffer
        try {
          if (file.buffer) {
            this.logger.log(`Uploading file buffer (${file.buffer.length} bytes)`);
            stream.end(file.buffer);
          } else if (file.path) {
            this.logger.log(`Reading file from path: ${file.path}`);
            // Read file from disk and upload
            const fileBuffer = fs.readFileSync(file.path);
            stream.end(fileBuffer);
            // Clean up temporary file
            fs.unlinkSync(file.path);
          } else {
            reject(new BadRequestException('No file buffer or path available'));
          }
        } catch (streamError) {
          this.logger.error('Error writing to stream:', streamError);
          reject(new BadRequestException(`Failed to write file to stream: ${streamError.message}`));
        }
      });
    } catch (error) {
      this.logger.error('Failed to upload image:', error);
      throw new BadRequestException(`Failed to upload image: ${error.message}`);
    }
  }

  private async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract file path from GCS URL
      // URL format: https://storage.googleapis.com/{bucket}/{path}
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split('/');
      // Remove empty first segment and bucket name
      pathSegments.shift(); // Remove empty string
      pathSegments.shift(); // Remove bucket name
      const filePath = pathSegments.join('/');
      
      this.logger.log(`Attempting to delete image from GCS: ${filePath}`);
      
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      // Check if file exists before trying to delete
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        this.logger.log(`Successfully deleted image from GCS: ${filePath}`);
      } else {
        this.logger.warn(`Image file not found in GCS: ${filePath}`);
      }
    } catch (error) {
      this.logger.error('Failed to delete image from GCS:', error);
      // Don't throw error as this is cleanup operation - scan deletion should still proceed
    }
  }

  async recalculateScanTotals(scanId: string): Promise<void> {
    // Get all objects for this scan
    const objects = await this.objectRepository.find({
      where: { scan_id: scanId }
    });

    // Calculate totals
    const objectsCount = objects.length;
    let totalEstimatedValue = 0;
    let objectsWithValues = 0;
    
    for (const obj of objects) {
      if (obj.estimated_value != null) {
        const value = parseFloat(obj.estimated_value.toString());
        if (!isNaN(value) && isFinite(value)) {
          totalEstimatedValue += value;
          objectsWithValues++;
        } else {
          this.logger.warn(`Invalid estimated_value for object ${obj.id}: ${obj.estimated_value}`);
        }
      } else {
        this.logger.warn(`Object ${obj.id} has null estimated_value`);
      }
    }

    // Update the scan
    await this.scanRepository.update(scanId, {
      objects_count: objectsCount,
      total_estimated_value: totalEstimatedValue,
    });

    this.logger.log(`Recalculated totals for scan ${scanId}: ${objectsCount} objects (${objectsWithValues} with values), total value: ${totalEstimatedValue}`);
  }

  async recalculateAllScanTotals(): Promise<void> {
    this.logger.log('Starting recalculation of all scan totals...');
    
    const scans = await this.scanRepository.find({
      select: ['id']
    });

    for (const scan of scans) {
      try {
        await this.recalculateScanTotals(scan.id);
      } catch (error) {
        this.logger.error(`Failed to recalculate totals for scan ${scan.id}:`, error);
      }
    }

    this.logger.log(`Completed recalculation for ${scans.length} scans`);
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
      
      // Log the full AI response for debugging
      this.logger.log(`Full AI response: ${JSON.stringify(aiResult, null, 2)}`);

      // Process AI predictions and save detected objects
      const detectedObjects = [];

      for (const prediction of aiResult.predictions || []) {
        // Log each prediction for debugging
        this.logger.log(`Processing prediction:`, {
          id: prediction.id,
          category: prediction.category,
          confidence: prediction.confidence,
          regression_result: prediction.regression_result,
          regression_result_type: typeof prediction.regression_result,
          description: prediction.description?.substring(0, 50) + '...',
          risk_lvl: prediction.risk_lvl,
          damage_level: prediction.damage_level,
        });

        // Simple and direct conversion of regression_result to estimated_value
        const regressionResult = prediction.regression_result;
        let estimatedValue = null;
        
        if (regressionResult !== null && regressionResult !== undefined) {
          // Convert to number, handle both string and number inputs
          const numericValue = typeof regressionResult === 'number' ? regressionResult : parseFloat(String(regressionResult));
          
          if (!isNaN(numericValue) && isFinite(numericValue)) {
            estimatedValue = numericValue;
            this.logger.log(`✓ Valid estimated value: ${estimatedValue}`);
          } else {
            this.logger.error(`✗ Invalid regression_result: ${regressionResult} -> ${numericValue}`);
          }
        } else {
          this.logger.error(`✗ Missing regression_result for prediction ${prediction.id}`);
        }

        const detectedObject = this.objectRepository.create({
          name: prediction.category,
          category: prediction.category,
          confidence_score: prediction.confidence,
          bounding_box: {
            x: prediction.bbox[0],
            y: prediction.bbox[1],
            width: prediction.bbox[2] - prediction.bbox[0],
            height: prediction.bbox[3] - prediction.bbox[1],
          },
          estimated_value: estimatedValue,
          risk_level: prediction.risk_lvl,
          damage_level: prediction.damage_level,
          description: prediction.description,
          suggestions: prediction.suggestion,
          ai_metadata: {
            id: prediction.id,
            detection_source: prediction.detection_source,
            original_bbox: prediction.bbox,
            original_regression_result: prediction.regression_result,
          },
          scan_id: scanId,
        });

        this.logger.log(`Object created - estimated_value: ${detectedObject.estimated_value}`);

        const savedObject = await this.objectRepository.save(detectedObject);
        this.logger.log(`Object saved - ID: ${savedObject.id}, estimated_value: ${savedObject.estimated_value}`);
        
        detectedObjects.push(savedObject);
      }

      // Use the new recalculation method to update scan totals
      await this.recalculateScanTotals(scanId);

      // Update scan status and metadata
      await this.scanRepository.update(scanId, {
        status: ScanStatus.COMPLETED,
        processed_at: new Date(),
        metadata: {
          ai_service_response: JSON.parse(JSON.stringify(aiResult)),
          processing_completed_at: new Date().toISOString(),
        } as any,
      });

      this.logger.log(`Successfully processed scan ${scanId} with ${detectedObjects.length} objects`);

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