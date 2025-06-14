import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UpdateProfileDto, ProfileListQueryDto } from './dto/profile.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async findAll(query: ProfileListQueryDto): Promise<PaginatedResponse<Profile>> {
    const { page = 1, limit = 20, role, is_active, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.profileRepository.createQueryBuilder('profile');

    if (role) {
      queryBuilder.andWhere('profile.role = :role', { role });
    }

    if (is_active !== undefined) {
      queryBuilder.andWhere('profile.is_active = :is_active', { is_active });
    }

    if (search) {
      queryBuilder.where(
        '(profile.full_name ILIKE :search OR profile.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [profiles, total] = await queryBuilder
      .orderBy('profile.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: profiles,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['scans'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async update(id: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.findOne(id);

    Object.assign(profile, updateProfileDto);
    
    return await this.profileRepository.save(profile);
  }

  async remove(id: string): Promise<void> {
    const profile = await this.findOne(id);
    
    // Soft delete
    await this.profileRepository.softDelete(id);
  }

  async getUserStats(userId: string): Promise<any> {
    const profile = await this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.scans', 'scans')
      .leftJoinAndSelect('scans.objects', 'objects')
      .where('profile.id = :userId', { userId })
      .getOne();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const totalScans = profile.scans?.length || 0;
    const totalObjects = profile.scans?.reduce((sum, scan) => sum + (scan.objects?.length || 0), 0) || 0;
    const totalValue = profile.scans?.reduce((sum, scan) => sum + Number(scan.total_estimated_value), 0) || 0;

    return {
      total_scans: totalScans,
      total_objects: totalObjects,
      total_estimated_value: totalValue,
      member_since: profile.created_at,
      last_scan: profile.scans?.[0]?.created_at,
    };
  }
} 