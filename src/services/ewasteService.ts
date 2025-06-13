import { EwasteModel, Ewaste } from '../models/ewasteModel';
import { supabase } from '../config/supabase';

export class EwasteService {
  private model: EwasteModel;

  constructor() {
    this.model = new EwasteModel();
  }

  async getAllEwaste(): Promise<Ewaste[]> {
    return await this.model.findAll();
  }

  async getEwasteById(id: string): Promise<Ewaste> {
    return await this.model.findById(id);
  }

  async createEwaste(ewaste: Partial<Ewaste>): Promise<Ewaste> {
    return await this.model.create(ewaste);
  }

  async updateEwaste(id: string, ewaste: Partial<Ewaste>): Promise<Ewaste> {
    return await this.model.update(id, ewaste);
  }

  async deleteEwaste(id: string): Promise<boolean> {
    return await this.model.delete(id);
  }

  async validateEwaste(id: string): Promise<Ewaste> {
    return await this.model.update(id, { validated: true });
  }

  async getEwasteByUserId(userId: string): Promise<Ewaste[]> {
    return await this.model.findByUserId(userId);
  }

  async getEWasteWithDetails(id: string): Promise<Ewaste & { object: any } | null> {
    const { data, error } = await supabase
      .from('ewaste')
      .select(`
        *,
        object:objects(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getEWasteListWithFilters(options: {
    page: number;
    limit: number;
    status?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    let query = supabase
      .from('ewaste')
      .select('*', { count: 'exact' });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    const { data, error, count } = await query
      .range((options.page - 1) * options.limit, options.page * options.limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data,
      total: count || 0,
      page: options.page,
      limit: options.limit
    };
  }
}

export const ewasteService = new EwasteService(); 