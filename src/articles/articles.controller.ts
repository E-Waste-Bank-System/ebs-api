import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  ParseUUIDPipe,
  Request,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { ArticlesService } from './articles.service';
import { 
  CreateArticleDto, 
  UpdateArticleDto, 
  ArticleResponseDto, 
  ArticleListDto,
  ArticleQueryDto 
} from './dto/article.dto';
import { ArticleStatus } from './entities/article.entity';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UploadService } from '../upload/upload.service';
import { Auth } from '../common/decorators/auth.decorator';
import { AppLogger } from '../common/utils/logger.util';

@ApiTags('📚 Articles')
@Controller('articles')
export class ArticlesController {
  private readonly logger = AppLogger.getInstance('ArticlesController');

  constructor(private readonly articlesService: ArticlesService) {}

  @Public()
  @Get()
  @ApiOperation({ 
    summary: 'List published articles',
    description: 'Retrieve a paginated list of published articles available to the public'
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page' })
  @ApiQuery({ name: 'tag', required: false, example: 'recycling', description: 'Filter by tag' })
  @ApiQuery({ name: 'search', required: false, example: 'e-waste', description: 'Search in title and content' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved published articles',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ArticleListDto' }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 25 },
            pages: { type: 'number', example: 3 }
          }
        }
      },
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'The Ultimate Guide to E-Waste Recycling',
            slug: 'ultimate-guide-e-waste-recycling',
            excerpt: 'Learn about proper e-waste disposal and recycling methods.',
            featured_image: 'https://example.com/image.jpg',
            status: 'published',
            tags: ['recycling', 'environment'],
            view_count: 123,
            created_at: '2024-01-15T10:30:00.000Z',
            published_at: '2024-01-16T10:30:00.000Z'
          }
        ],
        meta: { page: 1, limit: 10, total: 1, pages: 1 }
      }
    }
  })
  async findAll(@Query() query: ArticleQueryDto): Promise<PaginatedResponse<ArticleListDto>> {
    this.logger.logDebug(`Public articles requested with query: ${JSON.stringify(query)}`);
    const result = await this.articlesService.findAllPublic(query);
    
    return {
      data: result.data.map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        featured_image: article.featured_image,
        status: article.status,
        tags: article.tags,
        view_count: article.view_count,
        created_at: article.created_at,
        published_at: article.published_at,
      })),
      meta: result.meta,
    };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ 
    summary: 'Get article by slug',
    description: 'Retrieve a specific published article by its URL slug'
  })
  @ApiParam({ 
    name: 'slug', 
    description: 'Article URL slug',
    example: 'ultimate-guide-e-waste-recycling'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved article',
    type: ArticleResponseDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'The Ultimate Guide to E-Waste Recycling',
      slug: 'ultimate-guide-e-waste-recycling',
      content: { blocks: [{ type: 'paragraph', data: { text: 'E-waste recycling is important...' } }] },
      excerpt: 'Learn about proper e-waste disposal and recycling methods.',
      featured_image: 'https://example.com/image.jpg',
      status: 'published',
      tags: ['recycling', 'environment'],
      view_count: 123,
      created_at: '2024-01-15T10:30:00.000Z',
      updated_at: '2024-01-16T10:30:00.000Z',
      published_at: '2024-01-16T10:30:00.000Z'
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto,
    example: {
      statusCode: 404,
      message: 'Article not found',
      error: 'Not Found',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/articles/unknown-slug'
    }
  })
  async findOneBySlug(@Param('slug') slug: string): Promise<ArticleResponseDto> {
    this.logger.logDebug(`Article requested by slug: ${slug}`);
    const article = await this.articlesService.findOneBySlug(slug);
    
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      featured_image: article.featured_image,
      status: article.status,
      tags: article.tags,
      view_count: article.view_count,
      created_at: article.created_at,
      updated_at: article.updated_at,
      published_at: article.published_at,
    };
  }
}

@ApiTags('👨‍💼 Admin')
@Controller('admin/articles')
export class AdminArticlesController {
  private readonly logger = AppLogger.getInstance('AdminArticlesController');

