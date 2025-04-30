import supabase from '../utils/supabase';

export interface Article {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
}

export async function getAll(limit: number, offset: number) {
  const { data, count, error } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .limit(limit, { offset });
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
    .single();
  if (error) throw error;
  return data;
}

export async function update(id: string, fields: Partial<Article>) {
  const { data, error } = await supabase
    .from('articles')
    .update(fields)
    .eq('id', id)
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