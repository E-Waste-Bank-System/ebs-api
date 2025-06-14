import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ScanStatus } from '../entities/scan.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateScanDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'E-waste image file for AI scanning',
    example: 'e-waste-image.jpg'
  })
  file: any;

  @ApiPropertyOptional({
    description: 'Original filename (optional - will use uploaded filename if not provided)',
    example: 'e-waste-scan.jpg',
  })
  @IsOptional()
  @IsString()
  original_filename?: string;
}

// AI Service Response DTOs
export class AIPredictionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  regression_result: number;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [Number] })
  bbox: number[];

  @ApiProperty({ type: [String] })
  suggestion: string[];

  @ApiProperty()
  risk_lvl: number;

  @ApiProperty()
  damage_level: number;

  @ApiProperty()
  detection_source: string;
}

export class AIResponseDto {
  @ApiProperty({ type: [AIPredictionDto] })
  predictions: AIPredictionDto[];
}

export class ScanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  image_url: string;

  @ApiProperty({ enum: ScanStatus })
  status: ScanStatus;

  @ApiProperty()
  objects_count: number;

  @ApiProperty()
  total_estimated_value: number;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  error_message?: string;
}

export class ScanDetailDto extends ScanResponseDto {
  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional()
  user?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    role: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  };

  @ApiProperty()
  objects: any[];

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class ScanListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ 
    enum: ScanStatus,
    description: 'Filter by scan status' 
  })
  @IsOptional()
  @IsEnum(ScanStatus)
  status?: ScanStatus;

  @ApiPropertyOptional({
    description: 'Filter by user ID (admin only)',
  })
  @IsOptional()
  @IsString()
  user_id?: string;
} 