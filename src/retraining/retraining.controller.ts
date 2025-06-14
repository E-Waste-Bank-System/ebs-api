import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Body, 
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { RetrainingService } from './retraining.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('Retraining')
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
} 