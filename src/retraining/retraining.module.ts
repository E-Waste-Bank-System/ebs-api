import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetrainingController } from './retraining.controller';
import { RetrainingService } from './retraining.service';
import { RetrainingData, Dataset, AnnotationTask } from './entities/retraining.entity';
import { DetectedObject } from '../objects/entities/object.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RetrainingData, 
      Dataset, 
      AnnotationTask, 
      DetectedObject
    ])
  ],
  controllers: [RetrainingController],
  providers: [RetrainingService],
  exports: [RetrainingService],
})
export class RetrainingModule {} 