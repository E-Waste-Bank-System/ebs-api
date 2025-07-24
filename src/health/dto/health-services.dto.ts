import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthServiceStatusDto {
  @ApiProperty({ example: 'ok', description: 'Overall status of the services health check' })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Timestamp of the health check' })
  timestamp: string;

  @ApiProperty({
    description: 'Services health details',
    example: {
      aiService: {
        status: 'available',
        responseTime: '245ms',
        url: 'https://ebs-ai-service.run.app',
        lastCheck: '2024-01-15T10:30:00.000Z'
      },
      storage: {
        status: 'available',
        bucket: 'ebs-storage',
        project: 'ebs-cloud-456404'
      },
      supabase: {
        status: 'available',
        url: 'https://xyz.supabase.co'
      }
    },
    type: 'object',
  })
  services: any;

  @ApiPropertyOptional({ description: 'Error message if services are unhealthy', example: 'Some services are unavailable' })
  error?: string;
} 