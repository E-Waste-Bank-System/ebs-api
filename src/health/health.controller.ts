import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from '../common/dto/response.dto';

@ApiTags('🏥 Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'System health check',
    description: `
      Check the overall health of the API service including database connectivity.
      
      **Health Indicators:**
      - API service status
      - Database connection status  
      - Response time metrics
      - System uptime
      - Environment information
      
      **Usage:**
      - Monitoring and alerting systems
      - Load balancer health checks
      - DevOps automation
      - Troubleshooting connectivity issues
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    type: HealthResponseDto,
    example: {
      status: 'ok',
      timestamp: '2024-01-15T10:30:00.000Z',
      uptime: 3600,
      environment: 'production',
      version: '1.0.0',
      database: {
        status: 'connected',
        responseTime: '25ms'
      },
      services: {
        api: 'healthy',
        database: 'healthy'
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy',
    type: HealthResponseDto,
    example: {
      status: 'error',
      timestamp: '2024-01-15T10:30:00.000Z',
      uptime: 3600,
      environment: 'production',
      version: '1.0.0',
      database: {
        status: 'disconnected',
        error: 'Connection timeout'
      },
      services: {
        api: 'healthy',
        database: 'unhealthy'
      }
    }
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
    summary: 'Database health check',
    description: `
      Detailed database connectivity check with performance metrics.
      
      **Metrics Included:**
      - Connection status
      - Query response time
      - Database server information
      - PostgreSQL version details
      
      **Use Cases:**
      - Database-specific monitoring
      - Performance troubleshooting
      - Connection pool monitoring
      - Database migration verification
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database is healthy',
    example: {
      status: 'ok',
      database: {
        connected: true,
        responseTime: '15ms',
        serverTime: '2024-01-15T10:30:00.000Z',
        version: '15.4'
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Database is unhealthy',
    example: {
      status: 'error',
      database: {
        connected: false,
        error: 'Connection timeout after 5000ms'
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