import { BaseModel } from './index';
import { Database } from '../types/supabase';

export type RetrainingData = Database['public']['Tables']['retraining_data']['Row'];

export class RetrainingModel extends BaseModel<RetrainingData> {
  constructor() {
    super('retraining_data');
  }

  async findById(id: string): Promise<RetrainingData | null> {
    return super.findById(id);
  }

  async findAll(): Promise<RetrainingData[]> {
    return super.findAll();
  }

  async create(retraining: Partial<RetrainingData>): Promise<RetrainingData> {
    return super.create(retraining);
  }

  async update(id: string, retraining: Partial<RetrainingData>): Promise<RetrainingData> {
    return super.update(id, retraining);
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findByModel(modelId: string): Promise<RetrainingData[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('model_version', modelId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByStatus(status: string): Promise<RetrainingData[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_verified', status === 'verified')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const retrainingModel = new RetrainingModel(); 