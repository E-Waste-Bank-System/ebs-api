import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { HealthResponseDto } from '../common/dto/response.dto';
import { Public } from '../auth/decorators/public.decorator';
import * as os from 'os';
import * as process from 'process';

@ApiTags('🏥 Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  @Get()
  @Public()
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
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const environment = this.configService.get('NODE_ENV', 'development');
    const version = this.configService.get('API_VERSION', '1.0.0');

    try {
      // Check database health
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check external services
      const servicesHealth = await this.checkExternalServices();
      
      // Check system resources
      const systemHealth = this.getSystemHealth();
      
      // Determine overall status
      const isHealthy = dbHealth.status === 'connected' && 
                       servicesHealth.aiService.status === 'available' &&
                       servicesHealth.storage.status === 'available';

      const response: any = {
        status: isHealthy ? 'ok' : 'error',
        timestamp,
        uptime,
        environment,
        version,
        database: dbHealth,
        services: {
          api: 'healthy',
          database: dbHealth.status === 'connected' ? 'healthy' : 'unhealthy',
          aiService: servicesHealth.aiService.status === 'available' ? 'healthy' : 'unhealthy',
          storage: servicesHealth.storage.status === 'available' ? 'healthy' : 'unhealthy',
          supabase: servicesHealth.supabase.status === 'available' ? 'healthy' : 'unhealthy',
        } as any,
        system: systemHealth,
        metrics: {
          totalRequests: await this.getTotalRequests(),
          activeConnections: (this.dataSource.driver as any).pool?.totalCount || 0,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
        }
      };

      this.logger.log(`Health check completed - Status: ${response.status}`);
      return response;

    } catch (error) {
      this.logger.error('Health check failed:', error);
      
      return {
        status: 'error',
        timestamp,
        uptime,
        environment,
        version,
        database: {
          status: 'error',
          error: error.message,
        },
      };
    }
  }

  @Get('db')
  @Public()
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
      const dbHealth = await this.checkDatabaseHealth();
      
      return {
        status: dbHealth.status === 'connected' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message,
        },
      };
    }
  }

  @Get('services')
  @Public()
  @ApiOperation({
    summary: 'External services health check',
    description: `
      Check the health of all external dependencies and integrations.
      
      **Services Monitored:**
      - AI Service (ebs-ai) - Object detection and analysis
      - Google Cloud Storage - File storage
      - Supabase - Authentication service
      - Database - PostgreSQL connection
      
      **Response Includes:**
      - Service availability status
      - Response times
      - Error details if unavailable
      - Last successful connection time
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Services health status',
    example: {
      status: 'ok',
      services: {
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
      }
    }
  })
  async getServicesHealth() {
    try {
      const servicesHealth = await this.checkExternalServices();
      
      const allHealthy = Object.values(servicesHealth).every(
        service => service.status === 'available'
      );

      return {
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: servicesHealth,
      };
    } catch (error) {
      this.logger.error('Services health check failed:', error);
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('system')
  @Public()
  @ApiOperation({
    summary: 'System resources health check',
    description: `
      Monitor system resources and performance metrics.
      
      **System Metrics:**
      - CPU usage and load average
      - Memory usage (heap, RSS, external)
      - Disk space availability
      - Network interface status
      - Process information
      - OS details
      
      **Performance Indicators:**
      - Response times
      - Request throughput
      - Error rates
      - Active connections
    `
  })
  @ApiResponse({
    status: 200,
    description: 'System health metrics',
    example: {
      status: 'ok',
      system: {
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
      }
    }
  })
  async getSystemMetrics() {
    try {
      const systemHealth = this.getSystemHealth();
      
      // Determine system health based on thresholds
      const memoryUsage = (systemHealth.memory.used / systemHealth.memory.total) * 100;
      const isHealthy = memoryUsage < 90 && systemHealth.loadAverage[0] < systemHealth.cpu.cores;

      return {
        status: isHealthy ? 'ok' : 'warning',
        timestamp: new Date().toISOString(),
        system: systemHealth,
      };
    } catch (error) {
      this.logger.error('System health check failed:', error);
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('detailed')
  @Public()
  @ApiOperation({
    summary: 'Comprehensive health report',
    description: `
      Complete system health report including all components and metrics.
      
      **Complete Assessment:**
      - All service dependencies
      - Database connection pool status
      - System resource utilization
      - API performance metrics
      - Error rates and patterns
      - Configuration validation
      
      **Use for:**
      - Detailed troubleshooting
      - Performance analysis
      - Capacity planning
      - System monitoring dashboards
    `
  })
  async getDetailedHealth() {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    try {
      const [dbHealth, servicesHealth, systemHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkExternalServices(),
        Promise.resolve(this.getSystemHealth()),
      ]);

      // Get database statistics
      const dbStats = await this.getDatabaseStatistics();
      
      // Get API metrics
      const apiMetrics = await this.getAPIMetrics();

      // Configuration check
      const configHealth = this.checkConfiguration();

      const overallHealth = this.calculateOverallHealth({
        database: dbHealth,
        services: servicesHealth,
        system: systemHealth,
        config: configHealth,
      });

      return {
        status: overallHealth.status,
        timestamp,
        uptime,
        environment: this.configService.get('NODE_ENV', 'development'),
        version: this.configService.get('API_VERSION', '1.0.0'),
        components: {
          database: {
            ...dbHealth,
            statistics: dbStats,
          },
          services: servicesHealth,
          system: systemHealth,
          api: apiMetrics,
          configuration: configHealth,
        },
        summary: overallHealth.summary,
      };
    } catch (error) {
      this.logger.error('Detailed health check failed:', error);
      
      return {
        status: 'error',
        timestamp,
        uptime,
        error: error.message,
        message: 'Detailed health check failed',
      };
    }
  }

  // Private helper methods
  private async checkDatabaseHealth() {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.dataSource.query('SELECT 1 as health_check');
      
      // Get server information
      const serverInfo = await this.dataSource.query(`
        SELECT 
          version() as version,
          current_setting('server_version') as server_version,
          current_database() as database_name,
          current_user as current_user,
          inet_server_addr() as server_address,
          inet_server_port() as server_port,
          now() as server_time
      `);

      const responseTime = Date.now() - startTime;

      return {
        status: 'connected',
        responseTime: `${responseTime}ms`,
        serverTime: serverInfo[0].server_time,
        version: serverInfo[0].server_version,
        database: serverInfo[0].database_name,
        user: serverInfo[0].current_user,
        address: serverInfo[0].server_address,
        port: serverInfo[0].server_port,
        connectionPool: {
          total: (this.dataSource.driver as any).pool?.totalCount || 0,
          idle: (this.dataSource.driver as any).pool?.idleCount || 0,
          waiting: (this.dataSource.driver as any).pool?.waitingCount || 0,
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      
      return {
        status: 'disconnected',
        error: error.message,
        responseTime: `${Date.now() - startTime}ms`,
      };
    }
  }

  private async checkExternalServices() {
    const services = {
      aiService: await this.checkAIService(),
      storage: await this.checkStorageService(),
      supabase: await this.checkSupabaseService(),
    };

    return services;
  }

  private async checkAIService() {
    const aiServiceUrl = 'https://ebs-ai-981332637673.asia-southeast2.run.app';
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${aiServiceUrl}/`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'available',
          responseTime: `${responseTime}ms`,
          url: aiServiceUrl,
          version: data.version || 'unknown',
          endpoints: data.endpoints || [],
          categories: data.categories || {},
          lastCheck: new Date().toISOString(),
        };
      } else {
        return {
          status: 'unavailable',
          responseTime: `${responseTime}ms`,
          url: aiServiceUrl,
          error: `HTTP ${response.status}: ${response.statusText}`,
          lastCheck: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        status: 'unavailable',
        url: aiServiceUrl,
        error: error.message,
        responseTime: `${Date.now() - startTime}ms`,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async checkStorageService() {
    try {
      const bucketName = this.configService.get('GCP_BUCKET', 'ebs-storage');
      const projectId = this.configService.get('GCP_PROJECT_ID', 'ebs-cloud-456404');

      // Basic configuration check
      const hasCredentials = !!(
        this.configService.get('GCP_SERVICE_ACCOUNT_JSON') ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );

      return {
        status: hasCredentials ? 'available' : 'configuration_error',
        bucket: bucketName,
        project: projectId,
        credentialsConfigured: hasCredentials,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unavailable',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async checkSupabaseService() {
    try {
      const supabaseUrl = this.configService.get('SUPABASE_URL');
      const serviceRoleKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !serviceRoleKey) {
        return {
          status: 'configuration_error',
          error: 'Missing Supabase configuration',
          lastCheck: new Date().toISOString(),
        };
      }

      // Basic connectivity test
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 5000);

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        signal: controller2.signal,
      });

      clearTimeout(timeoutId2);

      return {
        status: response.ok ? 'available' : 'unavailable',
        url: supabaseUrl,
        responseStatus: response.status,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unavailable',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private getSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      systemUptime: Math.floor(os.uptime()),
      loadAverage,
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usage: Math.round((usedMemory / totalMemory) * 100),
        heap: {
          total: memoryUsage.heapTotal,
          used: memoryUsage.heapUsed,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
        },
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      network: os.networkInterfaces(),
    };
  }

  private async getDatabaseStatistics() {
    try {
      const stats = await this.dataSource.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        LIMIT 10;
      `);

      const tableStats = await this.dataSource.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables;
      `);

      return {
        tables: tableStats,
        columnStats: stats,
      };
    } catch (error) {
      this.logger.error('Failed to get database statistics:', error);
      return {
        error: error.message,
      };
    }
  }

  private async getAPIMetrics() {
    try {
      // Get scan statistics
      const scanStats = await this.dataSource.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM scans 
        GROUP BY status;
      `);

      // Get object statistics
      const objectStats = await this.dataSource.query(`
        SELECT 
          category,
          COUNT(*) as count,
          AVG(confidence_score) as avg_confidence,
          AVG(estimated_value) as avg_value
        FROM detected_objects 
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10;
      `);

      // Get user statistics
      const userStats = await this.dataSource.query(`
        SELECT 
          role,
          COUNT(*) as count,
          COUNT(CASE WHEN is_active THEN 1 END) as active_count
        FROM profiles 
        GROUP BY role;
      `);

      return {
        scans: scanStats,
        objects: objectStats,
        users: userStats,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      };
    } catch (error) {
      this.logger.error('Failed to get API metrics:', error);
      return {
        error: error.message,
      };
    }
  }

  private checkConfiguration() {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GCP_BUCKET',
      'GCP_PROJECT_ID',
    ];

    const missing = requiredEnvVars.filter(
      env => !this.configService.get(env)
    );

    const optional = [
      'GCP_SERVICE_ACCOUNT_JSON',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'PORT',
      'NODE_ENV',
    ];

    const optionalPresent = optional.filter(
      env => !!this.configService.get(env)
    );

    return {
      status: missing.length === 0 ? 'valid' : 'incomplete',
      required: {
        total: requiredEnvVars.length,
        present: requiredEnvVars.length - missing.length,
        missing,
      },
      optional: {
        total: optional.length,
        present: optionalPresent,
      },
      environment: this.configService.get('NODE_ENV', 'development'),
    };
  }

  private calculateOverallHealth(components: any) {
    const scores = {
      database: components.database.status === 'connected' ? 100 : 0,
      services: Object.values(components.services).every(
        (s: any) => s.status === 'available'
      ) ? 100 : 50,
      system: components.system.memory.usage < 90 ? 100 : 50,
      config: components.config.status === 'valid' ? 100 : 0,
    };

    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;

    let status = 'error';
    if (overallScore >= 90) status = 'ok';
    else if (overallScore >= 70) status = 'warning';
    else if (overallScore >= 50) status = 'degraded';

    return {
      status,
      score: Math.round(overallScore),
      summary: {
        healthy: Object.values(scores).filter(s => s === 100).length,
        degraded: Object.values(scores).filter(s => s === 50).length,
        failed: Object.values(scores).filter(s => s === 0).length,
        total: Object.keys(scores).length,
      },
    };
  }

  private async getTotalRequests(): Promise<number> {
    try {
      // This would typically come from a metrics store or counter
      // For now, return a placeholder based on scan count
      const result = await this.dataSource.query(
        'SELECT COUNT(*) as total FROM scans'
      );
      return parseInt(result[0].total) || 0;
    } catch {
      return 0;
    }
  }
}