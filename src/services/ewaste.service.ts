import { supabase } from '../config/supabase';
import { AppError } from '../utils/error';
import { getSignedUrl } from '../config/gcs';

export interface Ewaste {
  id: string;
  userId: string;
  category: string;
  weight: number;
  status: string;
  image: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EwasteService {
  async createEwaste(userId: string, category: string, weight: number, imageUrl: string): Promise<Ewaste> {
    // Insert e-waste record into Supabase
    const { data, error } = await supabase
      .from('ewastes')
      .insert({
        user_id: userId,
        category,
        weight,
        status: 'PENDING',
        image: imageUrl,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    if (!data) {
      throw new AppError(500, 'Failed to create e-waste record');
    }

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      weight: data.weight,
      status: data.status,
      image: data.image,
      rejectionReason: data.rejection_reason,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async getUserEwastes(userId: string): Promise<Ewaste[]> {
    // Get all e-wastes for a user
    const { data, error } = await supabase
      .from('ewastes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(400, error.message);
    }

    // Transform the data to match our interface
    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      category: item.category,
      weight: item.weight,
      status: item.status,
      image: item.image,
      rejectionReason: item.rejection_reason,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    }));
  }

  async getPendingEwastes(): Promise<Ewaste[]> {
    // Get all pending e-wastes
    const { data, error } = await supabase
      .from('ewastes')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(400, error.message);
    }

    // Transform the data to match our interface
    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      category: item.category,
      weight: item.weight,
      status: item.status,
      image: item.image,
      rejectionReason: item.rejection_reason,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    }));
  }

  async approveEwaste(ewasteId: string): Promise<Ewaste> {
    // Update e-waste status to APPROVED
    const { data, error } = await supabase
      .from('ewastes')
      .update({
        status: 'APPROVED',
      })
      .eq('id', ewasteId)
      .select()
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    if (!data) {
      throw new AppError(404, 'E-waste not found');
    }

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      weight: data.weight,
      status: data.status,
      image: data.image,
      rejectionReason: data.rejection_reason,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async rejectEwaste(ewasteId: string, reason: string): Promise<Ewaste> {
    // Update e-waste status to REJECTED with reason
    const { data, error } = await supabase
      .from('ewastes')
      .update({
        status: 'REJECTED',
        rejection_reason: reason,
      })
      .eq('id', ewasteId)
      .select()
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    if (!data) {
      throw new AppError(404, 'E-waste not found');
    }

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      weight: data.weight,
      status: data.status,
      image: data.image,
      rejectionReason: data.rejection_reason,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async getEwasteById(ewasteId: string): Promise<Ewaste> {
    // Get e-waste by ID
    const { data, error } = await supabase
      .from('ewastes')
      .select('*')
      .eq('id', ewasteId)
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    if (!data) {
      throw new AppError(404, 'E-waste not found');
    }

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      weight: data.weight,
      status: data.status,
      image: data.image,
      rejectionReason: data.rejection_reason,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  // Get signed URL for e-waste image
  async getSignedImageUrl(imageUrl: string): Promise<string> {
    try {
      // Extract the bucket and file name from the URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const bucketName = pathParts[1]; // e.g., ewaste-images
      const fileName = pathParts.slice(2).join('/'); // everything after the bucket name
      
      return await getSignedUrl(bucketName, fileName);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      // Return the original URL if we can't generate a signed URL
      return imageUrl;
    }
  }
}