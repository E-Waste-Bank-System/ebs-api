import { supabase } from '../config/supabase';
import { AppError } from '../utils/error';

export interface Content {
  id: string;
  title: string;
  body: string;
  type: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ContentService {
  async getAllContent(): Promise<Content[]> {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(500, error.message);
    }

    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      body: item.body,
      type: item.type,
      imageUrl: item.image_url,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  }

  async getContentById(id: string): Promise<Content> {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new AppError(404, 'Content not found');
    }

    return {
      id: data.id,
      title: data.title,
      body: data.body,
      type: data.type,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async createContent(
    title: string,
    body: string,
    type: string,
    imageUrl?: string
  ): Promise<Content> {
    const { data, error } = await supabase
      .from('contents')
      .insert({
        title,
        body,
        type,
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    return {
      id: data.id,
      title: data.title,
      body: data.body,
      type: data.type,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async updateContent(
    id: string,
    title: string,
    body: string,
    type: string,
    imageUrl?: string
  ): Promise<Content> {
    const updateData: Record<string, any> = {};
    if (title) updateData.title = title;
    if (body) updateData.body = body;
    if (type) updateData.type = type;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;

    const { data, error } = await supabase
      .from('contents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    return {
      id: data.id,
      title: data.title,
      body: data.body,
      type: data.type,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async deleteContent(id: string): Promise<void> {
    const { error } = await supabase
      .from('contents')
      .delete()
      .eq('id', id);

    if (error) {
      throw new AppError(400, error.message);
    }
  }
}