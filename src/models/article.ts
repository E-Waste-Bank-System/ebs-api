import { BaseModel } from './index';
import { Article } from '../types';

export class ArticleModel extends BaseModel<Article> {
  constructor() {
    super('articles');
  }

  async findById(id: string): Promise<Article | null> {
    return super.findById(id);
  }

  async findAll(): Promise<Article[]> {
    return super.findAll();
  }

  async create(article: Partial<Article>): Promise<Article> {
    return super.create(article);
  }

  async update(id: string, article: Partial<Article>): Promise<Article> {
    return super.update(id, article);
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByStatus(status: string): Promise<Article[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async publish(id: string): Promise<Article> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async archive(id: string): Promise<Article> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'archived'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const articleModel = new ArticleModel(); 