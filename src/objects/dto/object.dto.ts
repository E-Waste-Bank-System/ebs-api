import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateObjectDto {
  @ApiPropertyOptional({
    description: 'Validation notes',
    example: 'Category and price verified'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Corrected category if original AI detection was wrong',
    example: 'Laptop'
  })
  @IsOptional()
  @IsString()
  corrected_category?: string;

  @ApiPropertyOptional({
    description: 'Corrected estimated value if original AI estimation was wrong',
    example: 150000
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  corrected_value?: number;
}

export class CreateObjectDto {
  @ApiProperty({
    description: 'Object name/title',
    example: 'Old Laptop'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Object category',
    example: 'Laptop'
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Estimated value in IDR',
    example: 150000
  })
  @IsNumber()
  @Type(() => Number)
  estimated_value: number;

  @ApiProperty({
    description: 'Scan ID this object belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  scan_id: string;

  @ApiPropertyOptional({
    description: 'Object description',
    example: 'Manual entry for missed detection'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Risk level (1-10)',
    example: 3
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  risk_level?: number;

  @ApiPropertyOptional({
    description: 'Damage level (1-10)',
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  damage_level?: number;
} 