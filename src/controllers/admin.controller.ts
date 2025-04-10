import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { EwasteService } from '../services/ewaste.service';
import { AppError } from '../utils/error';
import { successResponse } from '../utils/response';

// Define transaction interface
interface Transaction {
  id: string;
  total_price: number;
  [key: string]: any; // Allow other properties
}

// Define user interface
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Allow other properties
}

const ewasteService = new EwasteService();

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    // Count total users
    const { count: totalUsers, error: userError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (userError) {
      throw new AppError(500, 'Failed to fetch user statistics');
    }

    // Count total pending e-waste
    const { count: pendingEwaste, error: pendingError } = await supabase
      .from('ewastes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (pendingError) {
      throw new AppError(500, 'Failed to fetch e-waste statistics');
    }

    // Count total approved e-waste
    const { count: approvedEwaste, error: approvedError } = await supabase
      .from('ewastes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'APPROVED');

    if (approvedError) {
      throw new AppError(500, 'Failed to fetch e-waste statistics');
    }

    // Get total transactions amount
    const { data: transactionsData, error: transactionError } = await supabase
      .from('transactions')
      .select('total_price');

    if (transactionError) {
      throw new AppError(500, 'Failed to fetch transaction statistics');
    }

    const totalAmount = (transactionsData as Transaction[]).reduce(
      (sum: number, transaction: Transaction) => sum + transaction.total_price, 
      0
    );

    // Return dashboard stats
    successResponse(res, 200, 'Dashboard statistics retrieved successfully', {
      totalUsers: totalUsers || 0,
      pendingEwaste: pendingEwaste || 0,
      approvedEwaste: approvedEwaste || 0,
      totalTransactions: transactionsData.length,
      totalAmount,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_blocked, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(500, 'Failed to fetch users');
    }

    // Transform data to match expected format
    const formattedUsers = (users as User[]).map((user: User) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: user.is_blocked,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    successResponse(res, 200, 'Users retrieved successfully', formattedUsers);
  } catch (error) {
    next(error);
  }
};

// Block/unblock user
export const blockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { id } = req.params;
    const { block } = req.body;

    // Check if user exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, is_blocked')
      .eq('id', id)
      .single();

    if (findError || !existingUser) {
      throw new AppError(404, 'User not found');
    }

    // Don't allow blocking other admins
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (roleError) {
      throw new AppError(500, 'Failed to check user role');
    }

    if (userRole.role === 'ADMIN') {
      throw new AppError(403, 'Cannot block admin users');
    }

    // Toggle block status if not specified
    const isBlocked = typeof block === 'boolean' ? block : !existingUser.is_blocked;

    // Update user
    const { data, error } = await supabase
      .from('users')
      .update({ is_blocked: isBlocked })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(500, 'Failed to update user');
    }

    successResponse(res, 200, `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      isBlocked: data.is_blocked,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// Get pending e-waste
export const getPendingEwaste = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const ewastes = await ewasteService.getPendingEwastes();
    
    // Get user details for each e-waste
    const ewastesWithUser = await Promise.all(
      ewastes.map(async (ewaste) => {
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', ewaste.userId)
          .single();
        
        return {
          ...ewaste,
          user: error ? null : userData
        };
      })
    );

    successResponse(res, 200, 'Pending e-waste retrieved successfully', ewastesWithUser);
  } catch (error) {
    next(error);
  }
};

// Approve e-waste
export const approveEwaste = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { id } = req.params;
    const { price } = req.body;

    if (!price || isNaN(parseFloat(price))) {
      throw new AppError(400, 'Valid price is required');
    }

    // Get e-waste details first
    const ewaste = await ewasteService.getEwasteById(id);

    // Approve the e-waste
    const approvedEwaste = await ewasteService.approveEwaste(id);

    // Create a transaction for the approved e-waste
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        ewaste_id: id,
        user_id: ewaste.userId,
        total_price: parseFloat(price),
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) {
      throw new AppError(500, 'Failed to create transaction');
    }

    successResponse(res, 200, 'E-waste approved successfully', {
      ewaste: approvedEwaste,
      transaction: {
        id: transaction.id,
        ewasteId: transaction.ewaste_id,
        userId: transaction.user_id,
        totalPrice: transaction.total_price,
        status: transaction.status,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reject e-waste
export const rejectEwaste = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      throw new AppError(400, 'Rejection reason is required');
    }

    const rejectedEwaste = await ewasteService.rejectEwaste(id, reason);

    successResponse(res, 200, 'E-waste rejected successfully', rejectedEwaste);
  } catch (error) {
    next(error);
  }
};

// Get all transactions
export const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        ewaste:ewaste_id (
          category,
          weight,
          image
        ),
        user:user_id (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(500, 'Failed to fetch transactions');
    }

    // Transform data to match expected format
    const transactions = (data || []).map((transaction: any) => ({
      id: transaction.id,
      ewasteId: transaction.ewaste_id,
      userId: transaction.user_id,
      totalPrice: transaction.total_price,
      status: transaction.status,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      ewaste: transaction.ewaste,
      user: transaction.user
    }));

    successResponse(res, 200, 'Transactions retrieved successfully', transactions);
  } catch (error) {
    next(error);
  }
};

// Set category pricing
export const setPricing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { category, pricePerKg } = req.body;

    if (!category || category.trim() === '') {
      throw new AppError(400, 'Category is required');
    }

    if (!pricePerKg || isNaN(parseFloat(pricePerKg))) {
      throw new AppError(400, 'Valid price per kg is required');
    }

    // Check if pricing for this category already exists
    const { data: existingPricing, error: findError } = await supabase
      .from('pricing')
      .select('id')
      .eq('category', category)
      .single();

    let data;
    let error;

    if (findError) {
      // Create new pricing
      ({ data, error } = await supabase
        .from('pricing')
        .insert({
          category,
          price_per_kg: parseFloat(pricePerKg)
        })
        .select()
        .single());
    } else {
      // Update existing pricing
      ({ data, error } = await supabase
        .from('pricing')
        .update({
          price_per_kg: parseFloat(pricePerKg)
        })
        .eq('id', existingPricing.id)
        .select()
        .single());
    }

    if (error) {
      throw new AppError(500, 'Failed to set pricing');
    }

    successResponse(res, 200, 'Pricing set successfully', {
      id: data.id,
      category: data.category,
      pricePerKg: data.price_per_kg,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    next(error);
  }
}; 