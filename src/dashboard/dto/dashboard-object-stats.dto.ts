import { ApiProperty } from '@nestjs/swagger';

export class CategoryStatsDto {
  @ApiProperty({ example: 'Laptop' })
  category: string;

  @ApiProperty({ example: 42 })
  count: number;

  @ApiProperty({ example: 0.98 })
  avg_confidence: number;

  @ApiProperty({ example: 1000000 })
  total_value: number;
}

export class RiskStatsDto {
  @ApiProperty({ example: 3 })
  risk_level: number;

  @ApiProperty({ example: 20 })
  count: number;
}

export class DashboardObjectStatsDto {
  @ApiProperty({ type: [CategoryStatsDto] })
  by_category: CategoryStatsDto[];

  @ApiProperty({ type: [RiskStatsDto] })
  by_risk_level: RiskStatsDto[];
} 