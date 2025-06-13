import { supabase } from '../config/supabase';
import { slugify } from '../utils/string';

export interface Article {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  slug: string;
  author_id: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
}

export interface ArticleQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export class ArticleService {
  async getAll(limit: number, offset: number) {
    const { data, count, error } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  async getById(id: string): Promise<Article | null> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createArticle(article: Partial<Article>): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .insert(article)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateArticle(id: string, article: Partial<Article>): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .update(article)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteArticle(id: string): Promise<void> {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getArticleBySlug(slug: string): Promise<Article | null> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  }

  async getArticlesByAuthor(authorId: string, options: ArticleQuery = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query.eq('status', options.status);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  async getArticlesByStatus(status: string, options: ArticleQuery = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  async publishArticle(id: string): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async archiveArticle(id: string): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export const articleService = new ArticleService();