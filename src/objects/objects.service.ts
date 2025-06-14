import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetectedObject } from './entities/object.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectRepository(DetectedObject)
    private objectRepository: Repository<DetectedObject>,
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

  async validate(id: string, validatedBy: string, notes?: string): Promise<DetectedObject> {
    const object = await this.findOne(id);
    
    object.is_validated = true;
    object.validated_by = validatedBy;
    object.validated_at = new Date();
    object.validation_notes = notes;

    return await this.objectRepository.save(object);
  }

  async reject(id: string, validatedBy: string, notes?: string): Promise<DetectedObject> {
    const object = await this.findOne(id);
    
    object.is_validated = false;
    object.validated_by = validatedBy;
    object.validated_at = new Date();
    object.validation_notes = notes;

    return await this.objectRepository.save(object);
  }
} 