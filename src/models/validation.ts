import { BaseModel } from './index';
import { ValidationHistory } from '../types';

export enum ValidationAction {
  VERIFY = 'verify',
  REJECT = 'reject',
  MODIFY = 'modify'
}

export class ValidationModel extends BaseModel<ValidationHistory> {
  constructor() {
    super('validation_history');
  }

  async findById(id: string): Promise<ValidationHistory | null> {
    return super.findById(id);
  }

  async findAll(): Promise<ValidationHistory[]> {
    return super.findAll();
  }

  async create(history: Partial<ValidationHistory>): Promise<ValidationHistory> {
    return super.create(history);
  }

  async update(id: string, history: Partial<ValidationHistory>): Promise<ValidationHistory> {
    return super.update(id, history);
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findByObjectId(objectId: string): Promise<ValidationHistory[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('object_id', objectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByUserId(userId: string): Promise<ValidationHistory[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByAction(action: ValidationAction): Promise<ValidationHistory[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('action', action)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const validationModel = new ValidationModel(); 