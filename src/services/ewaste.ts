import { EWasteModel } from '../models/ewaste';
import { Database } from '../types/supabase';
import logger from '../utils/logger';

type EWaste = Database['public']['Tables']['ewaste']['Row'];
type EWasteInsert = Database['public']['Tables']['ewaste']['Insert'];
type EWasteUpdate = Database['public']['Tables']['ewaste']['Update'];

export class EWasteService {
  private model: EWasteModel;

  constructor() {
    this.model = new EWasteModel();
  }

  async getEWaste(id: string): Promise<EWaste | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      logger.error('Error getting e-waste:', error);
      throw error;
    }
  }

  async getEWasteList(): Promise<EWaste[]> {
    try {
      return await this.model.findAll();
    } catch (error) {
      logger.error('Error getting e-waste list:', error);
      throw error;
    }
  }

  async createEWaste(ewaste: EWasteInsert): Promise<EWaste> {
    try {
      return await this.model.create(ewaste);
    } catch (error) {
      logger.error('Error creating e-waste:', error);
      throw error;
    }
  }

  async updateEWaste(id: string, ewaste: EWasteUpdate): Promise<EWaste> {
    try {
      return await this.model.update(id, ewaste);
    } catch (error) {
      logger.error('Error updating e-waste:', error);
      throw error;
    }
  }

  async deleteEWaste(id: string): Promise<void> {
    try {
      await this.model.delete(id);
    } catch (error) {
      logger.error('Error deleting e-waste:', error);
      throw error;
    }
  }

  async getEWasteByCategory(category: string): Promise<EWaste[]> {
    try {
      return await this.model.findByCategory(category);
    } catch (error) {
      logger.error('Error getting e-waste by category:', error);
      throw error;
    }
  }

  async getEWasteByUser(userId: string): Promise<EWaste[]> {
    try {
      return await this.model.findByUserId(userId);
    } catch (error) {
      logger.error('Error getting e-waste by user:', error);
      throw error;
    }
  }

  async getEWasteByDateRange(startDate: Date, endDate: Date): Promise<EWaste[]> {
    try {
      return await this.model.findByDateRange(startDate, endDate);
    } catch (error) {
      logger.error('Error getting e-waste by date range:', error);
      throw error;
    }
  }
} 