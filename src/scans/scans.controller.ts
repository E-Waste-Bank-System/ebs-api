import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { ScansService } from './scans.service';
import { CreateScanDto, ScanResponseDto, ScanDetailDto, ScanListQueryDto } from './dto/scan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('E-Waste Scans')
@Controller('scans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload e-waste image for AI scanning',
    description: `
      Upload an image containing e-waste items for AI-powered detection and categorization.
      
      **Process:**
      1. Upload image (JPG, PNG, WebP supported)
      2. AI analyzes the image to detect e-waste objects
      3. Each object is categorized and estimated for value
      4. Results include object details, categories, and total estimated value
      
      **Image Requirements:**
      - Format: JPG, JPEG, PNG, WebP
      - Max size: 10MB
      - Clear visibility of e-waste items
      - Good lighting recommended
      
      **AI Detection:**
      - Identifies individual e-waste objects
      - Categorizes by type (electronics, appliances, etc.)
      - Estimates monetary value
      - Provides confidence scores
    `
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'E-waste image file upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'E-waste image file (JPG, PNG, WebP, max 10MB)'
        },
        original_filename: {
          type: 'string',
          description: 'Optional custom filename',
          example: 'my-e-waste-scan.jpg'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Scan created successfully - AI processing initiated',
    type: ScanResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - image file missing or invalid format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Image file is required' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  async create(
    @UploadedFile() file: any,
    @Body() createScanDto: CreateScanDto,
    @GetUser('id') userId: string,
  ): Promise<ScanResponseDto> {
    console.log('Controller received file:', {
      hasFile: !!file,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      buffer: file?.buffer ? `${file.buffer.length} bytes` : 'No buffer',
    });
    console.log('Controller received body:', createScanDto);
    console.log('User ID:', userId);

    if (!file) {
      console.error('No file received in request');
      throw new BadRequestException('Image file is required');
    }

    if (!file.buffer && !file.path) {
      console.error('File has no buffer or path');
      throw new BadRequestException('Invalid file format');
    }

    try {
      const scan = await this.scansService.create(file, createScanDto, userId);
      console.log('Scan created successfully:', scan.id);
      
      return {
        id: scan.id,
        image_url: scan.image_url,
        status: scan.status,
        objects_count: scan.objects_count,
        total_estimated_value: scan.total_estimated_value,
        created_at: scan.created_at,
        error_message: scan.error_message,
      };
    } catch (error) {
      console.error('Error in scan creation:', error);
      throw error;
    }
  }

  @Get()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Get user scan history',
    description: `
      Retrieve paginated list of scans for the current user.
      
      **User Access:**
      - Regular users see only their own scans
      - Admins can see all scans by omitting user filtering
      
      **Filtering Options:**
      - Status: Filter by processing status (pending, completed, failed)
      - Date range: Filter by creation date
      - Pagination: Control page size and offset
      
      **Response includes:**
      - Scan metadata (ID, status, creation date)
      - Object count and total estimated value
      - Image URL for viewing
      - Error messages if processing failed
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Scan history retrieved successfully',
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
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required'
  })
  async findAll(
    @Query() query: ScanListQueryDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: UserRole,
  ): Promise<PaginatedResponse<ScanResponseDto>> {
    // Regular users can only see their own scans
    const filterUserId = userRole === UserRole.USER ? userId : undefined;
    
    const result = await this.scansService.findAll(query, filterUserId);
    
    return {
      data: result.data.map(scan => ({
        id: scan.id,
        image_url: scan.image_url,
        status: scan.status,
        objects_count: scan.objects_count,
        total_estimated_value: scan.total_estimated_value,
        created_at: scan.created_at,
        error_message: scan.error_message,
      })),
      meta: result.meta,
    };
  }

  @Get(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Get detailed scan results',
    description: `
      Retrieve detailed information about a specific scan including all detected objects.
      
      **Access Control:**
      - Users can only access their own scans
      - Admins can access any scan
      
      **Detailed Information:**
      - Complete scan metadata
      - All detected objects with details:
        - Object category and name
        - Confidence score
        - Estimated value
        - Bounding box coordinates
        - Validation status
      - Processing status and any error messages
      - User information (for admin access)
      
      **Use Cases:**
      - View scan results after processing
      - Review detected objects for accuracy
      - Check processing status and errors
      - Admin monitoring and validation
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed scan information with all detected objects',
    type: ScanDetailDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot access other users\' scans'
  })
  @ApiResponse({
    status: 404,
    description: 'Scan not found'
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: UserRole,
  ): Promise<ScanDetailDto> {
    // Regular users can only see their own scans
    const filterUserId = userRole === UserRole.USER ? userId : undefined;
    
    const scan = await this.scansService.findOne(id, filterUserId);
    
    return {
      id: scan.id,
      image_url: scan.image_url,
      status: scan.status,
      objects_count: scan.objects_count,
      total_estimated_value: scan.total_estimated_value,
      created_at: scan.created_at,
      error_message: scan.error_message,
      user_id: scan.user_id,
      objects: scan.objects || [],
      metadata: scan.metadata,
    };
  }
}

@ApiTags('Admin - Scans')
@Controller('admin/scans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Admin dashboard - all scans overview',
    description: `
      **🔒 Admin Only**
      
      Comprehensive view of all scans in the system for administrative monitoring.
      
      **Features:**
      - View all user scans across the platform
      - Filter by user, status, date range
      - Monitor processing performance
      - Identify failed scans requiring attention
      - User information included for each scan
      
      **Monitoring Capabilities:**
      - Track AI processing success rates
      - Identify common failure patterns
      - Monitor system usage and load
      - User activity analysis
      
      **Use Cases:**
      - System health monitoring
      - User support and troubleshooting
      - Performance analytics
      - Quality assurance
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Complete list of all scans with admin-level details',
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
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required'
  })
  async findAll(@Query() query: ScanListQueryDto): Promise<PaginatedResponse<ScanDetailDto>> {
    const result = await this.scansService.findAll(query);
    
    return {
      data: result.data.map(scan => ({
        id: scan.id,
        image_url: scan.image_url,
        status: scan.status,
        objects_count: scan.objects_count,
        total_estimated_value: scan.total_estimated_value,
        created_at: scan.created_at,
        error_message: scan.error_message,
        user_id: scan.user_id,
        user: scan.user ? {
          id: scan.user.id,
          email: scan.user.email,
          full_name: scan.user.full_name,
          avatar_url: scan.user.avatar_url,
          role: scan.user.role,
          is_active: scan.user.is_active,
          created_at: scan.user.created_at,
          updated_at: scan.user.updated_at,
        } : undefined,
        objects: scan.objects || [],
        metadata: scan.metadata,
      })),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail view of scan & all detected objects' })
  @ApiResponse({
    status: 200,
    description: 'Full scan details for admin',
    type: ScanDetailDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScanDetailDto> {
    const scan = await this.scansService.findOne(id);
    
    return {
      id: scan.id,
      image_url: scan.image_url,
      status: scan.status,
      objects_count: scan.objects_count,
      total_estimated_value: scan.total_estimated_value,
      created_at: scan.created_at,
      error_message: scan.error_message,
      user_id: scan.user_id,
      objects: scan.objects || [],
      metadata: scan.metadata,
    };
  }
} 