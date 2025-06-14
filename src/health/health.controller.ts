import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from '../common/dto/response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'System health check',
    description: 'Check the overall health of the API service including database connectivity'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    type: HealthResponseDto
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy',
    type: HealthResponseDto
  })
  async getHealth(): Promise<HealthResponseDto> {
    const startTime = Date.now();
    
    try {
      // Check database connection
      await this.dataSource.query('SELECT 1');
      const dbStatus = 'connected';
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        database: {
          status: dbStatus,
          responseTime: `${responseTime}ms`,
        },
        services: {
          api: 'healthy',
          database: 'healthy',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        database: {
          status: 'disconnected',
          error: error.message,
          responseTime: `${responseTime}ms`,
        },
        services: {
          api: 'healthy',
          database: 'unhealthy',
        },
      };
    }
  }

  @Get('db')
  @ApiOperation({ 
    summary: 'Database connectivity check',
    description: 'Detailed database health check with connection metrics and server information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        database: {
          type: 'object',
          properties: {
            connected: { type: 'boolean' },
            responseTime: { type: 'string' },
            serverTime: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Database is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        database: {
          type: 'object',
          properties: {
            connected: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async getDatabaseHealth() {
    try {
      const startTime = Date.now();
      const result = await this.dataSource.query('SELECT NOW() as current_time, version() as version');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        database: {
          connected: true,
          responseTime: `${responseTime}ms`,
          serverTime: result[0]?.current_time,
          version: result[0]?.version?.split(' ')[0] || 'unknown',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        database: {
          connected: false,
          error: error.message,
        },
      };
    }
  }
} 