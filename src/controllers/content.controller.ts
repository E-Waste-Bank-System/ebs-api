import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/error';

export const getContents = async (req: Request, res: Response) => {
  const contents = await prisma.content.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { contents }
  });
};

export const getContent = async (req: Request, res: Response) => {
  const { id } = req.params;

  const content = await prisma.content.findUnique({
    where: { id }
  });

  if (!content) {
    throw new AppError(404, 'Content not found');
  }

  res.json({
    status: 'success',
    data: { content }
  });
};

export const createContent = async (req: Request, res: Response) => {
  const { title, body, type, imageUrl } = req.body;

  const content = await prisma.content.create({
    data: {
      title,
      body,
      type,
      imageUrl
    }
  });

  res.status(201).json({
    status: 'success',
    data: { content }
  });
};

export const updateContent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, body, type, imageUrl } = req.body;

  const content = await prisma.content.update({
    where: { id },
    data: {
      title,
      body,
      type,
      imageUrl
    }
  });

  res.json({
    status: 'success',
    data: { content }
  });
};

export const deleteContent = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.content.delete({
    where: { id }
  });

  res.json({
    status: 'success',
    message: 'Content deleted successfully'
  });
}; 