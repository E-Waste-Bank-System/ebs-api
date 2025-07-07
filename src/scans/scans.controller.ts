import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query, 
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

import { ScansService } from './scans.service';
import { CreateScanDto, ScanResponseDto, ScanDetailDto, ScanListQueryDto, DeleteScanResponseDto } from './dto/scan.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { AppLogger } from '../common/utils/logger.util';

@ApiTags('📸 Scans')
@Controller('scans')
export class ScansController {
  private readonly logger = AppLogger.getInstance('ScansController');

  constructor(private readonly scansService: ScansService) {}

  @Post()
  @Auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload and scan e-waste image',
    description: `
      Upload an image of e-waste items for AI-powered detection and analysis.
      \n      **Process:**
      1. Upload image file (JPG, PNG, WebP supported)
      2. AI analyzes image for e-waste objects
      3. Returns detected objects with classifications
      4. Estimates values and risk levels
      \n      **File Requirements:**
      - Max size: 10MB
      - Supported formats: JPG, PNG, WebP
      - Minimum resolution: 640x480
      - Clear, well-lit images work best
      \n      **Access Control:** All authenticated users
    `
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'E-waste image file for AI scanning',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to scan',
          example: 'e-waste-image.jpg'
        },
        original_filename: {
          type: 'string',
          description: 'Original filename (optional)',
          example: 'my-e-waste-scan.jpg'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Scan created successfully',
    type: ScanResponseDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      image_url: 'https://storage.googleapis.com/ebs-storage/scans/scan-123.jpg',
      status: 'processing',
      objects_count: 0,
      total_estimated_value: 0,
      created_at: '2024-01-15T10:30:00.000Z',
      error_message: null
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or data',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'Invalid file format. Supported formats: JPG, PNG, WebP',
      error: 'Bad Request',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/scans'
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/scans'
    }
  })
  @ApiResponse({
    status: 413,
    description: 'File too large',
    type: ErrorResponseDto,
    example: {
      statusCode: 413,
      message: 'File size exceeds maximum limit of 10MB',
      error: 'Payload Too Large',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/scans'
    }
  })
  async create(
    @UploadedFile() file: any,
    @Body() createScanDto: CreateScanDto,
    @GetUser('id') userId: string,
  ): Promise<ScanResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.logInfo(`Scan creation requested by user: ${userId}`);
    return this.scansService.create(file, createScanDto, userId);
  }

  @Get()
  @Auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'List user scans',
    description: `
      Retrieve a paginated list of scans for the authenticated user.
      \n      **Access Control:**
      - Regular users see only their own scans
      - Admins can see all scans (when user_id is provided)
      \n      **Filtering Options:**
      - Filter by scan status (processing, completed, failed)
      - Search by date range
      - Sort by creation date or status
      \n      **Response Includes:**
      - Scan metadata and status
      - Object counts and estimated values
      - Processing timestamps
      - Error messages for failed scans
    `
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['processing', 'completed', 'failed'], description: 'Filter by scan status' })
  @ApiQuery({ name: 'user_id', required: false, description: 'Filter by user ID (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Scans retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ScanResponseDto' }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 5 },
            pages: { type: 'number', example: 1 }
          }
        }
      },
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            image_url: 'https://storage.googleapis.com/ebs-storage/scans/scan-123.jpg',
            status: 'completed',
            objects_count: 3,
            total_estimated_value: 45000,
            created_at: '2024-01-15T10:30:00.000Z',
            error_message: null
          }
        ],
        meta: { page: 1, limit: 20, total: 1, pages: 1 }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  async findAll(
    @Query() query: ScanListQueryDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: UserRole,
  ): Promise<PaginatedResponse<ScanResponseDto>> {
    // Regular users can only see their own scans
    const effectiveUserId = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN 
      ? undefined 
      : userId;

    return this.scansService.findAll(query, effectiveUserId);
  }

  @Get(':id')
  @Auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Get scan details',
    description: `
      Retrieve detailed information about a specific scan including all detected objects.
      \n      **Access Control:**
      - Regular users can only access their own scans
      - Admins can access any scan
      \n      **Response Includes:**
      - Scan metadata and status
      - All detected objects with bounding boxes
      - AI confidence scores and descriptions
      - Estimated values and risk assessments
      - Processing timestamps and error messages
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Scan details retrieved successfully',
    type: ScanDetailDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      image_url: 'https://storage.googleapis.com/ebs-storage/scans/scan-123.jpg',
      status: 'completed',
      objects_count: 3,
      total_estimated_value: 45000,
      created_at: '2024-01-15T10:30:00.000Z',
      user_id: 'user-uuid',
      objects: [
        {
          id: 'obj-123',
          name: 'Laptop',
          category: 'Laptop',
          confidence_score: 0.95,
          estimated_value: 25000,
          risk_level: 4,
          damage_level: 2
        }
      ],
      error_message: null
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/scans/123e4567-e89b-12d3-a456-426614174000'
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot access another user\'s scan',
    type: ErrorResponseDto,
    example: {
      statusCode: 403,
      message: 'Forbidden',
      error: 'Forbidden',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/scans/other-user-scan-id'
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Scan not found',
    type: ErrorResponseDto,
    example: {
      statusCode: 404,
      message: 'Scan not found',
      error: 'Not Found',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/scans/unknown-id'
    }
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: UserRole,
  ): Promise<ScanDetailDto> {
    // Regular users can only access their own scans
    const effectiveUserId = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN 
      ? undefined 
      : userId;

    return this.scansService.findOne(id, effectiveUserId);
  }

  @Delete(':id')
  @Auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Delete scan',
    description: `
      Permanently delete a scan and all associated data.
      \n      **Access Control:**
      - Regular users can only delete their own scans
      - Admins can delete any scan
      \n      **Deletion Process:**
      - Removes scan record from database
      - Deletes associated detected objects
      - Removes image file from storage
      - Cannot be undone
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Scan deleted successfully',
    type: DeleteScanResponseDto,
    example: {
      message: 'Scan deleted successfully',
      deletedScanId: '123e4567-e89b-12d3-a456-426614174000',
      deleted_at: '2024-01-15T10:30:00.000Z'
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot delete another user\'s scan',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Scan not found',
    type: ErrorResponseDto
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: UserRole,
  ): Promise<DeleteScanResponseDto> {
    // Regular users can only delete their own scans
    const effectiveUserId = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN 
      ? undefined 
      : userId;

    await this.scansService.delete(id, effectiveUserId);
    
    return {
      message: 'Scan deleted successfully',
      deletedScanId: id,
      deleted_at: new Date().toISOString(),
    };
  }
}

