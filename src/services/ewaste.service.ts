import prisma from '../config/database';
import { Ewaste, EwasteStatus, Transaction } from '../models/types';
import { AppError } from '../utils/error';

export class EwasteService {
  async createEwaste(userId: string, category: string, weight: number, image: string): Promise<Ewaste> {
    return prisma.ewaste.create({
      data: {
        userId,
        category,
        weight,
        image,
        status: 'PENDING' as EwasteStatus
      }
    });
  }

  async getPendingEwaste(): Promise<Ewaste[]> {
    return prisma.ewaste.findMany({
      where: { status: 'PENDING' as EwasteStatus },
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
  }

  async approveEwaste(id: string, price: number): Promise<Transaction> {
    const ewaste = await prisma.ewaste.update({
      where: { id },
      data: { status: 'APPROVED' as EwasteStatus }
    });

    return prisma.transaction.create({
      data: {
        ewasteId: ewaste.id,
        userId: ewaste.userId,
        totalPrice: price
      }
    });
  }

  async rejectEwaste(id: string, reason: string): Promise<Ewaste> {
    return prisma.ewaste.update({
      where: { id },
      data: {
        status: 'REJECTED' as EwasteStatus,
        rejectionReason: reason
      }
    });
  }

  async getUserEwaste(userId: string): Promise<Ewaste[]> {
    return prisma.ewaste.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}