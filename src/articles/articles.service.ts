import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleStatus } from './entities/article.entity';
import { CreateArticleDto, UpdateArticleDto, ArticleQueryDto } from './dto/article.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async create(createArticleDto: CreateArticleDto, authorId: string): Promise<Article> {
    const slug = this.generateSlug(createArticleDto.title);
    
    this.logger.log(`Creating article with content type: ${typeof createArticleDto.content}`);
    
    // Safe logging with null check
    if (createArticleDto.content) {
      try {
        const contentStr = JSON.stringify(createArticleDto.content);
        this.logger.log(`Content preview: ${contentStr.substring(0, 200)}...`);
      } catch (error) {
        this.logger.log(`Content preview: [Unable to stringify content]`);
      }
    } else {
      this.logger.log(`Content preview: No content provided`);
    }
    
    // Ensure content is not undefined - provide default EditorJS structure
    const content = createArticleDto.content || {
      blocks: [
        {
          type: 'paragraph',
          data: {
            text: ''
          }
        }
      ]
    };
    
    const article = this.articleRepository.create({
      ...createArticleDto,
      content,
      slug,
      author_id: authorId,
      published_at: createArticleDto.status === ArticleStatus.PUBLISHED ? new Date() : null,
    });

    const savedArticle = await this.articleRepository.save(article);
    
    this.logger.log(`Article saved with content type: ${typeof savedArticle.content}`);
    return savedArticle;
  }

  async findAllPublic(query: ArticleQueryDto): Promise<PaginatedResponse<Article>> {
    return this.findAll({ ...query, status: ArticleStatus.PUBLISHED });
  }

  async findAll(query: ArticleQueryDto): Promise<PaginatedResponse<Article>> {
    const { page = 1, limit = 20, status, tag, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.articleRepository.createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author');

    if (status) {
      queryBuilder.andWhere('article.status = :status', { status });
    }

    if (tag) {
      queryBuilder.andWhere(':tag = ANY(article.tags)', { tag });
    }

    if (search) {
      queryBuilder.andWhere(
        '(article.title ILIKE :search OR article.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [articles, total] = await queryBuilder
      .orderBy('article.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: articles,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOneBySlug(slug: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { 
        slug,
        status: ArticleStatus.PUBLISHED,
      },
      relations: ['author'],
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Increment view count
    article.view_count += 1;
    await this.articleRepository.save(article);

    return article;
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    this.logger.log(`Retrieved article content type: ${typeof article.content}`);
    
    // Safe logging with null check
    if (article.content) {
      try {
        const contentStr = JSON.stringify(article.content);
        this.logger.log(`Content preview: ${contentStr.substring(0, 200)}...`);
      } catch (error) {
        this.logger.log(`Content preview: [Unable to stringify content]`);
      }
    } else {
      this.logger.log(`Content preview: No content available`);
    }

    return article;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);

    // Update slug if title changed
    if (updateArticleDto.title && updateArticleDto.title !== article.title) {
      article.slug = this.generateSlug(updateArticleDto.title);
    }

    // Set published_at if status changed to published
    if (updateArticleDto.status === ArticleStatus.PUBLISHED && article.status !== ArticleStatus.PUBLISHED) {
      article.published_at = new Date();
    }

    Object.assign(article, updateArticleDto);
    
    return await this.articleRepository.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findOne(id);
    
    // Soft delete
    await this.articleRepository.softDelete(id);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  async getPopularArticles(limit: number = 10): Promise<Article[]> {
    return await this.articleRepository.find({
      where: { status: ArticleStatus.PUBLISHED },
      order: { view_count: 'DESC' },
      take: limit,
    });
  }

  async getRecentArticles(limit: number = 10): Promise<Article[]> {
    return await this.articleRepository.find({
      where: { status: ArticleStatus.PUBLISHED },
      order: { published_at: 'DESC' },
      take: limit,
    });
  }
} 