  constructor(
    private readonly articlesService: ArticlesService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'List all articles (admin)',
    description: 'Retrieve all articles including drafts and archived content'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and content' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all articles',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ArticleResponseDto' }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 2 },
            pages: { type: 'number', example: 1 }
          }
        }
      },
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Ultimate Guide to E-Waste Recycling',
            slug: 'ultimate-guide-e-waste-recycling',
            content: { blocks: [{ type: 'paragraph', data: { text: 'E-waste recycling is important...' } }] },
            excerpt: 'Learn everything about e-waste recycling...',
            featured_image: 'https://storage.googleapis.com/ebs-storage/articles/featured-image.jpg',
            status: 'draft',
            tags: ['recycling', 'e-waste'],
            view_count: 0,
            meta_title: 'SEO Title for E-Waste Guide',
            meta_description: 'SEO description for the article',
            is_featured: false,
            created_at: '2024-01-15T10:30:00.000Z',
            updated_at: '2024-01-15T10:30:00.000Z',
            published_at: null,
            author: {
              id: 'admin-uuid',
              email: 'admin@ebs.com',
              full_name: 'Admin User',
              avatar_url: 'https://example.com/avatar.jpg'
            }
          }
        ],
        meta: { page: 1, limit: 20, total: 1, pages: 1 }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles'
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
    type: ErrorResponseDto,
    example: {
      statusCode: 403,
      message: 'Insufficient permissions',
      error: 'Forbidden',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles'
    }
  })
  async findAll(@Query() query: ArticleQueryDto): Promise<PaginatedResponse<ArticleResponseDto>> {
    this.logger.logDebug(`Admin articles requested with query: ${JSON.stringify(query)}`);
    const result = await this.articlesService.findAll(query);
    
    return {
      data: result.data.map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        featured_image: article.featured_image,
        status: article.status,
        tags: article.tags,
        view_count: article.view_count,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        is_featured: article.is_featured,
        created_at: article.created_at,
        updated_at: article.updated_at,
        published_at: article.published_at,
        author: article.author ? {
          id: article.author.id,
          email: article.author.email,
          full_name: article.author.full_name,
          avatar_url: article.author.avatar_url,
        } : undefined,
      })),
      meta: result.meta,
    };
  }

  @Post()
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('featured_image'))
  @ApiOperation({ 
    summary: 'Create new article',
    description: `
      Create a new article with optional featured image upload.
      \n      **Content Format:**
      - Supports EditorJS JSON format for rich content
      - Plain text content also supported
      - HTML content can be embedded
      \n      **Image Upload:**
      - Featured image is optional
      - Supports JPG, PNG, WebP formats
      - Max file size: 5MB
      - Automatically optimized and stored in cloud storage
    `
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Article creation data with optional image',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Ultimate Guide to E-Waste Recycling' },
        content: { type: 'string', description: 'Article content (EditorJS JSON or plain text)', example: '{"blocks":[{"type":"paragraph","data":{"text":"E-waste recycling is important..."}}]}' },
        excerpt: { type: 'string', example: 'Learn everything about e-waste recycling...' },
        status: { enum: ['draft', 'published', 'archived'], example: 'draft' },
        tags: { type: 'array', items: { type: 'string' }, example: ['recycling', 'e-waste'] },
        meta_title: { type: 'string', example: 'SEO Title for E-Waste Guide' },
        meta_description: { type: 'string', example: 'SEO description for the article' },
        is_featured: { type: 'boolean', example: false },
        featured_image: {
          type: 'string',
          format: 'binary',
          description: 'Featured image file (optional)'
        }
      },
      required: ['title', 'content']
    },
    examples: {
      json: {
        summary: 'JSON content',
        value: {
          title: 'Ultimate Guide to E-Waste Recycling',
          content: '{"blocks":[{"type":"paragraph","data":{"text":"E-waste recycling is important..."}}]}',
          excerpt: 'Learn everything about e-waste recycling...',
          status: 'draft',
          tags: ['recycling', 'e-waste'],
          meta_title: 'SEO Title for E-Waste Guide',
          meta_description: 'SEO description for the article',
          is_featured: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Article created successfully',
    type: ArticleResponseDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Ultimate Guide to E-Waste Recycling',
      slug: 'ultimate-guide-e-waste-recycling',
      content: { blocks: [{ type: 'paragraph', data: { text: 'E-waste recycling is important...' } }] },
      excerpt: 'Learn everything about e-waste recycling...',
      featured_image: 'https://storage.googleapis.com/ebs-storage/articles/featured-image.jpg',
      status: 'draft',
      tags: ['recycling', 'e-waste'],
      view_count: 0,
      meta_title: 'SEO Title for E-Waste Guide',
      meta_description: 'SEO description for the article',
      is_featured: false,
      created_at: '2024-01-15T10:30:00.000Z',
      updated_at: '2024-01-15T10:30:00.000Z',
      published_at: null,
      author: {
        id: 'admin-uuid',
        email: 'admin@ebs.com',
        full_name: 'Admin User',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - invalid data or missing required fields',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'Invalid article data',
      error: 'Bad Request',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles'
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - JWT token required',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles'
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - admin role required',
    type: ErrorResponseDto,
    example: {
      statusCode: 403,
      message: 'Insufficient permissions',
      error: 'Forbidden',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles'
    }
  })
  async create(
    @Body() createArticleDto: any, // Use any to handle both JSON and form data
    @UploadedFile() file: any,
    @GetUser() user: any,
  ): Promise<ArticleResponseDto> {
    this.logger.logDebug(`Article creation requested by user: ${user.id}`);
    
    try {
      // Handle featured image upload if provided
      let featuredImageUrl: string | undefined;
      if (file) {
        this.logger.logDebug(`Processing featured image upload: ${file.originalname}`);
        featuredImageUrl = await this.uploadService.uploadFile(file, 'articles');
      }

      // Transform and validate the DTO
      const dto = plainToClass(CreateArticleDto, {
        ...createArticleDto,
        featured_image: featuredImageUrl,
        author_id: user.id,
      });

      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.logError('Article creation validation failed:', errors);
        throw new BadRequestException('Invalid article data');
      }

      const article = await this.articlesService.create(dto, user.id);
      this.logger.logInfo(`Article created successfully: ${article.id}`);
      
      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        featured_image: article.featured_image,
        status: article.status,
        tags: article.tags,
        view_count: article.view_count,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        is_featured: article.is_featured,
        created_at: article.created_at,
        updated_at: article.updated_at,
        published_at: article.published_at,
        author: article.author ? {
          id: article.author.id,
          email: article.author.email,
          full_name: article.author.full_name,
          avatar_url: article.author.avatar_url,
        } : undefined,
      };
    } catch (error) {
      this.logger.logError('Article creation failed:', error);
      throw error;
    }
  }

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Get article by ID (admin)',
    description: 'Retrieve a specific article by ID with full admin access'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Article UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved article',
    type: ArticleResponseDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Ultimate Guide to E-Waste Recycling',
      slug: 'ultimate-guide-e-waste-recycling',
      content: { blocks: [{ type: 'paragraph', data: { text: 'E-waste recycling is important...' } }] },
      excerpt: 'Learn everything about e-waste recycling...',
      featured_image: 'https://storage.googleapis.com/ebs-storage/articles/featured-image.jpg',
      status: 'draft',
      tags: ['recycling', 'e-waste'],
      view_count: 0,
      meta_title: 'SEO Title for E-Waste Guide',
      meta_description: 'SEO description for the article',
      is_featured: false,
      created_at: '2024-01-15T10:30:00.000Z',
      updated_at: '2024-01-15T10:30:00.000Z',
      published_at: null,
      author: {
        id: 'admin-uuid',
        email: 'admin@ebs.com',
        full_name: 'Admin User',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto,
    example: {
      statusCode: 404,
      message: 'Article not found',
      error: 'Not Found',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles/unknown-id'
    }
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ArticleResponseDto> {
    this.logger.logDebug(`Admin article requested by ID: ${id}`);
    const article = await this.articlesService.findOne(id);
    
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      featured_image: article.featured_image,
      status: article.status,
      tags: article.tags,
      view_count: article.view_count,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      is_featured: article.is_featured,
      created_at: article.created_at,
      updated_at: article.updated_at,
      published_at: article.published_at,
      author: article.author ? {
        id: article.author.id,
        email: article.author.email,
        full_name: article.author.full_name,
        avatar_url: article.author.avatar_url,
      } : undefined,
    };
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Update article',
    description: 'Update an existing article with new data'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Article UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ type: UpdateArticleDto })
  @ApiResponse({
    status: 200,
    description: 'Article updated successfully',
    type: ArticleResponseDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Updated Guide to E-Waste Recycling',
      slug: 'updated-guide-e-waste-recycling',
      content: { blocks: [{ type: 'paragraph', data: { text: 'Updated content...' } }] },
      excerpt: 'Updated excerpt...',
      featured_image: 'https://storage.googleapis.com/ebs-storage/articles/featured-image.jpg',
      status: 'published',
      tags: ['recycling', 'e-waste'],
      view_count: 1,
      meta_title: 'Updated SEO Title',
      meta_description: 'Updated SEO description',
      is_featured: true,
      created_at: '2024-01-15T10:30:00.000Z',
      updated_at: '2024-01-16T10:30:00.000Z',
      published_at: '2024-01-16T10:30:00.000Z',
      author: {
        id: 'admin-uuid',
        email: 'admin@ebs.com',
        full_name: 'Admin User',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto,
    example: {
      statusCode: 404,
      message: 'Article not found',
      error: 'Not Found',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles/unknown-id'
    }
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleResponseDto> {
    this.logger.logDebug(`Article update requested for ID: ${id}`);
    const article = await this.articlesService.update(id, updateArticleDto);
    
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      featured_image: article.featured_image,
      status: article.status,
      tags: article.tags,
      view_count: article.view_count,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      is_featured: article.is_featured,
      created_at: article.created_at,
      updated_at: article.updated_at,
      published_at: article.published_at,
      author: article.author ? {
        id: article.author.id,
        email: article.author.email,
        full_name: article.author.full_name,
        avatar_url: article.author.avatar_url,
      } : undefined,
    };
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Delete article',
    description: 'Permanently delete an article and all associated data'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Article UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Article deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Article deleted successfully' }
      }
    },
    example: { message: 'Article deleted successfully' }
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto,
    example: {
      statusCode: 404,
      message: 'Article not found',
      error: 'Not Found',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/admin/articles/unknown-id'
    }
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    this.logger.logDebug(`Article deletion requested for ID: ${id}`);
    await this.articlesService.remove(id);
    this.logger.logInfo(`Article deleted successfully: ${id}`);
    return { message: 'Article deleted successfully' };
  }
} 