import supabase from '../config/supabase';
import { Article } from '../models/article';

export async function getAll(
  limit: number,
  offset: number
): Promise<{ data: Article[]; total: number }> {
  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: data as Article[], total: count || 0 };
}

export async function getById(id: string): Promise<Article> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Article;
}

export async function create(article: Article): Promise<Article> {
  const { data, error } = await supabase.from('articles').insert(article).single();
  if (error) throw error;
  return data as Article;
}

export async function update(id: string, fields: Partial<Article>): Promise<Article> {
  const { data, error } = await supabase.from('articles').update(fields).eq('id', id).single();
  if (error) throw error;
  return data as Article;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}