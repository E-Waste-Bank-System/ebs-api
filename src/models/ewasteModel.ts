import { BaseModel } from './baseModel';
import { Database } from '../types/supabase';

type EWaste = Database['public']['Tables']['ewaste']['Row'];
type EWasteInsert = Database['public']['Tables']['ewaste']['Insert'];
type EWasteUpdate = Database['public']['Tables']['ewaste']['Update'];

export interface Ewaste {
  id: string;
  user_id: string;
  category: string;
  description: string;
  condition: string;
  damage_level: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  validated: boolean;
  object_id: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
}

export class EwasteModel extends BaseModel<Ewaste> {
  constructor() {
    super('ewaste');
  }

  async findById(id: string): Promise<Ewaste> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Ewaste not found');
    return data as Ewaste;
  }

  async findAll(): Promise<Ewaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*');
    
    if (error) throw error;
    return data as Ewaste[];
  }

  async create(ewaste: Partial<Ewaste>): Promise<Ewaste> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(ewaste)
      .select()
      .single();
    
    if (error) throw error;
    return data as Ewaste;
  }

  async update(id: string, ewaste: Partial<Ewaste>): Promise<Ewaste> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(ewaste)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Ewaste;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  async findByUserId(userId: string): Promise<Ewaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data as Ewaste[];
  }

  async findByCategory(category: string): Promise<Ewaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('category', category);
    
    if (error) throw error;
    return data as Ewaste[];
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Ewaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (error) throw error;
    return data as Ewaste[];
  }

  async validate(id: string): Promise<Ewaste> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ validated: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Ewaste;
  }
} 