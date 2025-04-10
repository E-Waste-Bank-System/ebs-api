import prisma from '../config/database';
import { Transaction, Schedule, ScheduleStatus, TransactionStatus, PickupType } from '../models/types';
import { AppError } from '../utils/error';

export class TransactionService {
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: { userId },
      include: {
        ewaste: true,
        schedule: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return prisma.transaction.findMany({
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
  }

  async getUserSchedules(userId: string): Promise<Schedule[]> {
    return prisma.schedule.findMany({
      where: { userId },
      include: {
        transaction: {
          include: {
            ewaste: true
          }
        }
      },
      orderBy: { pickupDate: 'asc' }
    });
  }

  async updateScheduleStatus(id: string, userId: string, status: ScheduleStatus): Promise<Schedule> {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: { transaction: true }
    });

    if (!schedule) {
      throw new AppError(404, 'Schedule not found');
    }

    if (schedule.userId !== userId) {
      throw new AppError(403, 'Not authorized to update this schedule');
    }

    return prisma.schedule.update({
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
  }

  async createSchedule(transactionId: string, userId: string, pickupDate: Date, pickupType: PickupType): Promise<Schedule> {
    return prisma.schedule.create({
      data: {
        transactionId,
        userId,
        pickupDate,
        pickupType,
        status: 'PENDING' as ScheduleStatus
      }
    });
  }
}