import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async getHealth() {
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
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
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