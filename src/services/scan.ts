import { ScanModel } from '../models/scan';
import { Database } from '../types/supabase';
import logger from '../utils/logger';

type Scan = Database['public']['Tables']['scans']['Row'];
type ScanInsert = Database['public']['Tables']['scans']['Insert'];
type ScanUpdate = Database['public']['Tables']['scans']['Update'];

export class ScanService {
  private model: ScanModel;

  constructor() {
    this.model = new ScanModel();
  }

  async getScan(id: string): Promise<Scan | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      logger.error('Error getting scan:', error);
      throw error;
    }
  }

  async getScans(): Promise<Scan[]> {
    try {
      return await this.model.findAll();
    } catch (error) {
      logger.error('Error getting scans:', error);
      throw error;
    }
  }

  async createScan(scan: ScanInsert): Promise<Scan> {
    try {
      return await this.model.create(scan);
    } catch (error) {
      logger.error('Error creating scan:', error);
      throw error;
    }
  }

  async updateScan(id: string, scan: ScanUpdate): Promise<Scan> {
    try {
      return await this.model.update(id, scan);
    } catch (error) {
      logger.error('Error updating scan:', error);
      throw error;
    }
  }

  async deleteScan(id: string): Promise<void> {
    try {
      await this.model.delete(id);
    } catch (error) {
      logger.error('Error deleting scan:', error);
      throw error;
    }
  }

  async getScansByUser(userId: string): Promise<Scan[]> {
    try {
      return await this.model.findByUserId(userId);
    } catch (error) {
      logger.error('Error getting scans by user:', error);
      throw error;
    }
  }

  async getScansByStatus(status: string): Promise<Scan[]> {
    try {
      return await this.model.findByStatus(status);
    } catch (error) {
      logger.error('Error getting scans by status:', error);
      throw error;
    }
  }

  async getScansByDateRange(startDate: Date, endDate: Date): Promise<Scan[]> {
    try {
      return await this.model.findByDateRange(startDate, endDate);
    } catch (error) {
      logger.error('Error getting scans by date range:', error);
      throw error;
    }
  }
} 