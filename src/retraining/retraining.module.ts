import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetrainingController } from './retraining.controller';
import { RetrainingService } from './retraining.service';
import { RetrainingData } from './entities/retraining.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RetrainingData])],
  controllers: [RetrainingController],
  providers: [RetrainingService],
  exports: [RetrainingService],
})
export class RetrainingModule {} 