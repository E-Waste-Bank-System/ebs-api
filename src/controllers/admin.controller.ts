import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/error';

export const getDashboardStats = async (req: Request, res: Response) => {
  const [
    totalUsers,
    totalEwaste,
    totalTransactions,
    pendingEwaste
  ] = await Promise.all([
    prisma.user.count(),
    prisma.ewaste.count(),
    prisma.transaction.count(),
    prisma.ewaste.count({
      where: { status: 'PENDING' }
    })
  ]);

  res.json({
    status: 'success',
    data: {
      totalUsers,
      totalEwaste,
      totalTransactions,
      pendingEwaste
    }
  });
};

export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { users }
  });
};

export const blockUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.update({
    where: { id },
    data: { isBlocked: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBlocked: true
    }
  });

  res.json({
    status: 'success',
    data: { user }
  });
};

export const getPendingEwaste = async (req: Request, res: Response) => {
  const ewastes = await prisma.ewaste.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { ewastes }
  });
};

export const approveEwaste = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { price } = req.body;

  const ewaste = await prisma.ewaste.update({
    where: { id },
    data: { status: 'APPROVED' }
  });

  const transaction = await prisma.transaction.create({
    data: {
      ewasteId: ewaste.id,
      userId: ewaste.userId,
      totalPrice: price
    }
  });

  res.json({
    status: 'success',
    data: { transaction }
  });
};

export const rejectEwaste = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const ewaste = await prisma.ewaste.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason
    }
  });

  res.json({
    status: 'success',
    data: { ewaste }
  });
};

export const getTransactions = async (req: Request, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    include: {
      ewaste: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      schedule: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { transactions }
  });
};

export const updatePricing = async (req: Request, res: Response) => {
  const { category, price } = req.body;

  // Here you would typically update pricing in a separate pricing table
  // For now, we'll just return success
  res.json({
    status: 'success',
    message: 'Pricing updated successfully'
  });
}; 