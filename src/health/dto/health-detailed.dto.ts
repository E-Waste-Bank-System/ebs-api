import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthDetailedStatusDto {
  @ApiProperty({ example: 'ok', description: 'Overall status of the detailed health check' })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Timestamp of the health check' })
  timestamp: string;

  @ApiProperty({ example: 3600, description: 'Uptime in seconds' })
  uptime: number;

  @ApiProperty({ example: 'production', description: 'Environment' })
  environment: string;

  @ApiProperty({ example: '1.0.0', description: 'API version' })
  version: string;

  @ApiProperty({ description: 'Detailed components health', type: 'object' })
  components: any;

  @ApiProperty({ description: 'Summary of overall health', type: 'object' })
  summary: any;

  @ApiPropertyOptional({ description: 'Error message if health check failed', example: 'Detailed health check failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Error message if health check failed', example: 'Detailed health check failed' })
  message?: string;
} 