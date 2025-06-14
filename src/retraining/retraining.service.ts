import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RetrainingData } from './entities/retraining.entity';

@Injectable()
export class RetrainingService {
  constructor(
    @InjectRepository(RetrainingData)
    private retrainingRepository: Repository<RetrainingData>,
  ) {}

  async create(data: Partial<RetrainingData>): Promise<RetrainingData> {
    const retraining = this.retrainingRepository.create(data);
    return await this.retrainingRepository.save(retraining);
  }

  async findAll(): Promise<RetrainingData[]> {
    return await this.retrainingRepository.find({
      relations: ['object'],
      order: { created_at: 'DESC' },
    });
  }

  async remove(id: string): Promise<void> {
    const retraining = await this.retrainingRepository.findOne({
      where: { id },
    });

    if (!retraining) {
      throw new NotFoundException('Retraining data not found');
    }

    await this.retrainingRepository.remove(retraining);
  }
} 