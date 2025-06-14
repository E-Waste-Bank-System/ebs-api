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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ArticlesService } from './articles.service';
import { 
  CreateArticleDto, 
  UpdateArticleDto, 
  ArticleResponseDto, 
  ArticleListDto,
  ArticleQueryDto 
} from './dto/article.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all published articles (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'List of published articles',
    type: [ArticleListDto],
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
  @ApiOperation({ summary: 'Get single article by slug' })
  @ApiResponse({
    status: 200,
    description: 'Article details',
    type: ArticleResponseDto,
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

@ApiTags('Admin - Articles')
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminArticlesController {
  private readonly logger = new Logger(AdminArticlesController.name);

  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin view of all articles' })
  @ApiResponse({
    status: 200,
    description: 'All articles including drafts',
    type: [ArticleResponseDto],
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
  @ApiOperation({ summary: 'Create new article' })
  @ApiResponse({
    status: 201,
    description: 'Article created successfully',
    type: ArticleResponseDto,
  })
  async create(
    @Body() createArticleDto: CreateArticleDto,
    @Request() req: any,
  ): Promise<ArticleResponseDto> {
    this.logger.log(`Received create request with body keys: ${Object.keys(createArticleDto)}`);
    this.logger.log(`Content field type: ${typeof createArticleDto.content}, value: ${createArticleDto.content}`);
    this.logger.log(`User object keys: ${Object.keys(req.user)}`);
    this.logger.log(`User object: ${JSON.stringify(req.user)}`);
    
    // Extract user ID from JWT payload - the 'sub' field contains the user ID
    const authorId = req.user.sub || req.user.id || req.user.profileId;
    this.logger.log(`Using authorId: ${authorId}`);
    
    const article = await this.articlesService.create(createArticleDto, authorId);
    
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

  @Get(':id')
  @ApiOperation({ summary: 'Get article by ID (admin view)' })
  @ApiResponse({
    status: 200,
    description: 'Article details',
    type: ArticleResponseDto,
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
  @ApiOperation({ summary: 'Edit article (title, content, status)' })
  @ApiResponse({
    status: 200,
    description: 'Article updated successfully',
    type: ArticleResponseDto,
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
  @ApiOperation({ summary: 'Soft delete article' })
  @ApiResponse({
    status: 200,
    description: 'Article deleted successfully',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.articlesService.remove(id);
    return { message: 'Article deleted successfully' };
  }
} 