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
  @ValidateIf((o) => o.content !== undefined)
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
  @Transform(({ value }) => {
    // Handle both string and array inputs
    if (typeof value === 'string') {
      // Split comma-separated string into array
      return value.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: ArticleStatus,
    description: 'Article status',
    default: ArticleStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ArticleStatus, {
    message: 'status must be one of the following values: draft, published, archived'
  })
  @Transform(({ value }) => {
    // Handle string inputs and convert to proper enum values
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (Object.values(ArticleStatus).includes(lowerValue as ArticleStatus)) {
        return lowerValue as ArticleStatus;
      }
    }
    return value;
  })
  @ValidateIf((o) => o.status !== undefined)
  status?: ArticleStatus = ArticleStatus.DRAFT;

  @ApiPropertyOptional({
    description: 'SEO meta title',
    example: 'E-Waste Recycling Guide - Complete Tutorial',
  })
  @IsOptional()
  @IsString()
  meta_title?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description',
    example: 'Comprehensive guide to e-waste recycling and disposal.',
  })
  @IsOptional()
  @IsString()
  meta_description?: string;

  @ApiPropertyOptional({
    description: 'Author ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  author_id?: string;
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

  @ApiPropertyOptional()
  is_featured?: boolean;

  @ApiPropertyOptional()
  meta_title?: string;

  @ApiPropertyOptional()
  meta_description?: string;

  @ApiPropertyOptional({
    description: 'Article author information',
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      full_name: { type: 'string' },
      avatar_url: { type: 'string' }
    }
  })
  author?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  };
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