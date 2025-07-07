import { 
  Controller, 
  Get, 
  Post,
  Patch, 
  Param, 
  Body, 
  Query,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { ObjectsService } from './objects.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { ValidateObjectDto, CreateObjectDto } from './dto/object.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { AppLogger } from '../common/utils/logger.util';

@ApiTags('🔍 E-Waste Objects')
@Controller('objects')
export class ObjectsController {
  private readonly logger = AppLogger.getInstance('ObjectsController');

  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'List all objects with pagination',
    description: `
      Retrieve a paginated list of all detected e-waste objects.
      
      **Access Control:** ADMIN and SUPERADMIN only
      
      **Filtering Options:**
      - Search by object name or description
      - Filter by category (electronics, appliances, etc.)
      - Filter by scan ID
      - Filter by validation status
    `
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in object name and description' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by object category' })
  @ApiQuery({ name: 'scanId', required: false, description: 'Filter by scan ID' })
  @ApiQuery({ name: 'isValidated', required: false, enum: ['true', 'false'], description: 'Filter by validation status' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of objects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              category: { type: 'string' },
              confidence_score: { type: 'number' },
              estimated_value: { type: 'number' },
              is_validated: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' }
          }
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
  async findAll(
    @Query() query: PaginationDto & { 
      search?: string; 
      category?: string; 
      scanId?: string;
      isValidated?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    this.logger.logDebug(`Objects list requested with query: ${JSON.stringify(query)}`);
    
    const isValidated = query.isValidated === 'true' ? true : 
                       query.isValidated === 'false' ? false : undefined;
    
    return await this.objectsService.findAll({
      ...query,
      isValidated,
    });
  }

  @Get(':id')
  @Auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Get object detail',
    description: `
      Retrieve detailed information about a specific e-waste object.
      
      **Access Control:**
      - Regular users can only access objects from their own scans
      - Admins can access any object
      
      **Object Information:**
      - Detection details and confidence scores
      - Category classification and estimated value
      - Validation status and notes
      - Associated scan information
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Object UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Object details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        category: { type: 'string' },
        confidence_score: { type: 'number' },
        estimated_value: { type: 'number' },
        risk_level: { type: 'number' },
        damage_level: { type: 'number' },
        is_validated: { type: 'boolean' },
        validation_notes: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        scan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            image_url: { type: 'string' },
            status: { type: 'string' }
          }
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
    description: 'Forbidden - cannot access another user\'s object',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Object not found',
    type: ErrorResponseDto
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.logDebug(`Object details requested for ID: ${id}`);
    return await this.objectsService.findOne(id);
  }
}

@ApiTags('👨‍💼 Admin - Objects')
@Controller('admin/objects')
export class AdminObjectsController {
  private readonly logger = AppLogger.getInstance('AdminObjectsController');

  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Admin view of all objects',
    description: `
      Retrieve all e-waste objects with administrative privileges.
      
      **Admin Features:**
      - View all objects regardless of user ownership
      - Access to validation and management tools
      - System-wide object analytics
      - Quality control and data management
      
      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in object name and description' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by object category' })
  @ApiQuery({ name: 'scanId', required: false, description: 'Filter by scan ID' })
  @ApiQuery({ name: 'isValidated', required: false, enum: ['true', 'false'], description: 'Filter by validation status' })
  @ApiResponse({
    status: 200,
    description: 'All objects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              category: { type: 'string' },
              confidence_score: { type: 'number' },
              estimated_value: { type: 'number' },
              is_validated: { type: 'boolean' },
              validation_notes: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string' },
                  full_name: { type: 'string' }
                }
              }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' }
          }
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
  async findAll(
    @Query() query: PaginationDto & { 
      search?: string; 
      category?: string; 
      scanId?: string;
      isValidated?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    this.logger.logDebug(`Admin objects list requested with query: ${JSON.stringify(query)}`);
    
    const isValidated = query.isValidated === 'true' ? true : 
                       query.isValidated === 'false' ? false : undefined;
    
    return await this.objectsService.findAll({
      ...query,
      isValidated,
    });
  }

  @Post()
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Create manual object entry (Admin)',
    description: `
      Create a manual object entry for missed detections or data correction.
      
      **Use Cases:**
      - Add objects that AI missed during scanning
      - Correct classification errors
      - Add historical data
      - Quality control and data management
      
      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiResponse({
    status: 201,
    description: 'Object created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        category: { type: 'string' },
        estimated_value: { type: 'number' },
        is_validated: { type: 'boolean', example: true },
        created_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid object data',
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
  async create(
    @Body() createObjectDto: CreateObjectDto,
    @GetUser('id') userId: string,
  ) {
    this.logger.logDebug(`Manual object creation requested by admin: ${userId}`);
    return await this.objectsService.create(createObjectDto, userId);
  }

  @Patch(':id/validate')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Validate object (Admin)',
    description: `
      Validate and correct object classification and pricing.
      
      **Validation Process:**
      - Review AI classification accuracy
      - Adjust estimated value based on market rates
      - Update category if misclassified
      - Add validation notes for reference
      
      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Object UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Object validated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        category: { type: 'string' },
        estimated_value: { type: 'number' },
        is_validated: { type: 'boolean', example: true },
        validation_notes: { type: 'string' },
        validated_by: { type: 'string', format: 'uuid' },
        validated_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Object not found',
    type: ErrorResponseDto
  })
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ValidateObjectDto,
    @GetUser('id') userId: string,
  ) {
    this.logger.logDebug(`Object validation requested for ID: ${id} by user: ${userId}`);
    return await this.objectsService.validate(id, userId, body);
  }

  @Patch(':id/reject')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Reject object (Admin)',
    description: `
      Mark an object as invalid or rejected.
      
      **Rejection Reasons:**
      - False positive detection
      - Poor quality image
      - Invalid object type
      - Duplicate entry
      
      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Object UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Object rejected successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        is_validated: { type: 'boolean', example: false },
        rejection_notes: { type: 'string' },
        rejected_by: { type: 'string', format: 'uuid' },
        rejected_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Object not found',
    type: ErrorResponseDto
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string },
    @GetUser('id') userId: string,
  ) {
    this.logger.logDebug(`Object rejection requested for ID: ${id} by user: ${userId}`);
    return await this.objectsService.reject(id, userId, body.notes);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete object (Admin)', description: 'Permanently delete an e-waste object by ID.' })
  @ApiParam({ name: 'id', description: 'Object UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Object deleted successfully', schema: { type: 'object', properties: { message: { type: 'string' }, deletedObjectId: { type: 'string', format: 'uuid' } } } })
  @ApiResponse({ status: 404, description: 'Object not found', type: ErrorResponseDto })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    this.logger.logDebug(`Object delete requested for ID: ${id} by user: ${userId}`);
    await this.objectsService.delete(id, userId);
    return { message: 'Object deleted successfully', deletedObjectId: id };
  }
} 