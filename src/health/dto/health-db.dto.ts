import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthDbStatusDto {
  @ApiProperty({ example: 'ok', description: 'Status of the database health check' })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Timestamp of the health check' })
  timestamp: string;

  @ApiProperty({
    description: 'Database health details',
    example: {
      connected: true,
      responseTime: '15ms',
      serverTime: '2024-01-15T10:30:00.000Z',
      version: '15.4',
    },
    type: 'object',
  })
  database: any;
} 