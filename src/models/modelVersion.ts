import { BaseModel } from './index';
import { Database } from '../types/supabase';

type ModelVersion = Database['public']['Tables']['model_versions']['Row'];
type ModelVersionInsert = Database['public']['Tables']['model_versions']['Insert'];
type ModelVersionUpdate = Database['public']['Tables']['model_versions']['Update'];

export class ModelVersionModel extends BaseModel<ModelVersion> {
  constructor() {
    super('model_versions');
  }

  async findById(id: string): Promise<ModelVersion | null> {
    return super.findById(id);
  }

  async findAll(): Promise<ModelVersion[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(version: ModelVersionInsert): Promise<ModelVersion> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(version)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, version: ModelVersionUpdate): Promise<ModelVersion> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(version)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findByVersion(version: string): Promise<ModelVersion | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('version', version)
      .single();

    if (error) throw error;
    return data;
  }

  async getActiveVersion(): Promise<ModelVersion | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  }

  async setActiveVersion(id: string): Promise<ModelVersion> {
    // First, set all versions to inactive
    await this.supabase
      .from(this.tableName)
      .update({ is_active: false })
      .eq('is_active', true);

    // Then set the specified version to active
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePerformanceMetrics(version: string, metrics: Database['public']['Tables']['model_versions']['Row']['performance_metrics']): Promise<ModelVersion> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ performance_metrics: metrics })
      .eq('version', version)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getVersionHistory(options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: ModelVersion[]; total: number }> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { data, count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return {
      data,
      total: count || 0
    };
  }

  async findByModel(modelId: string): Promise<ModelVersion[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByStatus(status: string): Promise<ModelVersion[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const modelVersionModel = new ModelVersionModel(); 