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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Upload scan image for AI processing' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Scan created and processing started',
    type: ScanResponseDto,
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
    });
    console.log('Controller received body:', createScanDto);

    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const scan = await this.scansService.create(file, createScanDto, userId);
    return {
      id: scan.id,
      image_url: scan.image_url,
      status: scan.status,
      objects_count: scan.objects_count,
      total_estimated_value: scan.total_estimated_value,
      created_at: scan.created_at,
      error_message: scan.error_message,
    };
  }

  @Get()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get current user scan history' })
  @ApiResponse({
    status: 200,
    description: 'User scan history',
    type: [ScanResponseDto],
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
  @ApiOperation({ summary: 'Get specific scan with detected objects' })
  @ApiResponse({
    status: 200,
    description: 'Scan details with objects',
    type: ScanDetailDto,
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
  @ApiOperation({ summary: 'Admin dashboard: list all scans' })
  @ApiResponse({
    status: 200,
    description: 'All scans with admin view',
    type: [ScanDetailDto],
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