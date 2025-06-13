import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

export class BaseModel<T> {
  protected supabase: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string) {
    this.supabase = supabase;
    this.tableName = tableName;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*');
    
    if (error) throw error;
    return data as T[];
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as T;
  }

  async create(item: Partial<T>) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data as T;
  }

  async update(id: string, item: Partial<T>) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(item)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as T;
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
} 