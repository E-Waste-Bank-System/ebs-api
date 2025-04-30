import supabase from '../utils/supabase';

export interface EWasteRequest {
  id: string;
  userId: string;
  weight: number;
  location: string;
  pickupDate?: string;
  imageUrl: string;
  status: string;
  createdAt: string;
}

export async function getAllRequests(limit: number, offset: number) {
  const { data, count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .limit(limit, { offset });
  if (error) throw error;
  return { data: data || [], total: count || 0 };
}

export async function getRequestsByUser(userId: string) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRequest(request: Omit<EWasteRequest, 'createdAt'>) {
  const { data, error } = await supabase
    .from('requests')
    .insert(request)
    .single();
  if (error) throw error;
  return data;
}

export async function updateRequestStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}