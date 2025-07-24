import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { RetrainingType } from '../entities/retraining.entity';

export class CreateRetrainingDataDto {
  @ApiProperty({ enum: RetrainingType, example: 'correction' })
  @IsEnum(RetrainingType)
  type: RetrainingType;

  @ApiProperty({ example: 'Laptop' })
  @IsString()
  original_category: string;

  @ApiPropertyOptional({ example: 'Desktop Computer' })
  @IsOptional()
  @IsString()
  corrected_category?: string;

  @ApiProperty({ example: 0.85 })
  @IsNumber()
  original_confidence: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @IsNumber()
  corrected_value?: number;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  object_id?: string;

  @ApiPropertyOptional({ example: 'Category correction for better accuracy' })
  @IsOptional()
  @IsString()
  notes?: string;
} 