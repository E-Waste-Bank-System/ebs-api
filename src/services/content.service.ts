import prisma from '../config/database';
import { Content, ContentType } from '../models/types';
import { AppError } from '../utils/error';

export class ContentService {
  async getAllContent(): Promise<Content[]> {
    return prisma.content.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getContentById(id: string): Promise<Content> {
    const content = await prisma.content.findUnique({
      where: { id }
    });

    if (!content) {
      throw new AppError(404, 'Content not found');
    }

    return content;
  }

  async createContent(data: { title: string; body: string; type: ContentType; imageUrl?: string }): Promise<Content> {
    return prisma.content.create({
      data
    });
  }

  async updateContent(id: string, data: Partial<Content>): Promise<Content> {
    const content = await prisma.content.findUnique({
      where: { id }
    });

    if (!content) {
      throw new AppError(404, 'Content not found');
    }

    return prisma.content.update({
      where: { id },
      data
    });
  }

  async deleteContent(id: string): Promise<void> {
    const content = await prisma.content.findUnique({
      where: { id }
    });

    if (!content) {
      throw new AppError(404, 'Content not found');
    }

    await prisma.content.delete({
      where: { id }
    });
  }
}