import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Detailed error information' })
  error?: string;

  @ApiProperty({ description: 'Request timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request path' })
  path: string;
}

export class HealthResponseDto {
  @ApiProperty({ description: 'Service status', enum: ['ok', 'error', 'warning', 'degraded'] })
  status: 'ok' | 'error' | 'warning' | 'degraded';

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Service uptime in seconds' })
  uptime: number;

  @ApiProperty({ description: 'Environment' })
  environment: string;

  @ApiProperty({ description: 'API version' })
  version: string;

  @ApiPropertyOptional({ description: 'Database status' })
  database?: {
    status: string;
    responseTime?: string;
    error?: string;
    version?: string;
    connectionPool?: any;
  };

  @ApiPropertyOptional({ description: 'Services status' })
  services?: any;

  @ApiPropertyOptional({ description: 'System metrics' })
  system?: any;

  @ApiPropertyOptional({ description: 'Performance metrics' })
  metrics?: any;
} 