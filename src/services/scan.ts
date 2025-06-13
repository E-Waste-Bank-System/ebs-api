import { BaseModel } from '../models/baseModel';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Scan {
  id: string;
  user_id: string;
  status: ScanStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown> | null;
}

export class ScanModel extends BaseModel<Scan> {
  constructor() {
    super('scans');
  }

  async findByUserId(userId: string): Promise<Scan[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data as Scan[];
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Scan[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    return data as Scan[];
  }

  async findByStatus(status: ScanStatus): Promise<Scan[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status);
    
    if (error) throw error;
    return data as Scan[];
  }
}

export class ScanService {
  private model: ScanModel;

  constructor() {
    this.model = new ScanModel();
  }

  async getAllScans(): Promise<Scan[]> {
    return await this.model.findAll();
  }

  async getScanById(id: string): Promise<Scan> {
    return await this.model.findById(id);
  }

  async createScan(scan: Partial<Scan>): Promise<Scan> {
    return await this.model.create(scan);
  }

  async updateScan(id: string, scan: Partial<Scan>): Promise<Scan> {
    return await this.model.update(id, scan);
  }

  async deleteScan(id: string): Promise<boolean> {
    return await this.model.delete(id);
  }

  async getScansByUserId(userId: string): Promise<Scan[]> {
    return await this.model.findByUserId(userId);
  }

  async getScansByDateRange(startDate: Date, endDate: Date): Promise<Scan[]> {
    return await this.model.findByDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    );
  }

  async getScansByStatus(status: ScanStatus): Promise<Scan[]> {
    return await this.model.findByStatus(status);
  }
} 