import supabase from '../utils/supabase';

export interface Article {
  id: string;
  title: string;
  content: string;
  image_url: string;
  created_at: string;
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

export async function create(article: Article) {
  const { data, error } = await supabase
    .from('articles')
    .insert(article)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function update(id: string, fields: Partial<Article>) {
  const { data, error } = await supabase
    .from('articles')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function remove(id: string) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);
  if (error) throw error;
}