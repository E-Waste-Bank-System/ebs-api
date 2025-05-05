import supabase from '../utils/supabase';

export interface Report {
  id: string;
  user_id: string;
  source: 'manual' | 'auto';
  quantity: number;
  unit: string;
  image_url?: string;
  content: string;
  created_at: string;
}

export async function getApprovedRequests() {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllReports(limit: number, offset: number) {
  const { data, count, error } = await supabase
    .from('reports')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit, { offset });
  if (error) throw error;
  return { data: data || [], total: count || 0 };
}

export async function createReport(report: Omit<Report, 'created_at'>) {
  const { data, error } = await supabase
    .from('reports')
    .insert(report)
    .select()
    .single();
  if (error) throw error;
  return data;
}