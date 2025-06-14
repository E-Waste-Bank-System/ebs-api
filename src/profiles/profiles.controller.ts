import { 
  Controller, 
  Get, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ProfilesService } from './profiles.service';
import { UpdateProfileDto, ProfileResponseDto, ProfileListQueryDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('Admin - Profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'List all profiles' })
  @ApiResponse({
    status: 200,
    description: 'List of user profiles',
    type: [ProfileResponseDto],
  })
  async findAll(@Query() query: ProfileListQueryDto): Promise<PaginatedResponse<ProfileResponseDto>> {
    const result = await this.profilesService.findAll(query);
    
    return {
      data: result.data.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        avatar_url: profile.avatar_url,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        last_login_at: profile.last_login_at,
      })),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({
    status: 200,
    description: 'User profile details',
    type: ProfileResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.findOne(id);
    
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      avatar_url: profile.avatar_url,
      is_active: profile.is_active,
      last_login_at: profile.last_login_at,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update profile (name, avatar, role)' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.update(id, updateProfileDto);
    
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      avatar_url: profile.avatar_url,
      is_active: profile.is_active,
      last_login_at: profile.last_login_at,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Soft delete profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile deleted successfully',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.profilesService.remove(id);
    return { message: 'Profile deleted successfully' };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User scan and object statistics',
  })
  async getUserStats(@Param('id', ParseUUIDPipe) id: string) {
    return await this.profilesService.getUserStats(id);
  }
} 