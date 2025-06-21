import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
  Request,
  Logger,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UploadService } from '../upload/upload.service';

@ApiTags('📚 Articles')
@Controller('articles')
export class ArticlesController {
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
      }
    }
  })
  async findAll(@Query() query: ArticleQueryDto): Promise<PaginatedResponse<ArticleListDto>> {
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
    type: ArticleResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto
  })
  async findOneBySlug(@Param('slug') slug: string): Promise<ArticleResponseDto> {
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

@ApiTags('👨‍💼 Admin - Articles')
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminArticlesController {
  private readonly logger = new Logger(AdminArticlesController.name);

  constructor(
    private readonly articlesService: ArticlesService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
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
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
    type: ErrorResponseDto
  })
  async findAll(@Query() query: ArticleQueryDto): Promise<PaginatedResponse<ArticleResponseDto>> {
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
        created_at: article.created_at,
        updated_at: article.updated_at,
        published_at: article.published_at,
      })),
      meta: result.meta,
    };
  }

  @Post()
  @UseInterceptors(FileInterceptor('featured_image'))
  @ApiOperation({ 
    summary: 'Create new article',
    description: `
      Create a new article with optional featured image upload.
      
      **Features:**
      - Accepts article data as JSON or form fields
      - Optional featured image upload via multipart/form-data
      - Automatic slug generation with uniqueness check
      - EditorJS content structure support
      - Comprehensive validation and error handling
      
      **Content Structure:**
      The content field accepts EditorJS format with blocks like paragraph, header, list, etc.
    `
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description: 'Article data with optional featured image',
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Article title',
          example: 'Complete Guide to E-Waste Recycling'
        },
        content: {
          type: 'string',
          description: 'Article content in EditorJS JSON format (as string)',
          example: '{"blocks":[{"type":"paragraph","data":{"text":"Content here..."}}]}'
        },
        excerpt: {
          type: 'string',
          description: 'Brief article summary',
          example: 'Learn about proper e-waste disposal methods.'
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags',
          example: 'recycling,environment,technology'
        },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
          description: 'Article publication status',
          example: 'draft'
        },
        meta_title: {
          type: 'string',
          description: 'SEO meta title',
          example: 'E-Waste Recycling Guide - Complete Tutorial'
        },
        meta_description: {
          type: 'string',
          description: 'SEO meta description',
          example: 'Comprehensive guide to e-waste recycling and disposal.'
        },
        featured_image: {
          type: 'string',
          format: 'binary',
          description: 'Optional featured image file'
        }
      },
      required: ['title', 'content']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Article created successfully',
    type: ArticleResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error or invalid content format' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions' 
  })
  async create(
    @Body() createArticleDto: any, // Use any to handle both JSON and form data
    @UploadedFile() file: any,
    @GetUser() user: any,
  ): Promise<ArticleResponseDto> {
    try {
      this.logger.log(`Create article request - File present: ${!!file}`);
      this.logger.log(`Create article request - Body keys: ${Object.keys(createArticleDto)}`);
      this.logger.log(`Create article request - Body: ${JSON.stringify(createArticleDto)}`);
      
      // Handle both multipart form data and JSON requests
      let articleData: CreateArticleDto;
      
      if (file || createArticleDto.title) {
        // If file is present OR we have form data, we're dealing with multipart/form-data
        // Parse form fields into proper DTO structure
        
        let parsedContent = createArticleDto.content;
        if (typeof createArticleDto.content === 'string') {
          try {
            parsedContent = JSON.parse(createArticleDto.content);
            this.logger.log(`Successfully parsed content JSON`);
          } catch (parseError) {
            this.logger.error(`Failed to parse content JSON: ${parseError.message}`);
            this.logger.error(`Content value: ${createArticleDto.content}`);
            throw new BadRequestException('Invalid JSON format in content field');
          }
        }
        
        articleData = {
          title: createArticleDto.title,
          content: parsedContent,
          excerpt: createArticleDto.excerpt,
          tags: typeof createArticleDto.tags === 'string' 
            ? createArticleDto.tags.split(',').map(tag => tag.trim())
            : createArticleDto.tags,
          status: createArticleDto.status || ArticleStatus.DRAFT,
          meta_title: createArticleDto.meta_title,
          meta_description: createArticleDto.meta_description,
        };

        // Upload the featured image if provided
        if (file) {
          this.logger.log(`Uploading file: ${file.originalname}, size: ${file.size}`);
          const uploadedUrl = await this.uploadService.uploadFile(file, 'articles/featured-images');
          articleData.featured_image = uploadedUrl;
          this.logger.log(`File uploaded successfully: ${uploadedUrl}`);
        }
      } else {
        // Regular JSON request
        articleData = createArticleDto;
      }

      this.logger.log(`Parsed article data: ${JSON.stringify(articleData)}`);

      // Validate the parsed data
      const validatedData = plainToClass(CreateArticleDto, articleData);
      const errors = await validate(validatedData);
      
      if (errors.length > 0) {
        this.logger.error(`Validation errors: ${JSON.stringify(errors.map(error => ({
          property: error.property,
          value: error.value,
          constraints: error.constraints
        })))}`);
        
        throw new BadRequestException({
          message: 'Validation failed',
          errors: errors.map(error => ({
            property: error.property,
            value: error.value,
            constraints: error.constraints
          }))
        });
      }

      const article = await this.articlesService.create(validatedData, user.id);
      
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
        is_featured: article.is_featured,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        published_at: article.published_at,
        created_at: article.created_at,
        updated_at: article.updated_at,
        author: {
          id: article.author.id,
          email: article.author.email,
          name: article.author.full_name || article.author.email,
          role: article.author.role,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create article: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create article');
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get article by ID (admin)',
    description: 'Retrieve any article by ID including drafts and archived content'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Article UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved article',
    type: ArticleResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ArticleResponseDto> {
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
      created_at: article.created_at,
      updated_at: article.updated_at,
      published_at: article.published_at,
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update article',
    description: 'Update article content, status, or metadata'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Article UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Article updated successfully',
    type: ArticleResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input data',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleResponseDto> {
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
      created_at: article.created_at,
      updated_at: article.updated_at,
      published_at: article.published_at,
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete article',
    description: 'Soft delete an article (can be recovered by admins)'
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
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
    type: ErrorResponseDto
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.articlesService.remove(id);
    return { message: 'Article deleted successfully' };
  }
} 