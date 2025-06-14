import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Response status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error details' })
  error?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;
}

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

export class SuccessResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;
}

export class HealthResponseDto {
  @ApiProperty({ description: 'Service status', enum: ['ok', 'error'] })
  status: 'ok' | 'error';

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
  };

  @ApiPropertyOptional({ description: 'Service health status' })
  services?: {
    api: string;
    database: string;
  };
} 