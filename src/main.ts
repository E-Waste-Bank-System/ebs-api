import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppLogger } from './common/utils/logger.util';

async function bootstrap() {
  const logger = AppLogger.getInstance('Bootstrap');
  
  try {
    logger.logInfo('🚀 Starting EBS API...');
    logger.logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.logInfo(`Port: ${process.env.PORT || 8080}`);
    logger.logInfo(`Database URL configured: ${!!process.env.DATABASE_URL}`);
    
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Serve static files from uploads directory
    try {
      app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
      });
    } catch (error) {
      logger.logWarn('⚠️ Could not set up static assets:', error.message);
    }

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Enable CORS
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          process.env.CLIENT_ORIGIN, 
          'https://ebs-web-981332637673.asia-southeast2.run.app',
          'http://localhost:3000',
          'https://ewaste-hub.netlify.app'
        ] 
      : [
          process.env.CLIENT_ORIGIN || 'http://localhost:3000', 
          'http://localhost:3001'
        ];
    
    logger.logInfo(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
    
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
          docs: '/api/docs'
        }
      });
    });

    // Swagger documentation (enabled in all environments)
    const config = new DocumentBuilder()
      .setTitle('EBS API - E-Waste Detection System')
      .setDescription(`
A comprehensive REST API for e-waste detection, management, and recycling education.

## Overview
This API provides endpoints for:
- **E-Waste Detection**: AI-powered scanning and object detection
- **Content Management**: Educational articles and resources
- **User Management**: Authentication and profile management
- **AI Training**: Model retraining and dataset management
- **Administration**: System monitoring and analytics

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting
API requests are rate-limited to ensure fair usage. Limits vary by endpoint and user role.

## Error Handling
All endpoints return consistent error responses with appropriate HTTP status codes.
`)
      .setVersion('2.0.0')
      .setContact(
        'EBS Development Team',
        'https://ewastehub.netlify.app',
        'support@ebs.com'
      )
      .setLicense('Proprietary', 'https://ewastehub.netlify.app/license')
      .addServer('https://ebs-api-981332637673.asia-southeast2.run.app', 'Production API')
      .addServer('http://localhost:8080', 'Development API')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token for authentication',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('🏥 Health', 'System health monitoring and status checks')
      .addTag('🔐 Authentication', 'User authentication, login, and token management')
      .addTag('📚 Articles', 'Public articles and educational content (no auth required)')
      .addTag('📸 Scans', 'Image upload and AI-powered e-waste detection')
      .addTag('🔍 Objects', 'Detected object details and management')
      .addTag('📁 Upload', 'File storage and asset management')
      .addTag('🤖 AI Training', 'AI model training and dataset management')
      .addTag('👨‍💼 Admin', 'Administrative functions and system management')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.logInfo('📖 API Documentation available at /api/docs');

    // Use port 8080 for Cloud Run, fallback to 3000 for local development
    const port = process.env.PORT || 8080;
    await app.listen(port, '0.0.0.0');
    
    logger.logInfo(`🚀 Application is running on port: ${port}`);
    logger.logInfo(`🌐 Health check available at: /health`);
    logger.logInfo(`📋 API info available at: /`);
    logger.logInfo(`📖 API Documentation: http://localhost:${port}/api/docs`);
  } catch (error) {
    logger.logError('❌ Failed to start application:', error);
    
    // In production, try to start a minimal server even if database fails
    if (process.env.NODE_ENV === 'production') {
      logger.logInfo('🔄 Attempting to start minimal server...');
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
          logger.logInfo(`🆘 Minimal server running on port ${port}`);
        });
      } catch (fallbackError) {
        logger.logError('❌ Failed to start minimal server:', fallbackError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

bootstrap().catch((error) => {
  const logger = AppLogger.getInstance('Bootstrap');
  logger.logError('❌ Bootstrap failed:', error);
  process.exit(1);
}); 