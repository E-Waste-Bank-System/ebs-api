import { BaseModel } from './index';
import { Scan, ScanStatus } from '../types';

export class ScanModel extends BaseModel<Scan> {
  constructor() {
    super('scans');
  }

  async findById(id: string): Promise<Scan | null> {
    return super.findById(id);
  }

  async findAll(): Promise<Scan[]> {
    return super.findAll();
  }

  async create(scan: Partial<Scan>): Promise<Scan> {
    return super.create(scan);
  }

  async update(id: string, scan: Partial<Scan>): Promise<Scan> {
    return super.update(id, scan);
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findByUserId(userId: string, options: {
    page?: number;
    limit?: number;
    status?: ScanStatus;
  } = {}): Promise<{ data: Scan[]; total: number }> {
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

  async updateStatus(id: string, status: ScanStatus): Promise<Scan> {
    return this.update(id, { status });
  }

  async getActiveScans(): Promise<Scan[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .in('status', [ScanStatus.PENDING, ScanStatus.PROCESSING])
      .is('deleted_at', null);

    if (error) throw error;
    return data;
  }

  async getCompletedScans(options: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ data: Scan[]; total: number }> {
    const { page = 1, limit = 10, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('status', ScanStatus.COMPLETED)
      .is('deleted_at', null);

    if (startDate) {
      query = query.gte('completed_at', startDate);
    }

    if (endDate) {
      query = query.lte('completed_at', endDate);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, total: count || 0 };
  }

  async findByUser(userId: string): Promise<Scan[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByStatus(status: string): Promise<Scan[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const scanModel = new ScanModel(); 