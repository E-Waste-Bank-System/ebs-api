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
          'http://localhost:3000',
          'https://ewastehub.netlify.app'	 // Allow localhost for testing
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
          docs: '/api/docs'
        }
      });
    });

    // Swagger documentation (enabled in all environments)
    const config = new DocumentBuilder()
      .setTitle('EBS API - E-Waste Detection System')
      .setDescription(`
# 🌟 EBS API Documentation

A comprehensive REST API for e-waste detection, management, and recycling education.

## 🔗 Live API
- **Production API:** https://ebs-api-981332637673.asia-southeast2.run.app
- **Frontend App:** https://ewastehub.netlify.app

## 🔐 Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
\`Authorization: Bearer <your-jwt-token>\`

## 📋 API Endpoints Organization

### 🏥 System Health
- Health monitoring and status checks

### 🔐 Authentication  
- User login, registration, and token management
- Google OAuth integration support

### 📚 Articles (Public)
- Public access to published educational content
- Search and filter capabilities

### 📱 E-Waste Scans (User)
- Image upload for AI-powered e-waste detection
- Scan history and results management

### 🔍 E-Waste Objects (User)
- View detected objects and details
- Object categorization and value estimates

### 📁 File Upload
- General file storage with Google Cloud Storage
- Dedicated article image upload endpoint

### 👨‍💼 Admin Endpoints
Administrative functions requiring ADMIN or SUPERADMIN roles:

- **Articles:** Content creation, editing, and management
- **Dashboard:** System analytics and overview statistics  
- **Objects:** Object validation, correction, and manual entry
- **Profiles:** User management and role assignment
- **Scans:** System-wide scan monitoring and management
- **Retraining & Datasets:** AI model training and dataset management

## 🚀 Getting Started

1. **Authentication:** Use \`POST /auth/login\` or \`POST /auth/token\` for Google OAuth
2. **Upload Image:** Use \`POST /scans\` to scan e-waste images
3. **View Results:** Use \`GET /scans/:id\` to see detected objects
4. **Browse Content:** Use \`GET /articles\` for educational articles

## 🔧 Recent Updates
- ✅ Fixed duplicate Swagger tags organization
- ✅ Added unique slug generation for articles  
- ✅ Enhanced article status validation
- ✅ Added dedicated article image upload endpoint
- ✅ Improved error handling and validation messages

## 📊 Response Formats
All responses follow consistent JSON structures with proper HTTP status codes and detailed error messages for debugging.
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
      .addTag('📱 E-Waste Scans', 'Image upload and AI-powered e-waste detection')
      .addTag('🔍 E-Waste Objects', 'Detected object details and management')
      .addTag('📁 File Upload', 'File storage and asset management via Google Cloud Storage')
      .addTag('👨‍💼 Admin - Articles', 'Content management and article administration (admin only)')
      .addTag('👨‍💼 Admin - Dashboard', 'System analytics and administrative overview (admin only)')
      .addTag('👨‍💼 Admin - Objects', 'Object validation and correction tools (admin only)')
      .addTag('👨‍💼 Admin - Profiles', 'User management and role assignment (admin only)')
      .addTag('👨‍💼 Admin - Scans', 'System-wide scan monitoring and management (admin only)')
      .addTag('👨‍💼 Admin - Retraining & Datasets', 'AI model training and dataset management (admin only)')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log('📖 API Documentation available at /api/docs');

    // Use port 8080 for Cloud Run, fallback to 3000 for local development
    const port = process.env.PORT || 8080;
    await app.listen(port, '0.0.0.0');
    
    console.log(`🚀 Application is running on port: ${port}`);
    console.log(`🌐 Health check available at: /health`);
    console.log(`📋 API info available at: /`);
    console.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
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