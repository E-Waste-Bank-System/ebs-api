import { 
  Controller, 
  Get, 
  Query, 
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { DashboardObjectStatsDto } from './dto/dashboard-object-stats.dto';
import { DashboardActivityDto } from './dto/dashboard-activity.dto';

@ApiTags('👨‍💼 Admin')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Summary (scan count, categories, trends)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary statistics',
    type: DashboardSummaryDto,
  })
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    return await this.dashboardService.getDashboardSummary();
  }

  @Get('stats/objects')
  @ApiOperation({ summary: 'Breakdown by category, risk, etc.' })
  @ApiResponse({
    status: 200,
    description: 'Object statistics by category and risk level',
    type: DashboardObjectStatsDto,
  })
  async getObjectStats(): Promise<DashboardObjectStatsDto> {
    return await this.dashboardService.getObjectStats();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Recent activity feed' })
  @ApiResponse({
    status: 200,
    description: 'Recent scans and user activity',
    type: DashboardActivityDto,
  })
  async getRecentActivity(@Query('limit') limit?: string): Promise<DashboardActivityDto> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.dashboardService.getRecentActivity(limitNum);
  }
} 