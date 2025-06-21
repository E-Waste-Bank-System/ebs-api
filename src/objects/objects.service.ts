import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetectedObject } from './entities/object.entity';
import { Scan } from '../scans/entities/scan.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { CreateObjectDto } from './dto/object.dto';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectRepository(DetectedObject)
    private objectRepository: Repository<DetectedObject>,
    @InjectRepository(Scan)
    private scanRepository: Repository<Scan>,
  ) {}

  async findAll(
    paginationDto: PaginationDto & { 
      search?: string; 
      category?: string; 
      scanId?: string;
      isValidated?: boolean;
    }
  ): Promise<PaginatedResponse<DetectedObject>> {
    const { page = 1, limit = 20, search, category, scanId, isValidated } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.objectRepository
      .createQueryBuilder('object')
      .leftJoinAndSelect('object.scan', 'scan')
      .leftJoinAndSelect('scan.user', 'user');

    if (search) {
      queryBuilder.andWhere(
        '(object.name ILIKE :search OR object.category ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere('object.category = :category', { category });
    }

    if (scanId) {
      queryBuilder.andWhere('object.scan_id = :scanId', { scanId });
    }

    if (isValidated !== undefined) {
      queryBuilder.andWhere('object.is_validated = :isValidated', { isValidated });
    }

    const [data, total] = await queryBuilder
      .orderBy('object.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<DetectedObject> {
    const object = await this.objectRepository.findOne({
      where: { id },
      relations: ['scan'],
    });

    if (!object) {
      throw new NotFoundException('Object not found');
    }

    return object;
  }

  async validate(
    id: string, 
    validatedBy: string, 
    data?: { 
      notes?: string; 
      corrected_category?: string; 
      corrected_value?: number; 
    }
  ): Promise<DetectedObject> {
    const object = await this.findOne(id);
    
    object.is_validated = true;
    object.validated_by = validatedBy;
    object.validated_at = new Date();
    object.validation_notes = data?.notes;

    // Update category if corrected
    if (data?.corrected_category && data.corrected_category !== object.category) {
      object.category = data.corrected_category;
    }

    // Update estimated value if corrected
    if (data?.corrected_value !== undefined && data.corrected_value !== object.estimated_value) {
      object.estimated_value = data.corrected_value;
    }

    const updatedObject = await this.objectRepository.save(object);
    
    // Update scan totals
    await this.updateScanTotals(object.scan_id);
    
    return updatedObject;
  }

  async reject(id: string, validatedBy: string, notes?: string): Promise<DetectedObject> {
    const object = await this.findOne(id);
    
    object.is_validated = false;
    object.validated_by = validatedBy;
    object.validated_at = new Date();
    object.validation_notes = notes;

    const updatedObject = await this.objectRepository.save(object);
    
    // Update scan totals
    await this.updateScanTotals(object.scan_id);
    
    return updatedObject;
  }

  async create(createObjectDto: CreateObjectDto, createdBy: string): Promise<DetectedObject> {
    const object = this.objectRepository.create({
      name: createObjectDto.name,
      category: createObjectDto.category,
      estimated_value: createObjectDto.estimated_value,
      scan_id: createObjectDto.scan_id,
      description: createObjectDto.description,
      risk_level: createObjectDto.risk_level || 1,
      damage_level: createObjectDto.damage_level || 1,
      confidence_score: 1.0, // Manual entry = 100% confidence
      bounding_box: { x: 0, y: 0, width: 0, height: 0 }, // No bounding box for manual entry
      is_validated: true, // Manual entries are automatically validated
      validated_by: createdBy,
      validated_at: new Date(),
      validation_notes: 'Manual entry by administrator',
      ai_metadata: { source: 'manual_entry', created_by: createdBy }
    });

    const savedObject = await this.objectRepository.save(object);
    
    // Update scan totals
    await this.updateScanTotals(createObjectDto.scan_id);
    
    return savedObject;
  }

  private async updateScanTotals(scanId: string): Promise<void> {
    // Get all objects for this scan
    const objects = await this.objectRepository.find({
      where: { scan_id: scanId }
    });

    // Calculate totals
    const objectsCount = objects.length;
    const totalEstimatedValue = objects.reduce((sum, obj) => {
      const value = parseFloat(obj.estimated_value?.toString() || '0');
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // Update the scan
    await this.scanRepository.update(scanId, {
      objects_count: objectsCount,
      total_estimated_value: totalEstimatedValue,
    });
  }
} 