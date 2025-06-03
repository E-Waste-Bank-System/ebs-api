import { BaseModel } from './index';
import { Ewaste } from '../types';

export enum EwasteStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  REJECTED = 'rejected'
}

export class EwasteModel extends BaseModel<Ewaste> {
  constructor() {
    super('ewaste');
  }

  async findById(id: string): Promise<Ewaste | null> {
    return super.findById(id);
  }

  async findAll(): Promise<Ewaste[]> {
    return super.findAll();
  }

  async create(ewaste: Partial<Ewaste>): Promise<Ewaste> {
    return super.create(ewaste);
  }

  async update(id: string, ewaste: Partial<Ewaste>): Promise<Ewaste> {
    return super.update(id, ewaste);
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findByUserId(userId: string, options: {
    page?: number;
    limit?: number;
    status?: EwasteStatus;
  } = {}): Promise<{ data: Ewaste[]; total: number }> {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, total: count || 0 };
  }

  async findByObjectId(objectId: string): Promise<Ewaste[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('object_id', objectId);

    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, status: EwasteStatus): Promise<Ewaste> {
    return this.update(id, { status });
  }

  async getByStatus(status: EwasteStatus, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Ewaste[]; total: number }> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('status', status)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, total: count || 0 };
  }

  async getTotalQuantityByCategory(): Promise<{ category: string; total: number }[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('category, quantity')
      .is('deleted_at', null);

    if (error) throw error;

    const totals = data.reduce((acc: { [key: string]: number }, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.quantity;
      return acc;
    }, {});

    return Object.entries(totals).map(([category, total]) => ({
      category,
      total
    }));
  }
}

export const ewasteModel = new EwasteModel(); 