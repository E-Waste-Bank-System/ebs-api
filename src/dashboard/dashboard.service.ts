import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan, ScanStatus } from '../scans/entities/scan.entity';
import { DetectedObject } from '../objects/entities/object.entity';
import { Profile } from '../profiles/entities/profile.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Scan)
    private scanRepository: Repository<Scan>,
    @InjectRepository(DetectedObject)
    private objectRepository: Repository<DetectedObject>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async getDashboardSummary() {
    const [
      totalScans,
      totalObjects,
      totalUsers,
      completedScans,
      validatedObjects,
    ] = await Promise.all([
      this.scanRepository.count(),
      this.objectRepository.count(),
      this.profileRepository.count(),
      this.scanRepository.count({ where: { status: ScanStatus.COMPLETED } }),
      this.objectRepository.count({ where: { is_validated: true } }),
    ]);

    const totalValue = await this.scanRepository
      .createQueryBuilder('scan')
      .select('SUM(scan.total_estimated_value)', 'total')
      .getRawOne();

    return {
      total_scans: totalScans,
      total_objects: totalObjects,
      total_users: totalUsers,
      completed_scans: completedScans,
      validated_objects: validatedObjects,
      total_estimated_value: parseFloat(totalValue.total) || 0,
      validation_rate: totalObjects > 0 ? (validatedObjects / totalObjects) * 100 : 0,
    };
  }

  async getObjectStats() {
    const categoryStats = await this.objectRepository
      .createQueryBuilder('object')
      .select('object.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(object.confidence_score)', 'avg_confidence')
      .addSelect('SUM(object.estimated_value)', 'total_value')
      .groupBy('object.category')
      .getRawMany();

    const riskStats = await this.objectRepository
      .createQueryBuilder('object')
      .select('object.risk_level', 'risk_level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('object.risk_level')
      .getRawMany();

    return {
      by_category: categoryStats,
      by_risk_level: riskStats,
    };
  }

  async getRecentActivity(limit: number = 10) {
    const recentScans = await this.scanRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
    });

    return {
      recent_scans: recentScans.map(scan => ({
        id: scan.id,
        user_name: scan.user?.full_name,
        status: scan.status,
        objects_count: scan.objects_count,
        created_at: scan.created_at,
      })),
    };
  }
} 