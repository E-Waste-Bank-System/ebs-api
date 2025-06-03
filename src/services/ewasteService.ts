import { BaseModel } from './index';
import { Database } from '../types/supabase';

type EWaste = Database['public']['Tables']['ewaste']['Row'];
type EWasteInsert = Database['public']['Tables']['ewaste']['Insert'];
type EWasteUpdate = Database['public']['Tables']['ewaste']['Update'];

export class EWasteService {
  private model: EWasteModel;

  constructor() {
    this.model = new EWasteModel();
  }

  async getEWaste(id: string): Promise<EWaste | null> {
    return this.model.findById(id);
  }

  async getEWasteList(): Promise<EWaste[]> {
    return this.model.findAll();
  }

  async createEWaste(ewaste: EWasteInsert): Promise<EWaste> {
    return this.model.create(ewaste);
  }

  async updateEWaste(id: string, ewaste: EWasteUpdate): Promise<EWaste> {
    return this.model.update(id, ewaste);
  }

  async deleteEWaste(id: string): Promise<void> {
    return this.model.delete(id);
  }

  async getEWasteByCategory(category: string): Promise<EWaste[]> {
    return this.model.findByCategory(category);
  }

  async getEWasteByUser(userId: string): Promise<EWaste[]> {
    return this.model.findByUserId(userId);
  }

  async getEWasteByDateRange(startDate: Date, endDate: Date): Promise<EWaste[]> {
    return this.model.findByDateRange(startDate, endDate);
  }

  async validateEWaste(id: string, validatedBy: string, status: 'approved' | 'rejected'): Promise<EWaste> {
    const ewaste = await this.model.findById(id);
    if (!ewaste) {
      throw new Error('E-waste not found');
    }

    return this.model.update(id, {
      status,
      validated_by: validatedBy,
      updated_at: new Date().toISOString()
    });
  }

  async getEWasteWithDetails(id: string): Promise<EWaste & { object: Database['public']['Tables']['objects']['Row'] } | null> {
    const { data, error } = await this.model.supabase
      .from('ewaste')
      .select(`
        *,
        object:objects (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getEWasteListWithFilters(options: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'rejected';
    category?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ data: EWaste[]; total: number }> {
    const { page = 1, limit = 10, status, category, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    let query = this.model.supabase
      .from('ewaste')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, total: count || 0 };
  }
}

export const ewasteService = new EWasteService(); 