import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObjectsController, AdminObjectsController } from './objects.controller';
import { ObjectsService } from './objects.service';
import { DetectedObject } from './entities/object.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetectedObject])],
  controllers: [ObjectsController, AdminObjectsController],
  providers: [ObjectsService],
  exports: [ObjectsService],
})
export class ObjectsModule {} 