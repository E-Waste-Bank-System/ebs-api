import supabase from '../config/supabase';
import { EWasteRequest } from '../models/request';

function toDbRequest(request: Partial<EWasteRequest>) {
  const mapped: any = { ...request };
  if ('userId' in mapped) {
    mapped.user_id = mapped.userId;
    delete mapped.userId;
  }
  if ('pickupDate' in mapped) {
    mapped.pickup_date = mapped.pickupDate;
    delete mapped.pickupDate;
  }
  if ('imageUrl' in mapped) {
    mapped.image_url = mapped.imageUrl;
    delete mapped.imageUrl;
  }
  if ('createdAt' in mapped) {
    delete mapped.createdAt;
  }
  return mapped;
}

function fromDbRequest(db: any): EWasteRequest {
  return {
    id: db.id,
    userId: db.user_id,
    category: db.category,
    weight: db.weight,
    price: db.price,
    status: db.status,
    pickupDate: db.pickup_date,
    location: db.location,
    imageUrl: db.image_url,
    createdAt: db.created_at,
  };
}

export async function getAllRequests(
  limit: number,
  offset: number
): Promise<{ data: EWasteRequest[]; total: number }> {
  const { data, error, count } = await supabase
    .from('requests')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: (data || []).map(fromDbRequest), total: count || 0 };
}

export async function getRequestsByUser(userId: string): Promise<EWasteRequest[]> {
  const { data, error } = await supabase.from('requests').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(fromDbRequest);
}

export async function createRequest(request: Partial<EWasteRequest>): Promise<EWasteRequest> {
  const { data, error } = await supabase.from('requests').insert(toDbRequest(request)).select().single();
  if (error) throw error;
  return fromDbRequest(data);
}

export async function updateRequestStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<EWasteRequest> {
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', id)
    .single();
  if (error) throw error;
  return fromDbRequest(data);
}