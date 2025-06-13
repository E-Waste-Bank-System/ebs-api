import { supabase } from '../config/supabase';

export interface EWaste {
  id: string;
  user_id: string;
  object_id: string;
  category: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Stats {
  totalItems: number;
  pendingItems: number;
  approvedItems: number;
  rejectedItems: number;
  recentItems: EWaste[];
}

export interface DetailedStats extends Stats {
  userCount: number;
  categoryBreakdown: Record<string, number>;
}

export class EWasteService {
  async findById(id: string): Promise<EWaste | null> {
    const { data, error } = await supabase
      .from('ewaste')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async findAll(): Promise<EWaste[]> {
    const { data, error } = await supabase
      .from('ewaste')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async create(ewaste: Omit<EWaste, 'id' | 'created_at' | 'updated_at'>): Promise<EWaste> {
    const { data, error } = await supabase
      .from('ewaste')
      .insert(ewaste)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async update(id: string, ewaste: Partial<EWaste>): Promise<EWaste | null> {
    const { data, error } = await supabase
      .from('ewaste')
      .update(ewaste)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ewaste')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async findByUserId(userId: string): Promise<EWaste[]> {
    const { data, error } = await supabase
      .from('ewaste')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async findByCategory(category: string): Promise<EWaste[]> {
    const { data, error } = await supabase
      .from('ewaste')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getStats(): Promise<Stats> {
    const { data: ewaste, error } = await supabase
      .from('ewaste')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    return {
      totalItems: ewaste.length,
      pendingItems: ewaste.filter(item => item.status === 'pending').length,
      approvedItems: ewaste.filter(item => item.status === 'approved').length,
      rejectedItems: ewaste.filter(item => item.status === 'rejected').length,
      recentItems: ewaste.slice(0, 5)
    };
  }

  async getDetailedStats(): Promise<DetailedStats> {
    const { data: ewaste, error } = await supabase
      .from('ewaste')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    const uniqueUsers = new Set(ewaste.map(item => item.user_id));
    const categoryBreakdown = ewaste.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalItems: ewaste.length,
      pendingItems: ewaste.filter(item => item.status === 'pending').length,
      approvedItems: ewaste.filter(item => item.status === 'approved').length,
      rejectedItems: ewaste.filter(item => item.status === 'rejected').length,
      recentItems: ewaste.slice(0, 5),
      userCount: uniqueUsers.size,
      categoryBreakdown
    };
  }
}

export const ewasteService = new EWasteService(); 