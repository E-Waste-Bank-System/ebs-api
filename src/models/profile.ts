import { BaseModel } from './index';
import { Profile } from '../types';

export class ProfileModel extends BaseModel<Profile> {
  constructor() {
    super('profiles');
  }

  async findById(id: string): Promise<Profile | null> {
    return super.findById(id);
  }

  async findAll(): Promise<Profile[]> {
    return super.findAll();
  }

  async create(profile: Partial<Profile>): Promise<Profile> {
    return super.create(profile);
  }

  async update(id: string, profile: Partial<Profile>): Promise<Profile> {
    return super.update(id, profile);
  }

  async delete(id: string): Promise<void> {
    return super.delete(id);
  }

  async findByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  }

  async findByRole(role: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfile(userId: string, data: Partial<Profile>): Promise<Profile> {
    return this.update(userId, data);
  }

  async getAdmins(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_admin', true);

    if (error) throw error;
    return data;
  }
}

export const profileModel = new ProfileModel(); 