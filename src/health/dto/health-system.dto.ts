import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthSystemStatusDto {
  @ApiProperty({ example: 'ok', description: 'Overall status of the system health check' })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Timestamp of the health check' })
  timestamp: string;

  @ApiProperty({
    description: 'System health details',
    example: {
      platform: 'linux',
      architecture: 'x64',
      nodeVersion: 'v18.17.0',
      uptime: 3600,
      loadAverage: [0.5, 0.3, 0.2],
      memory: {
        total: 2048000000,
        free: 1024000000,
        used: 1024000000,
        usage: 50
      },
      cpu: {
        cores: 4,
        model: 'Intel(R) Core(TM) i7-8550U',
        usage: 25.5
      }
    },
    type: 'object',
  })
  system: any;

  @ApiPropertyOptional({ description: 'Error message if system is unhealthy', example: 'High memory usage' })
  error?: string;
} 