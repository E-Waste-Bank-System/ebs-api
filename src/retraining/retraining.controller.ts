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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

import { RetrainingService } from './retraining.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AnnotationStatus, DatasetStatus } from './entities/retraining.entity';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('🤖 AI Training & Datasets')
@Controller('retraining')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class RetrainingController {
  constructor(private readonly retrainingService: RetrainingService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create retraining data entry',
    description: `
      Create a new retraining data entry for AI model improvement.
      \n      **Use Cases:**
      - Submit correction data for model retraining
      - Improve classification accuracy
      - Add validation feedback
      \n      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['correction', 'validation', 'improvement', 'annotation'],
          example: 'correction'
        },
        original_category: { type: 'string', example: 'Laptop' },
        corrected_category: { type: 'string', example: 'Desktop Computer' },
        original_confidence: { type: 'number', example: 0.85 },
        corrected_value: { type: 'number', example: 200000 },
        object_id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
        notes: { type: 'string', example: 'Category correction for better accuracy' }
      },
      required: ['type', 'original_category', 'original_confidence']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Retraining data created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        type: { type: 'string' },
        original_category: { type: 'string' },
        corrected_category: { type: 'string' },
        original_confidence: { type: 'number' },
        corrected_value: { type: 'number' },
        created_at: { type: 'string', format: 'date-time' }
      }
    },
    example: {
      id: 'retrain-123',
      type: 'correction',
      original_category: 'Laptop',
      corrected_category: 'Desktop Computer',
      original_confidence: 0.85,
      corrected_value: 200000,
      created_at: '2024-01-15T10:30:00.000Z'
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid retraining data',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
    type: ErrorResponseDto
  })
  async create(@Body() createRetrainingDto: any) {
    return await this.retrainingService.create(createRetrainingDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'List all retraining data',
    description: `
      Retrieve all retraining data entries for AI model improvement.
      \n      **Data Types:**
      - Correction data for misclassified objects
      - Validation feedback for model accuracy
      - Improvement suggestions for better detection
      - Annotation data for training datasets
      \n      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Retraining data retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          original_category: { type: 'string' },
          corrected_category: { type: 'string' },
          original_confidence: { type: 'number' },
          corrected_value: { type: 'number' },
          is_processed: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
    type: ErrorResponseDto
  })
  async findAll() {
    return await this.retrainingService.findAll();
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete retraining data entry',
    description: 'Permanently delete a retraining data entry by ID.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Retraining data UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Retraining data deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Retraining data deleted successfully' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Retraining data not found',
    type: ErrorResponseDto
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.retrainingService.remove(id);
    return { message: 'Retraining data deleted successfully' };
  }

  // Dataset Management
  @Post('datasets')
  @ApiOperation({ 
    summary: 'Create new dataset',
    description: `
      Create a new dataset for AI model training.
      \n      **Dataset Features:**
      - Configure training/validation splits
      - Set augmentation parameters
      - Define model configuration
      - Track annotation progress
      \n      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'E-Waste Detection Dataset v2.0' },
        description: { type: 'string', example: 'Improved dataset with corrected annotations' },
        configuration: {
          type: 'object',
          properties: {
            train_split: { type: 'number', example: 0.7 },
            val_split: { type: 'number', example: 0.2 },
            test_split: { type: 'number', example: 0.1 }
          }
        }
      },
      required: ['name']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Dataset created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'annotating', 'ready', 'training', 'completed', 'failed'] },
        total_images: { type: 'number' },
        annotated_images: { type: 'number' },
        created_at: { type: 'string', format: 'date-time' }
      }
    }
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
  @ApiOperation({ 
    summary: 'List all datasets',
    description: 'Retrieve all datasets for AI model training.'
  })
  @ApiResponse({
    status: 200,
    description: 'Datasets retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string' },
          total_images: { type: 'number' },
          annotated_images: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getDatasets() {
    return await this.retrainingService.getDatasets();
  }

  @Get('datasets/:id')
  @ApiOperation({ 
    summary: 'Get dataset details',
    description: 'Retrieve detailed information about a specific dataset.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Dataset details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        total_images: { type: 'number' },
        annotated_images: { type: 'number' },
        total_annotations: { type: 'number' },
        training_metrics: {
          type: 'object',
          properties: {
            final_map: { type: 'number' },
            precision: { type: 'number' },
            recall: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found',
    type: ErrorResponseDto
  })
  async getDataset(@Param('id', ParseUUIDPipe) id: string) {
    return await this.retrainingService.getDataset(id);
  }

  @Patch('datasets/:id')
  @ApiOperation({ 
    summary: 'Update dataset',
    description: 'Update dataset configuration and metadata.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'annotating', 'ready', 'training', 'completed', 'failed'] },
        configuration: { type: 'object' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Dataset updated successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found',
    type: ErrorResponseDto
  })
  async updateDataset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDatasetDto: any
  ) {
    return await this.retrainingService.updateDataset(id, updateDatasetDto);
  }

  @Delete('datasets/:id')
  @ApiOperation({ 
    summary: 'Delete dataset',
    description: 'Permanently delete a dataset and all associated data.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Dataset deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Dataset deleted successfully' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found',
    type: ErrorResponseDto
  })
  async deleteDataset(@Param('id', ParseUUIDPipe) id: string) {
    await this.retrainingService.deleteDataset(id);
    return { message: 'Dataset deleted successfully' };
  }

  // Annotation Tasks
  @Post('datasets/:id/images')
  @ApiOperation({ 
    summary: 'Add images to dataset',
    description: `
      Add images to a dataset for annotation and training.
      \n      **Process:**
      - Select objects to include in dataset
      - Create annotation tasks for each image
      - Assign tasks to annotators
      - Track annotation progress
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        objectIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          example: ['123e4567-e89b-12d3-a456-426614174000']
        }
      },
      required: ['objectIds']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Images added to dataset successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          image_url: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'reviewed', 'rejected'] },
          assigned_to: { type: 'string', format: 'uuid' }
        }
      }
    }
  })
  async addImagesToDataset(
    @Param('id', ParseUUIDPipe) datasetId: string,
    @Body() addImagesDto: { objectIds: string[] }
  ) {
    return await this.retrainingService.addImagesToDataset(datasetId, addImagesDto.objectIds);
  }

  @Get('datasets/:id/tasks')
  @ApiOperation({ 
    summary: 'Get annotation tasks for dataset',
    description: 'Retrieve all annotation tasks for a specific dataset.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Annotation tasks retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          image_url: { type: 'string' },
          status: { type: 'string' },
          assigned_to: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getAnnotationTasks(@Param('id', ParseUUIDPipe) datasetId: string) {
    return await this.retrainingService.getAnnotationTasks(datasetId);
  }

  @Get('tasks/:id')
  @ApiOperation({ 
    summary: 'Get annotation task details',
    description: 'Retrieve detailed information about a specific annotation task.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Annotation task UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Annotation task details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        image_url: { type: 'string' },
        status: { type: 'string' },
        annotations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              category: { type: 'string' },
              bbox: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' }
                }
              },
              confidence: { type: 'number' },
              is_ai_generated: { type: 'boolean' },
              verified: { type: 'boolean' }
            }
          }
        },
        assigned_to: { type: 'string', format: 'uuid' },
        notes: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Annotation task not found',
    type: ErrorResponseDto
  })
  async getAnnotationTask(@Param('id', ParseUUIDPipe) id: string) {
    return await this.retrainingService.getAnnotationTask(id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ 
    summary: 'Update annotation task',
    description: `
      Update annotation task with corrections and annotations.
      \n      **Update Types:**
      - Add/remove bounding boxes
      - Correct object categories
      - Adjust confidence scores
      - Add verification notes
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Annotation task UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        annotations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              category: { type: 'string' },
              bbox: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' }
                }
              },
              confidence: { type: 'number' },
              is_ai_generated: { type: 'boolean' },
              verified: { type: 'boolean' }
            }
          }
        },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'reviewed', 'rejected'] },
        notes: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Annotation task updated successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Annotation task not found',
    type: ErrorResponseDto
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
  @ApiOperation({ 
    summary: 'Assign annotation task',
    description: 'Assign an annotation task to the current user.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Annotation task UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Annotation task assigned successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Annotation task not found',
    type: ErrorResponseDto
  })
  async assignAnnotationTask(
    @Param('id', ParseUUIDPipe) taskId: string,
    @GetUser() user: any
  ) {
    return await this.retrainingService.assignAnnotationTask(taskId, user.id);
  }

  // Training Management
  @Post('datasets/:id/train')
  @ApiOperation({ 
    summary: 'Start model training',
    description: `
      Start training a new AI model using the specified dataset.
      \n      **Training Process:**
      - Validate dataset readiness
      - Initialize training configuration
      - Begin model training
      - Track training progress
      \n      **Requirements:**
      - Dataset must be in 'ready' status
      - Sufficient annotated images
      - Valid training configuration
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Training started successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        status: { type: 'string', example: 'training' },
        training_started_at: { type: 'string', format: 'date-time' },
        total_images: { type: 'number' },
        annotated_images: { type: 'number' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Dataset not ready for training',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'Dataset is not ready for training. Status: draft',
      error: 'Bad Request',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/retraining/datasets/dataset-id/train'
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found',
    type: ErrorResponseDto
  })
  async startTraining(@Param('id', ParseUUIDPipe) datasetId: string) {
    return await this.retrainingService.startTraining(datasetId);
  }

  @Post('datasets/:id/complete')
  @ApiOperation({ 
    summary: 'Complete model training',
    description: `
      Mark training as completed and save training metrics.
      \n      **Metrics Included:**
      - Mean Average Precision (mAP)
      - Precision and recall scores
      - Training epochs completed
      - Best model weights path
      \n      **Next Steps:**
      - Model evaluation and validation
      - Deployment preparation
      - Performance monitoring
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        final_map: { type: 'number', example: 0.85, description: 'Mean Average Precision' },
        precision: { type: 'number', example: 0.92, description: 'Precision score' },
        recall: { type: 'number', example: 0.88, description: 'Recall score' },
        epochs_completed: { type: 'number', example: 100, description: 'Number of training epochs' },
        best_weights_path: { type: 'string', example: '/models/best_weights.pt', description: 'Path to best model weights' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Training completed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        status: { type: 'string', example: 'completed' },
        training_completed_at: { type: 'string', format: 'date-time' },
        training_metrics: {
          type: 'object',
          properties: {
            final_map: { type: 'number' },
            precision: { type: 'number' },
            recall: { type: 'number' },
            epochs_completed: { type: 'number' },
            best_weights_path: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Training not in progress',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'Training is not in progress. Current status: completed',
      error: 'Bad Request',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/retraining/datasets/dataset-id/complete'
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found',
    type: ErrorResponseDto
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

  @Post('datasets/:id/fail')
  @ApiOperation({ 
    summary: 'Mark training as failed',
    description: `
      Mark training as failed due to errors or issues.
      \n      **Common Failure Reasons:**
      - Insufficient training data
      - Configuration errors
      - Resource limitations
      - Model convergence issues
      \n      **Recovery Steps:**
      - Review error logs
      - Adjust configuration
      - Add more training data
      - Retry training process
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Training failed due to insufficient data', description: 'Error description' }
      },
      required: ['error']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Training marked as failed',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        status: { type: 'string', example: 'failed' },
        training_metrics: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found',
    type: ErrorResponseDto
  })
  async failTraining(
    @Param('id', ParseUUIDPipe) datasetId: string,
    @Body() errorDto: { error: string }
  ) {
    return await this.retrainingService.failTraining(datasetId, errorDto.error);
  }

  // Export and Utilities
  @Get('datasets/:id/export')
  @ApiOperation({ 
    summary: 'Export dataset for training',
    description: `
      Export dataset in training-ready format.
      \n      **Export Format:**
      - Images with annotations
      - Training/validation splits
      - Class definitions
      - Configuration files
      \n      **Use Cases:**
      - External training pipelines
      - Model development
      - Dataset sharing
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Dataset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Dataset exported successfully',
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              annotations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    bbox: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        classes: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Dataset not found',
    type: ErrorResponseDto
  })
  async exportDatasetForTraining(@Param('id', ParseUUIDPipe) datasetId: string) {
    return await this.retrainingService.exportDatasetForTraining(datasetId);
  }

  @Get('proxy-image')
  @ApiOperation({ 
    summary: 'Proxy image for annotation',
    description: `
      Proxy image requests for annotation interface.
      \n      **Features:**
      - Secure image access
      - CORS handling
      - Authentication bypass for annotation tools
      - Image optimization
    `
  })
  @ApiQuery({ 
    name: 'url', 
    description: 'Image URL to proxy',
    example: 'https://storage.googleapis.com/ebs-storage/scans/scan-123.jpg'
  })
  @ApiResponse({
    status: 200,
    description: 'Image proxied successfully',
    schema: {
      type: 'string',
      format: 'binary'
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image URL',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
    type: ErrorResponseDto
  })
  async proxyImage(@Query('url') imageUrl: string, @Res() res: Response) {
    // Implementation for image proxying
    res.status(200).send('Image proxy endpoint');
  }

  @Post('export-yolo')
  @ApiOperation({ 
    summary: 'Export YOLO format dataset',
    description: `
      Export dataset in YOLO format for training.
      \n      **YOLO Format:**
      - Images and labels in YOLO structure
      - Class mapping file
      - Training configuration
      - Validation split
      \n      **Compatibility:**
      - YOLOv5, YOLOv8, YOLOv9
      - Custom YOLO implementations
      - Training frameworks
    `
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        objectIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          example: ['123e4567-e89b-12d3-a456-426614174000']
        }
      },
      required: ['objectIds']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'YOLO dataset exported successfully',
    schema: {
      type: 'string',
      format: 'binary'
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid object IDs',
    type: ErrorResponseDto
  })
  async exportYoloDataset(
    @Body() exportDto: { objectIds: string[] },
    @Res() res: Response
  ) {
    // Implementation for YOLO export
    res.status(200).send('YOLO export endpoint');
  }
} 