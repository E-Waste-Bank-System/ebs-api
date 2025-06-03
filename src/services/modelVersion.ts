import { ModelVersionModel } from '../models/modelVersion';
import { Database } from '../types/supabase';
import logger from '../utils/logger';

type ModelVersion = Database['public']['Tables']['model_versions']['Row'];
type ModelVersionInsert = Database['public']['Tables']['model_versions']['Insert'];
type ModelVersionUpdate = Database['public']['Tables']['model_versions']['Update'];

export class ModelVersionService {
  private model: ModelVersionModel;

  constructor() {
    this.model = new ModelVersionModel();
  }

  async getModelVersion(id: string): Promise<ModelVersion | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      logger.error('Error getting model version:', error);
      throw error;
    }
  }

  async getModelVersions(): Promise<ModelVersion[]> {
    try {
      return await this.model.findAll();
    } catch (error) {
      logger.error('Error getting model versions:', error);
      throw error;
    }
  }

  async createModelVersion(version: ModelVersionInsert): Promise<ModelVersion> {
    try {
      return await this.model.create(version);
    } catch (error) {
      logger.error('Error creating model version:', error);
      throw error;
    }
  }

  async updateModelVersion(id: string, version: ModelVersionUpdate): Promise<ModelVersion> {
    try {
      return await this.model.update(id, version);
    } catch (error) {
      logger.error('Error updating model version:', error);
      throw error;
    }
  }

  async deleteModelVersion(id: string): Promise<void> {
    try {
      await this.model.delete(id);
    } catch (error) {
      logger.error('Error deleting model version:', error);
      throw error;
    }
  }

  async getModelVersionByVersion(version: string): Promise<ModelVersion | null> {
    try {
      return await this.model.findByVersion(version);
    } catch (error) {
      logger.error('Error getting model version by version:', error);
      throw error;
    }
  }

  async getActiveModelVersion(): Promise<ModelVersion | null> {
    try {
      return await this.model.getActiveVersion();
    } catch (error) {
      logger.error('Error getting active model version:', error);
      throw error;
    }
  }

  async setActiveModelVersion(id: string): Promise<ModelVersion> {
    try {
      return await this.model.setActiveVersion(id);
    } catch (error) {
      logger.error('Error setting active model version:', error);
      throw error;
    }
  }

  async updatePerformanceMetrics(version: string, metrics: Database['public']['Tables']['model_versions']['Row']['performance_metrics']): Promise<ModelVersion> {
    try {
      const modelVersion = await this.model.updatePerformanceMetrics(version, metrics);
      logger.info('Performance metrics updated', { version });
      return modelVersion;
    } catch (error) {
      logger.error('Error in updatePerformanceMetrics', { error, version });
      throw error;
    }
  }

  async getVersionHistory(options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: ModelVersion[]; total: number }> {
    try {
      return await this.model.getVersionHistory(options);
    } catch (error) {
      logger.error('Error in getVersionHistory', { error });
      throw error;
    }
  }
}

export const modelVersionService = new ModelVersionService(); 