import supabase from '../utils/supabase';
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
}

export interface ArticleQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export async function getAll(limit: number, offset: number) {
  const { data, count, error } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: data || [], total: count || 0 };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createArticle(data: { title: string; content: string; image_url?: string; author_id: string }) {
  const slug = slugify(data.title);
  const article = {
    ...data,
    slug,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: newArticle, error } = await supabase
    .from('articles')
    .insert(article)
    .select()
    .single();
  if (error) throw error;
  return newArticle;
}

export async function updateArticle(id: string, data: { title?: string; content?: string; image_url?: string }) {
  const updateData: any = { ...data };
  if (data.title) {
    updateData.slug = slugify(data.title);
  }
  updateData.updated_at = new Date().toISOString();

  const { data: updatedArticle, error } = await supabase
    .from('articles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return updatedArticle;
}

export async function getArticleBySlug(slug: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

export async function getArticlesByAuthor(authorId: string, options: ArticleQuery = {}) {
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

export async function getArticlesByStatus(status: string, options: ArticleQuery = {}) {
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

export async function publishArticle(id: string) {
  const { data, error } = await supabase
    .from('articles')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveArticle(id: string) {
  const { data, error } = await supabase
    .from('articles')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);
  if (error) throw error;
}