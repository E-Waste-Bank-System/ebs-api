import { ApiProperty } from '@nestjs/swagger';

export class RecentScanDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  user_name?: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiProperty({ example: 3 })
  objects_count: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  created_at: string;
}

export class DashboardActivityDto {
  @ApiProperty({ type: [RecentScanDto] })
  recent_scans: RecentScanDto[];
} 