import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ArticlesModule } from './articles/articles.module';
import { ScansModule } from './scans/scans.module';
import { ObjectsModule } from './objects/objects.module';
import { RetrainingModule } from './retraining/retraining.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadModule } from './upload/upload.module';
import { SupabaseModule } from './supabase/supabase.module';

import { Profile } from './profiles/entities/profile.entity';
import { Article } from './articles/entities/article.entity';
import { Scan } from './scans/entities/scan.entity';
import { DetectedObject } from './objects/entities/object.entity';
import { RetrainingData } from './retraining/entities/retraining.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database - Supabase PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get('DATABASE_URL');
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        console.log('Database configuration:');
        console.log('- Environment:', configService.get('NODE_ENV'));
        console.log('- Database URL configured:', !!databaseUrl);
        console.log('- Production mode:', isProduction);
        
        return {
          type: 'postgres',
          url: databaseUrl,
          entities: [Profile, Article, Scan, DetectedObject, RetrainingData],
          synchronize: false, // Disable synchronization to prevent schema conflicts
          logging: !isProduction, // Only log in development
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          extra: {
            connectionLimit: 10,
            acquireConnectionTimeout: 60000,
            timeout: 60000,
            connectionTimeoutMillis: 60000,
            idleTimeoutMillis: 600000,
          },
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('THROTTLE_TTL') || 60000,
          limit: configService.get('THROTTLE_LIMIT') || 100,
        },
      ],
      inject: [ConfigService],
    }),

    // Authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),

    // Application modules
    SupabaseModule,
    AuthModule,
    ProfilesModule,
    ArticlesModule,
    ScansModule,
    ObjectsModule,
    RetrainingModule,
    DashboardModule,
    UploadModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 