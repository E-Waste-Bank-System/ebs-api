import { BaseModel } from './index';
import { Object as Detection } from '../types';

export class ObjectModel extends BaseModel<Detection> {
  constructor() {
    super('objects');
  }

  async findById(id: string): Promise<Detection | null> {
    return super.findById(id);
  }

  async findAll(): Promise<Detection[]> {
    return super.findAll();
  }

  async create(detection: Partial<Detection>): Promise<Detection> {
    return super.create(detection);
  }

  async update(id: string, detection: Partial<Detection>): Promise<Detection> {
    return super.update(id, detection);
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findByScan(scanId: string): Promise<Detection[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByUser(userId: string): Promise<Detection[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const objectModel = new ObjectModel(); 