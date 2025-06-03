import { ValidationModel, ValidationAction } from '../models/validation';
import { Database } from '../types/supabase';
import logger from '../utils/logger';

type ValidationHistory = Database['public']['Tables']['validation_history']['Row'];
type ValidationHistoryInsert = Database['public']['Tables']['validation_history']['Insert'];
type ValidationHistoryUpdate = Database['public']['Tables']['validation_history']['Update'];

export class ValidationService {
  private model: ValidationModel;

  constructor() {
    this.model = new ValidationModel();
  }

  async getValidationHistory(id: string): Promise<ValidationHistory | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      logger.error('Error getting validation history:', error);
      throw error;
    }
  }

  async getValidationHistoryList(): Promise<ValidationHistory[]> {
    try {
      return await this.model.findAll();
    } catch (error) {
      logger.error('Error getting validation history list:', error);
      throw error;
    }
  }

  async createValidationHistory(history: ValidationHistoryInsert): Promise<ValidationHistory> {
    try {
      return await this.model.create(history);
    } catch (error) {
      logger.error('Error creating validation history:', error);
      throw error;
    }
  }

  async updateValidationHistory(id: string, history: ValidationHistoryUpdate): Promise<ValidationHistory> {
    try {
      return await this.model.update(id, history);
    } catch (error) {
      logger.error('Error updating validation history:', error);
      throw error;
    }
  }

  async deleteValidationHistory(id: string): Promise<void> {
    try {
      await this.model.delete(id);
    } catch (error) {
      logger.error('Error deleting validation history:', error);
      throw error;
    }
  }

  async getValidationHistoryByObject(objectId: string): Promise<ValidationHistory[]> {
    try {
      return await this.model.findByObjectId(objectId);
    } catch (error) {
      logger.error('Error getting validation history by object:', error);
      throw error;
    }
  }

  async getValidationHistoryByUser(userId: string): Promise<ValidationHistory[]> {
    try {
      return await this.model.findByUserId(userId);
    } catch (error) {
      logger.error('Error getting validation history by user:', error);
      throw error;
    }
  }

  async getValidationHistoryByAction(action: ValidationAction): Promise<ValidationHistory[]> {
    try {
      return await this.model.findByAction(action);
    } catch (error) {
      logger.error('Error getting validation history by action:', error);
      throw error;
    }
  }
}

export default new ValidationService(); 