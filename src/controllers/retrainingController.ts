import { Request, Response, NextFunction } from 'express';
import * as retrainingService from '../services/retrainingService';
import { AuthRequest } from '../types/auth';
import { supabase } from '../config/supabase';

export async function createRetrainingEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      image_url,
      original_category,
      bbox_coordinates,
      confidence_score,
      model_version,
      user_id,
      object_id,
      corrected_price
    } = req.body;

    // Validate required fields
    if (!image_url || !original_category || !bbox_coordinates || 
        !model_version || !user_id || !object_id) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const data = await retrainingService.createRetrainingData({
      image_url,
      original_category,
      bbox_coordinates,
      confidence_score: parseFloat(confidence_score) || 0,
      corrected_category: null,
      corrected_price: corrected_price ? parseFloat(corrected_price) : null,
      model_version,
      user_id,
      object_id,
      verified_by: null,
      updated_at: new Date().toISOString()
    });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getAllRetrainingData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '10', status, category, start_date, end_date } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabase
      .from('retraining_data')
      .select('*', { count: 'exact' });

    if (status === 'verified') {
      query = query.eq('verified', true);
    } else if (status === 'unverified') {
      query = query.eq('verified', false);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, count, error } = await query
      .range(offset, offset + parseInt(limit as string) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({
      data,
      total: count,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
  } catch (err) {
    next(err);
  }
}

export async function getRetrainingDataById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('retraining_data')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ message: 'Retraining data not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateRetrainingData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('retraining_data')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ message: 'Retraining data not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function verifyRetrainingData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('retraining_data')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ message: 'Retraining data not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteRetrainingData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('retraining_data')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getUnverifiedSamples(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('retraining_data')
      .select('*')
      .eq('verified', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function exportVerifiedData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('retraining_data')
      .select('*')
      .eq('verified', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getRetrainingDataByObjectId(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { object_id } = req.params;
    const { data, error } = await supabase
      .from('retraining_data')
      .select('*')
      .eq('object_id', object_id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /retraining
export async function getRetrainingData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase.from('retraining_data').select('*').order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ message: 'Failed to fetch retraining data' });
      return;
    }
    res.json(data);
  } catch (err: unknown) {
    next(err);
  }
}

// POST /retraining/submit
export async function submitRetrainingRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user_id, image_url, label } = req.body;
    if (!user_id || !image_url || !label) {
      res.status(400).json({ message: 'user_id, image_url, and label are required' });
      return;
    }
    const { data, error } = await supabase.from('retraining_data').insert([{ user_id, image_url, label }]).select();
    if (error) {
      res.status(500).json({ message: 'Failed to submit retraining request' });
      return;
    }
    res.status(201).json(data[0]);
  } catch (err: unknown) {
    next(err);
  }
}