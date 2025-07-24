import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DatasetResponseDto {
  @ApiProperty({ example: 'dataset-123' })
  id: string;

  @ApiProperty({ example: 'E-Waste Detection Dataset v2.0' })
  name: string;

  @ApiPropertyOptional({ example: 'Improved dataset with corrected annotations' })
  description?: string;

  @ApiProperty({ example: 'draft', enum: ['draft', 'annotating', 'ready', 'training', 'completed', 'failed'] })
  status: string;

  @ApiProperty({ example: 100 })
  total_images: number;

  @ApiProperty({ example: 80 })
  annotated_images: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  created_at: string;
} 