import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateDatasetDto {
  @ApiProperty({ example: 'E-Waste Detection Dataset v2.0' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Improved dataset with corrected annotations' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Dataset configuration (splits, augmentation, etc.)',
    example: {
      train_split: 0.7,
      val_split: 0.2,
      test_split: 0.1
    },
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  configuration?: any;
} 