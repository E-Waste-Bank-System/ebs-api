import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import config from '../config/env';

const supabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseServiceKey
);

export abstract class BaseModel<T> {
  protected supabase = supabase;
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  protected async findAll(): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*');

    if (error) throw error;
    return data;
  }

  protected async create(record: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  protected async update(id: string, record: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(record)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  protected async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

// Export all models
export * from './profile';
export * from './article';
export * from './scan';
export * from './object';
export * from './ewaste';
export * from './retraining';
export * from './validation';
export * from './modelVersion';

// now exports Admin, RetrainingData