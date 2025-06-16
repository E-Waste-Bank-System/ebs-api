import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Patch,
  Body, 
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { RetrainingService } from './retraining.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AnnotationStatus } from './entities/retraining.entity';

@ApiTags('Retraining & Datasets')
@Controller('retraining')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class RetrainingController {
  constructor(private readonly retrainingService: RetrainingService) {}

  @Post()
  @ApiOperation({ summary: 'Submit validated/corrected data' })
  @ApiResponse({
    status: 201,
    description: 'Retraining data submitted successfully',
  })
  async create(@Body() createRetrainingDto: any) {
    return await this.retrainingService.create(createRetrainingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin view of retraining samples' })
  @ApiResponse({
    status: 200,
    description: 'List of retraining data',
  })
  async findAll() {
    return await this.retrainingService.findAll();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete retraining data' })
  @ApiResponse({
    status: 200,
    description: 'Retraining data deleted successfully',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.retrainingService.remove(id);
    return { message: 'Retraining data deleted successfully' };
  }

  @Post('datasets')
  @ApiOperation({ summary: 'Create new dataset for training' })
  @ApiResponse({
    status: 201,
    description: 'Dataset created successfully',
  })
  async createDataset(
    @Body() createDatasetDto: {
      name: string;
      description?: string;
      configuration?: any;
    },
    @GetUser() user: any
  ) {
    return await this.retrainingService.createDataset({
      ...createDatasetDto,
      created_by: user.id,
    });
  }

  @Get('datasets')
  @ApiOperation({ summary: 'Get all datasets' })
  @ApiResponse({
    status: 200,
    description: 'List of datasets',
  })
  async getDatasets() {
    return await this.retrainingService.getDatasets();
  }

  @Get('datasets/:id')
  @ApiOperation({ summary: 'Get dataset details' })
  @ApiResponse({
    status: 200,
    description: 'Dataset details',
  })
  async getDataset(@Param('id', ParseUUIDPipe) id: string) {
    return await this.retrainingService.getDataset(id);
  }

  @Patch('datasets/:id')
  @ApiOperation({ summary: 'Update dataset' })
  @ApiResponse({
    status: 200,
    description: 'Dataset updated successfully',
  })
  async updateDataset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDatasetDto: any
  ) {
    return await this.retrainingService.updateDataset(id, updateDatasetDto);
  }

  @Delete('datasets/:id')
  @ApiOperation({ summary: 'Delete dataset' })
  @ApiResponse({
    status: 200,
    description: 'Dataset deleted successfully',
  })
  async deleteDataset(@Param('id', ParseUUIDPipe) id: string) {
    await this.retrainingService.deleteDataset(id);
    return { message: 'Dataset deleted successfully' };
  }

  @Post('datasets/:id/images')
  @ApiOperation({ summary: 'Add images to dataset for annotation' })
  @ApiResponse({
    status: 201,
    description: 'Images added to dataset successfully',
  })
  async addImagesToDataset(
    @Param('id', ParseUUIDPipe) datasetId: string,
    @Body() addImagesDto: { objectIds: string[] }
  ) {
    console.log('Controller - addImagesToDataset called with:', {
      datasetId,
      objectIds: addImagesDto.objectIds,
      objectCount: addImagesDto.objectIds?.length
    });
    
    return await this.retrainingService.addImagesToDataset(
      datasetId, 
      addImagesDto.objectIds
    );
  }

  @Get('datasets/:id/tasks')
  @ApiOperation({ summary: 'Get annotation tasks for dataset' })
  @ApiResponse({
    status: 200,
    description: 'List of annotation tasks',
  })
  async getAnnotationTasks(@Param('id', ParseUUIDPipe) datasetId: string) {
    return await this.retrainingService.getAnnotationTasks(datasetId);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get annotation task details' })
  @ApiResponse({
    status: 200,
    description: 'Annotation task details',
  })
  async getAnnotationTask(@Param('id', ParseUUIDPipe) id: string) {
    return await this.retrainingService.getAnnotationTask(id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update annotation task' })
  @ApiResponse({
    status: 200,
    description: 'Annotation task updated successfully',
  })
  async updateAnnotationTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: {
      annotations?: any[];
      status?: AnnotationStatus;
      notes?: string;
    }
  ) {
    return await this.retrainingService.updateAnnotationTask(id, updateTaskDto);
  }

  @Post('tasks/:id/assign')
  @ApiOperation({ summary: 'Assign annotation task to user' })
  @ApiResponse({
    status: 200,
    description: 'Task assigned successfully',
  })
  async assignAnnotationTask(
    @Param('id', ParseUUIDPipe) taskId: string,
    @GetUser() user: any
  ) {
    return await this.retrainingService.assignAnnotationTask(taskId, user.id);
  }

  @Post('datasets/:id/train')
  @ApiOperation({ summary: 'Start training on dataset' })
  @ApiResponse({
    status: 200,
    description: 'Training started successfully',
  })
  async startTraining(@Param('id', ParseUUIDPipe) datasetId: string) {
    return await this.retrainingService.startTraining(datasetId);
  }

  @Post('datasets/:id/training/complete')
  @ApiOperation({ summary: 'Mark training as completed' })
  @ApiResponse({
    status: 200,
    description: 'Training completed successfully',
  })
  async completeTraining(
    @Param('id', ParseUUIDPipe) datasetId: string,
    @Body() metricsDto: {
      final_map?: number;
      precision?: number;
      recall?: number;
      epochs_completed?: number;
      best_weights_path?: string;
    }
  ) {
    return await this.retrainingService.completeTraining(datasetId, metricsDto);
  }

  @Post('datasets/:id/training/fail')
  @ApiOperation({ summary: 'Mark training as failed' })
  @ApiResponse({
    status: 200,
    description: 'Training marked as failed',
  })
  async failTraining(
    @Param('id', ParseUUIDPipe) datasetId: string,
    @Body() errorDto: { error: string }
  ) {
    return await this.retrainingService.failTraining(datasetId, errorDto.error);
  }

  @Get('datasets/:id/export')
  @ApiOperation({ summary: 'Export dataset for training' })
  @ApiResponse({
    status: 200,
    description: 'Dataset exported successfully',
  })
  async exportDatasetForTraining(@Param('id', ParseUUIDPipe) datasetId: string) {
    return await this.retrainingService.exportDatasetForTraining(datasetId);
  }

  @Get('proxy-image')
  @ApiOperation({ summary: 'Proxy image to avoid CORS issues' })
  @ApiResponse({
    status: 200,
    description: 'Image proxied successfully',
  })
  async proxyImage(@Query('url') imageUrl: string, @Res() res: Response) {
    if (!imageUrl) {
      throw new HttpException('Image URL is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Validate that it's a GCS URL to prevent abuse
      if (!imageUrl.includes('storage.googleapis.com') && !imageUrl.includes('storage.cloud.google.com')) {
        throw new HttpException('Only Google Cloud Storage URLs are allowed', HttpStatus.BAD_REQUEST);
      }

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new HttpException('Failed to fetch image', HttpStatus.NOT_FOUND);
      }

      // Set appropriate headers
      res.set({
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      });

      // Pipe the image data
      const buffer = await response.buffer();
      res.send(buffer);
    } catch (error) {
      console.error('Error proxying image:', error);
      throw new HttpException('Failed to proxy image', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('export-yolo')
  @ApiOperation({ summary: 'Export YOLO dataset as ZIP file' })
  @ApiResponse({
    status: 200,
    description: 'YOLO dataset ZIP file',
  })
  async exportYoloDataset(
    @Body() exportDto: { objectIds: string[] },
    @Res() res: Response
  ) {
    console.log('Export YOLO dataset requested for objects:', exportDto.objectIds);
    
    try {
      const zipStream = await this.retrainingService.exportYoloDataset(exportDto.objectIds);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `yolo_dataset_${timestamp}.zip`;
      
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      });

      zipStream.pipe(res);
    } catch (error) {
      console.error('Error exporting YOLO dataset:', error);
      throw new HttpException('Failed to export dataset', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 