@ApiTags('👨‍💼 Admin')
@Controller('admin/scans')
export class AdminScansController {
  private readonly logger = AppLogger.getInstance('AdminScansController');

  constructor(private readonly scansService: ScansService) {}

  @Get()
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'List all scans (admin)',
    description: `
      Retrieve all scans in the system with administrative privileges.
      \n      **Admin Features:**
      - View all scans regardless of user ownership
      - Access to system-wide scan analytics
      - Quality control and data management
      - Performance monitoring
      \n      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['processing', 'completed', 'failed'], description: 'Filter by scan status' })
  @ApiQuery({ name: 'user_id', required: false, description: 'Filter by user ID' })
  @ApiResponse({
    status: 200,
    description: 'All scans retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ScanDetailDto' }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 10 },
            pages: { type: 'number', example: 1 }
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
  async findAll(@Query() query: ScanListQueryDto): Promise<PaginatedResponse<ScanDetailDto>> {
    return this.scansService.findAll(query);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Get scan details (admin)',
    description: `
      Retrieve detailed information about any scan in the system.
      \n      **Admin Access:**
      - View any scan regardless of ownership
      - Access to full scan data and metadata
      - Debug information for troubleshooting
      - Quality assessment tools
      \n      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Scan details retrieved successfully',
    type: ScanDetailDto
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
  @ApiResponse({
    status: 404,
    description: 'Scan not found',
    type: ErrorResponseDto
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScanDetailDto> {
    return this.scansService.findOne(id);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Delete scan (admin)',
    description: `
      Permanently delete any scan in the system.
      \n      **Admin Privileges:**
      - Delete any scan regardless of ownership
      - System-wide data management
      - Quality control and cleanup
      - Cannot be undone
      \n      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Scan deleted successfully',
    type: DeleteScanResponseDto
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
  @ApiResponse({
    status: 404,
    description: 'Scan not found',
    type: ErrorResponseDto
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<DeleteScanResponseDto> {
    await this.scansService.delete(id);
    
    return {
      message: 'Scan deleted successfully',
      deletedScanId: id,
      deleted_at: new Date().toISOString(),
    };
  }

  @Get(':id/debug')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Debug scan information (admin)',
    description: `
      Retrieve debug information about a scan for troubleshooting.
      \n      **Debug Information:**
      - AI processing details
      - Error logs and stack traces
      - Performance metrics
      - System configuration
      \n      **Access Control:** ADMIN and SUPERADMIN only
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Debug information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        scan_id: { type: 'string', format: 'uuid' },
        processing_time: { type: 'number', example: 2.5 },
        ai_response: { type: 'object' },
        error_details: { type: 'object' },
        system_info: { type: 'object' }
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
  @ApiResponse({
    status: 404,
    description: 'Scan not found',
    type: ErrorResponseDto
  })
  async debugScan(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    const scan = await this.scansService.findOne(id);
    
    return {
      scan: {
        id: scan.id,
        status: scan.status,
        image_url: scan.image_url,
        objects_count: scan.objects_count,
        total_estimated_value: scan.total_estimated_value,
        created_at: scan.created_at,
        processed_at: scan.processed_at,
        error_message: scan.error_message,
        metadata: scan.metadata,
      },
      objects: scan.objects?.map(obj => ({
        id: obj.id,
        name: obj.name,
        category: obj.category,
        confidence_score: obj.confidence_score,
        estimated_value: obj.estimated_value,
        risk_level: obj.risk_level,
        damage_level: obj.damage_level,
        ai_metadata: obj.ai_metadata,
      })),
    };
  }
} 