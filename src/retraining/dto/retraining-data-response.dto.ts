import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RetrainingType } from '../entities/retraining.entity';

export class RetrainingDataResponseDto {
  @ApiProperty({ example: 'retrain-123' })
  id: string;

  @ApiProperty({ enum: RetrainingType, example: 'correction' })
  type: RetrainingType;

  @ApiProperty({ example: 'Laptop' })
  original_category: string;

  @ApiPropertyOptional({ example: 'Desktop Computer' })
  corrected_category?: string;

  @ApiProperty({ example: 0.85 })
  original_confidence: number;

  @ApiPropertyOptional({ example: 200000 })
  corrected_value?: number;

  @ApiProperty({ example: false })
  is_processed: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  created_at: string;
} 