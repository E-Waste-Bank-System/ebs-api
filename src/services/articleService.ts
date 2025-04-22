import supabase from '../config/supabase';
import { Article } from '../models/article';

function toDbArticle(article: Partial<Article>) {
  // Map camelCase to snake_case for DB
  const mapped: any = { ...article };
  if ('createdAt' in mapped) {
    mapped.created_at = mapped.createdAt;
    delete mapped.createdAt;
  }
  if ('imageUrl' in mapped) {
    mapped.image_url = mapped.imageUrl;
    delete mapped.imageUrl;
  }
  return mapped;
}

function fromDbArticle(db: any): Article {
  // Map snake_case to camelCase for app
  return {
    id: db.id,
    title: db.title,
    content: db.content,
    imageUrl: db.image_url,
    createdAt: db.created_at,
  };
}

export async function getAll(
  limit: number,
  offset: number
): Promise<{ data: Article[]; total: number }> {
  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: (data || []).map(fromDbArticle), total: count || 0 };
}

export async function getById(id: string): Promise<Article> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error) throw error;
  return fromDbArticle(data);
}

export async function create(article: Article): Promise<Article> {
  const { data, error } = await supabase.from('articles').insert(toDbArticle(article)).single();
  if (error) throw error;
  return fromDbArticle(data);
}

export async function update(id: string, fields: Partial<Article>): Promise<Article> {
  const { data, error } = await supabase.from('articles').update(toDbArticle(fields)).eq('id', id).single();
  if (error) throw error;
  return fromDbArticle(data);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}