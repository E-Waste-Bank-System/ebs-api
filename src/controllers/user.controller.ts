import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { EwasteService } from '../services/ewaste.service';
import { AppError } from '../utils/error';
import { successResponse } from '../utils/response';

// Define transaction interface
interface Transaction {
  id: string;
  ewaste_id: string;
  user_id: string;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  ewaste?: {
    category: string;
    weight: number;
    image: string;
  } | null;
  [key: string]: any;
}

// Define schedule interface
interface Schedule {
  id: string;
  transaction_id: string;
  user_id: string;
  pickup_date: string;
  pickup_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  transaction?: {
    id: string;
    total_price: number;
    status: string;
    ewaste_id: string;
  } | null;
  [key: string]: any;
}

const ewasteService = new EwasteService();

// Get user profile
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      throw new AppError(404, 'Profile not found');
    }

    successResponse(res, 200, 'Profile retrieved successfully', {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const { name, email } = req.body;

    // Validate input
    if (!name && !email) {
      throw new AppError(400, 'No data provided for update');
    }

    // Prepare update data
    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Update in Supabase
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    // If email was updated, also update auth user
    if (email && email !== req.user.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        req.user.id,
        { email }
      );

      if (authError) {
        throw new AppError(400, authError.message);
      }
    }

    successResponse(res, 200, 'Profile updated successfully', {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// Upload e-waste
export const uploadEwaste = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const { category, weight } = req.body;
    const imageUrl = req.fileUrl;

    if (!imageUrl) {
      throw new AppError(400, 'No image uploaded');
    }

    if (!category) {
      throw new AppError(400, 'Category is required');
    }

    if (!weight || isNaN(parseFloat(weight))) {
      throw new AppError(400, 'Valid weight is required');
    }

    const ewaste = await ewasteService.createEwaste(
      req.user.id,
      category,
      parseFloat(weight),
      imageUrl
    );

    successResponse(res, 201, 'E-waste uploaded successfully', ewaste);
  } catch (error) {
    next(error);
  }
};

// Get user transactions
export const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        ewaste:ewaste_id (
          category,
          weight,
          image
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(400, error.message);
    }

    // Transform the data to match the expected format
    const transactions = (data || []).map((transaction: Transaction) => ({
      id: transaction.id,
      ewasteId: transaction.ewaste_id,
      userId: transaction.user_id,
      totalPrice: transaction.total_price,
      status: transaction.status,
      ewaste: transaction.ewaste ? {
        category: transaction.ewaste.category,
        weight: transaction.ewaste.weight,
        image: transaction.ewaste.image
      } : null,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    }));

    successResponse(res, 200, 'Transactions retrieved successfully', transactions);
  } catch (error) {
    next(error);
  }
};

// Get user schedules
export const getSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        transaction:transaction_id (
          id,
          total_price,
          status,
          ewaste_id
        )
      `)
      .eq('user_id', req.user.id)
      .order('pickup_date', { ascending: true });

    if (error) {
      throw new AppError(400, error.message);
    }

    // Transform the data to match the expected format
    const schedules = (data || []).map((schedule: Schedule) => ({
      id: schedule.id,
      transactionId: schedule.transaction_id,
      userId: schedule.user_id,
      pickupDate: schedule.pickup_date,
      pickupType: schedule.pickup_type,
      status: schedule.status,
      transaction: schedule.transaction ? {
        id: schedule.transaction.id,
        totalPrice: schedule.transaction.total_price,
        status: schedule.transaction.status,
        ewasteId: schedule.transaction.ewaste_id
      } : null,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at
    }));

    successResponse(res, 200, 'Schedules retrieved successfully', schedules);
  } catch (error) {
    next(error);
  }
};

// Update schedule
export const updateSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const { id } = req.params;
    const { pickupDate, pickupType, status } = req.body;

    // Check if schedule exists and belongs to user
    const { data: existingSchedule, error: findError } = await supabase
      .from('schedules')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (findError || !existingSchedule) {
      throw new AppError(404, 'Schedule not found or not authorized');
    }

    // Prepare update data
    const updateData: Record<string, any> = {};
    if (pickupDate) updateData.pickup_date = pickupDate;
    if (pickupType) updateData.pickup_type = pickupType;
    if (status) updateData.status = status;

    // Update the schedule
    const { data, error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(400, error.message);
    }

    successResponse(res, 200, 'Schedule updated successfully', {
      id: data.id,
      transactionId: data.transaction_id,
      userId: data.user_id,
      pickupDate: data.pickup_date,
      pickupType: data.pickup_type,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    next(error);
  }
}; 