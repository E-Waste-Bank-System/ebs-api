import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  try {
    console.log('🚀 Starting EBS API...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', process.env.PORT || 8080);
    console.log('Database URL configured:', !!process.env.DATABASE_URL);
    
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Serve static files from uploads directory
    try {
      app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
      });
    } catch (error) {
      console.warn('⚠️ Could not set up static assets:', error.message);
    }

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Enable CORS
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          process.env.CLIENT_ORIGIN, 
          'https://ebs-web-981332637673.asia-southeast2.run.app',
          'http://localhost:3000' // Allow localhost for testing
        ] 
      : [
          process.env.CLIENT_ORIGIN || 'http://localhost:3000', 
          'http://localhost:3001'
        ];
    
    console.log('Allowed CORS origins:', allowedOrigins);
    
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));

    // Global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Health check endpoint
    app.getHttpAdapter().get('/health', (req: any, res: any) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
      });
    });

    // Basic info endpoint
    app.getHttpAdapter().get('/', (req: any, res: any) => {
      res.status(200).json({
        message: 'EBS API is running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          health: '/health',
          api: '/api/v1',
          docs: process.env.NODE_ENV !== 'production' ? '/api/docs' : 'disabled in production'
        }
      });
    });

    // Swagger documentation (only in development)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('E-Waste Backend Service API')
        .setDescription('API for E-Waste scanning and management system')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .build();
      
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
      console.log('📖 API Documentation available at /api/docs');
    }

    // Use port 8080 for Cloud Run, fallback to 3000 for local development
    const port = process.env.PORT || 8080;
    await app.listen(port, '0.0.0.0');
    
    console.log(`🚀 Application is running on port: ${port}`);
    console.log(`🌐 Health check available at: /health`);
    console.log(`📋 API info available at: /`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
    }
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    
    // In production, try to start a minimal server even if database fails
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Attempting to start minimal server...');
      try {
        const express = require('express');
        const app = express();
        
        app.get('/health', (req: any, res: any) => {
          res.status(503).json({
            status: 'error',
            message: 'Database connection failed',
            timestamp: new Date().toISOString(),
          });
        });
        
        app.get('/', (req: any, res: any) => {
          res.status(503).json({
            message: 'EBS API - Database connection failed',
            error: error.message,
          });
        });
        
        const port = process.env.PORT || 8080;
        app.listen(port, '0.0.0.0', () => {
          console.log(`🆘 Minimal server running on port ${port}`);
        });
      } catch (fallbackError) {
        console.error('❌ Failed to start minimal server:', fallbackError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
}); 