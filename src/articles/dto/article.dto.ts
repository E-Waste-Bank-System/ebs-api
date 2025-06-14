import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsObject, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ArticleStatus } from '../entities/article.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateArticleDto {
  @ApiProperty({
    description: 'Article title',
    example: 'The Ultimate Guide to E-Waste Recycling',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Article content in EditorJS JSON format or HTML/Markdown string',
    example: '{"blocks":[{"type":"paragraph","data":{"text":"E-waste recycling is important..."}}]}',
  })
  @IsOptional()
  @Transform(({ value }) => {
    console.log('DTO Transform - Input value:', value, 'Type:', typeof value);
    
    // If it's a string, try to parse it as JSON for EditorJS format
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        console.log('DTO Transform - Parsed JSON:', parsed);
        return parsed;
      } catch {
        // If parsing fails, return as string (for HTML/Markdown content)
        console.log('DTO Transform - Returning as string');
        return value;
      }
    }
    
    // If it's already an object or undefined, return as-is
    console.log('DTO Transform - Returning as-is');
    return value;
  })
  content: any;

  @ApiPropertyOptional({
    description: 'Short excerpt/summary',
    example: 'Learn about proper e-waste disposal and recycling methods.',
  })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'Featured image URL',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsString()
  featured_image?: string;

  @ApiPropertyOptional({
    description: 'Article tags',
    example: ['recycling', 'environment', 'technology'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: ArticleStatus,
    description: 'Article status',
    default: ArticleStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus = ArticleStatus.DRAFT;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

export class ArticleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  content: any;

  @ApiPropertyOptional()
  excerpt?: string;

  @ApiPropertyOptional()
  featured_image?: string;

  @ApiProperty({ enum: ArticleStatus })
  status: ArticleStatus;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  view_count: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiPropertyOptional()
  published_at?: Date;
}

export class ArticleListDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  excerpt?: string;

  @ApiPropertyOptional()
  featured_image?: string;

  @ApiProperty({ enum: ArticleStatus })
  status: ArticleStatus;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  view_count: number;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  published_at?: Date;
}

export class ArticleQueryDto extends PaginationDto {
  @ApiPropertyOptional({ 
    enum: ArticleStatus,
    description: 'Filter by status' 
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: 'Filter by tag',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Search in title and content',
  })
  @IsOptional()
  @IsString()
  search?: string;
} 