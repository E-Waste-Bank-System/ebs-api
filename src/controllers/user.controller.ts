import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';

export const getProfile = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  res.json({
    status: 'success',
    data: { user }
  });
};

export const updateProfile = async (req: Request, res: Response) => {
  const { name, email } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name, email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  res.json({
    status: 'success',
    data: { user }
  });
};

export const uploadEwaste = async (req: Request, res: Response) => {
  const { category, weight } = req.body;
  const image = req.file?.path;

  if (!image) {
    throw new AppError(400, 'Image is required');
  }

  const ewaste = await prisma.ewaste.create({
    data: {
      userId: req.user.id,
      category,
      weight: parseFloat(weight),
      image
    }
  });

  res.status(201).json({
    status: 'success',
    data: { ewaste }
  });
};

export const getTransactions = async (req: Request, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user.id },
    include: {
      ewaste: true,
      schedule: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { transactions }
  });
};

export const getSchedules = async (req: Request, res: Response) => {
  const schedules = await prisma.schedule.findMany({
    where: { userId: req.user.id },
    include: {
      transaction: {
        include: {
          ewaste: true
        }
      }
    },
    orderBy: { pickupDate: 'asc' }
  });

  res.json({
    status: 'success',
    data: { schedules }
  });
};

export const confirmSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const schedule = await prisma.schedule.update({
    where: { id },
    data: { status },
    include: {
      transaction: {
        include: {
          ewaste: true
        }
      }
    }
  });

  res.json({
    status: 'success',
    data: { schedule }
  });
}; 