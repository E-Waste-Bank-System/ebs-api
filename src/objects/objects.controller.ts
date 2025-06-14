import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ObjectsService } from './objects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('Objects')
@Controller('objects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all objects with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of objects',
  })
  async findAll(
    @Query() query: PaginationDto & { 
      search?: string; 
      category?: string; 
      scanId?: string;
      isValidated?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    const isValidated = query.isValidated === 'true' ? true : 
                       query.isValidated === 'false' ? false : undefined;
    
    return await this.objectsService.findAll({
      ...query,
      isValidated,
    });
  }

  @Get(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get object detail' })
  @ApiResponse({
    status: 200,
    description: 'Object details',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.objectsService.findOne(id);
  }
}

@ApiTags('Admin - Objects')
@Controller('admin/objects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin view of all objects' })
  @ApiResponse({
    status: 200,
    description: 'All objects with admin view',
  })
  async findAll(
    @Query() query: PaginationDto & { 
      search?: string; 
      category?: string; 
      scanId?: string;
      isValidated?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    const isValidated = query.isValidated === 'true' ? true : 
                       query.isValidated === 'false' ? false : undefined;
    
    return await this.objectsService.findAll({
      ...query,
      isValidated,
    });
  }

  @Patch(':id/validate')
  @ApiOperation({ summary: 'Validate object (correct category, price)' })
  @ApiResponse({
    status: 200,
    description: 'Object validated successfully',
  })
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string },
    @GetUser('id') userId: string,
  ) {
    return await this.objectsService.validate(id, userId, body.notes);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject or mark as invalid' })
  @ApiResponse({
    status: 200,
    description: 'Object rejected successfully',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string },
    @GetUser('id') userId: string,
  ) {
    return await this.objectsService.reject(id, userId, body.notes);
  }
} 