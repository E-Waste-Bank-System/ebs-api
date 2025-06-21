import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

import { ScansService } from './scans.service';
import { CreateScanDto, ScanResponseDto, ScanDetailDto, ScanListQueryDto, DeleteScanResponseDto } from './dto/scan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('📱 E-Waste Scans')
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
      
      **AI Detection Process:**
      1. Upload image (JPG, PNG, WebP supported, max 10MB)
      2. AI analyzes the image to detect e-waste objects
      3. Each object is categorized and estimated for value
      4. Results include object details, categories, and total estimated value
      
      **Supported Formats:** JPG, JPEG, PNG, WebP
      **Max File Size:** 10MB
      **Processing Time:** 10-30 seconds depending on image complexity
      
      **Detection Capabilities:**
      - Electronics (phones, laptops, tablets)
      - Appliances (refrigerators, washing machines)
      - Components (batteries, circuit boards)
      - Value estimation in Indonesian Rupiah (IDR)
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
          description: 'E-waste image file (JPG, PNG, WebP, max 10MB)',
          example: 'e-waste-photo.jpg'
        },
        original_filename: {
          type: 'string',
          description: 'Optional custom filename for reference',
          example: 'my-electronics-collection.jpg'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Scan created successfully - AI processing initiated',
    type: ScanResponseDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      image_url: 'https://storage.googleapis.com/ebs-storage/scans/scan-123.jpg',
      status: 'processing',
      objects_count: 0,
      total_estimated_value: 0,
      created_at: '2024-01-15T10:30:00.000Z'
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or missing required fields',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 413,
    description: 'File too large - exceeds 10MB limit',
    type: ErrorResponseDto
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
    summary: 'Get scan history',
    description: `
      Retrieve paginated list of scans for the current user.
      
      **Access Control:**
      - Regular users see only their own scans
      - Admins can see all scans (use admin endpoints)
      
      **Scan Status:**
      - \`processing\` - AI is analyzing the image
      - \`completed\` - Analysis complete, results available
      - \`failed\` - Processing failed, check error_message
    `
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['processing', 'completed', 'failed'], description: 'Filter by status' })
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
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 45 },
            pages: { type: 'number', example: 3 }
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
      
      **Includes:**
      - Complete scan metadata
      - All detected objects with details:
        - Object category and confidence score
        - Estimated value in IDR
        - Bounding box coordinates for object location
        - AI-generated suggestions and risk assessments
      - Processing status and error messages (if any)
      
      **Object Details:**
      Each detected object includes category, estimated value, confidence score,
      and bounding box coordinates for precise location in the image.
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed scan information with all detected objects',
    type: ScanDetailDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      image_url: 'https://storage.googleapis.com/ebs-storage/scans/scan-123.jpg',
      status: 'completed',
      objects_count: 3,
      total_estimated_value: 750000,
      created_at: '2024-01-15T10:30:00.000Z',
      user_id: '456e7890-e89b-12d3-a456-426614174000',
      objects: [
        {
          id: '789e0123-e89b-12d3-a456-426614174000',
          name: 'Laptop',
          category: 'Laptop',
          confidence_score: 0.95,
          estimated_value: 500000,
          bounding_box: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 }
        }
      ]
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot access other users\' scans',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Scan not found',
    type: ErrorResponseDto
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

  @Delete(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Delete scan',
    description: `
      Delete a scan and all its associated data.
      
      **⚠️ Warning:** This action is irreversible!
      
      **What gets deleted:**
      - Scan record from database
      - All detected objects associated with the scan
      - Image file from cloud storage
      - All related metadata and processing history
      
      **Access Control:**
      - Users can only delete their own scans
      - Admins can delete any scan
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Scan deleted successfully',
    type: DeleteScanResponseDto,
    example: {
      message: 'Scan deleted successfully',
      deletedScanId: '123e4567-e89b-12d3-a456-426614174000'
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot delete other users\' scans',
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
    const filterUserId = userRole === UserRole.USER ? userId : undefined;
    
    await this.scansService.delete(id, filterUserId);
    
    return {
      message: 'Scan deleted successfully',
      deletedScanId: id,
    };
  }

  @Post('recalculate-totals')
  @ApiOperation({ 
    summary: 'Recalculate totals for all scans',
    description: `
      **🔒 Admin Only Operation**
      
      Recalculates object count and total estimated value for all scans.
      Useful for fixing data inconsistencies or after system maintenance.
      
      **When to use:**
      - After data migration
      - Fixing inconsistencies after manual database changes
      - Recovering from calculation bugs
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Totals recalculated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'All scan totals recalculated successfully' }
      }
    }
  })
  async recalculateAllTotals(): Promise<{ message: string }> {
    await this.scansService.recalculateAllScanTotals();
    return { message: 'All scan totals recalculated successfully' };
  }

  @Post(':id/recalculate-totals')
  @ApiOperation({ 
    summary: 'Recalculate totals for specific scan',
    description: 'Recalculate object count and total estimated value for a specific scan'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Scan totals recalculated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Scan totals recalculated successfully' }
      }
    }
  })
  async recalculateScanTotals(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.scansService.recalculateScanTotals(id);
    return { message: 'Scan totals recalculated successfully' };
  }
}

@ApiTags('👨‍💼 Admin - Scans')
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
      - Monitor AI processing performance
      - Identify failed scans requiring attention
      - User information included for each scan
      
      **Use Cases:**
      - System health monitoring
      - User support and troubleshooting
      - Performance analytics
      - Quality assurance
    `
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['processing', 'completed', 'failed'] })
  @ApiQuery({ name: 'user_id', required: false, description: 'Filter by specific user' })
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
  @ApiOperation({ 
    summary: 'Admin view of scan details',
    description: 'Get detailed view of any scan with full admin privileges'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Full scan details for admin',
    type: ScanDetailDto
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

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Admin delete scan',
    description: 'Delete any scan with admin privileges (no ownership restrictions)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Scan UUID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Scan deleted successfully by admin',
    type: DeleteScanResponseDto
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<DeleteScanResponseDto> {
    await this.scansService.delete(id);
    
    return {
      message: 'Scan deleted successfully',
      deletedScanId: id,
    };
  }
} 