import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({ example: 100 })
  total_scans: number;

  @ApiProperty({ example: 500 })
  total_objects: number;

  @ApiProperty({ example: 50 })
  total_users: number;

  @ApiProperty({ example: 80 })
  completed_scans: number;

  @ApiProperty({ example: 400 })
  validated_objects: number;

  @ApiProperty({ example: 1234567.89 })
  total_estimated_value: number;

  @ApiProperty({ example: 80.5, description: 'Validation rate in percent' })
  validation_rate: number;
} 