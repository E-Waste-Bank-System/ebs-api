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
import { HealthModule } from './health/health.module';

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
        
        if (!databaseUrl) {
          console.error('❌ DATABASE_URL is not configured');
          throw new Error('DATABASE_URL environment variable is required');
        }
        
        return {
          type: 'postgres',
          url: databaseUrl,
          entities: [Profile, Article, Scan, DetectedObject, RetrainingData],
          synchronize: false, // Disable synchronization to prevent schema conflicts
          logging: !isProduction ? ['error', 'warn', 'migration'] : ['error'], // Minimal logging in production
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          extra: {
            connectionLimit: 5,
            acquireConnectionTimeout: 30000,
            timeout: 30000,
            connectionTimeoutMillis: 30000,
            idleTimeoutMillis: 300000,
            max: 5,
            min: 1,
          },
          retryAttempts: 5,
          retryDelay: 5000,
          autoLoadEntities: true,
          keepConnectionAlive: true,
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
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 