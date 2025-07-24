import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsEnum } from 'class-validator';
import { AnnotationStatus } from '../entities/retraining.entity';

class AnnotationDto {
  @ApiProperty({ example: 'anno-123' })
  id: string;

  @ApiProperty({ example: 'Laptop' })
  category: string;

  @ApiProperty({
    example: { x: 10, y: 20, width: 100, height: 80 },
    type: 'object',
  })
  bbox: { x: number; y: number; width: number; height: number };

  @ApiProperty({ example: 0.95 })
  confidence: number;

  @ApiProperty({ example: true })
  is_ai_generated: boolean;

  @ApiProperty({ example: true })
  verified: boolean;
}

export class UpdateAnnotationTaskDto {
  @ApiPropertyOptional({ type: [AnnotationDto] })
  @IsOptional()
  @IsArray()
  annotations?: AnnotationDto[];

  @ApiPropertyOptional({ enum: AnnotationStatus, example: 'completed' })
  @IsOptional()
  @IsEnum(AnnotationStatus)
  status?: AnnotationStatus;

  @ApiPropertyOptional({ example: 'Reviewed and corrected' })
  @IsOptional()
  @IsString()
  notes?: string;
} 