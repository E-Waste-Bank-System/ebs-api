import { BaseModel } from './baseModel';
import { Database } from '../types/supabase';

type EWaste = Database['public']['Tables']['ewaste']['Row'];
type EWasteInsert = Database['public']['Tables']['ewaste']['Insert'];
type EWasteUpdate = Database['public']['Tables']['ewaste']['Update'];

export class EWasteModel extends BaseModel {
  protected tableName = 'ewaste';

  async findById(id: string): Promise<EWaste | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async findAll(): Promise<EWaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(ewaste: EWasteInsert): Promise<EWaste> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(ewaste)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, ewaste: EWasteUpdate): Promise<EWaste> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(ewaste)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async findByCategory(category: string): Promise<EWaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByUserId(userId: string): Promise<EWaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<EWaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
} 