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
    
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Serve static files from uploads directory
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/',
    });

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Enable CORS
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [process.env.CLIENT_ORIGIN, 'https://ebs-web-981332637673.asia-southeast2.run.app'] 
      : [process.env.CLIENT_ORIGIN || 'http://localhost:3000', 'http://localhost:3001'];
    
    console.log('Allowed CORS origins:', allowedOrigins);
    
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
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
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
    }
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
}); 