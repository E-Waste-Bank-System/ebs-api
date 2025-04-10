import { AppError } from './error';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateRequired = (fields: Record<string, any>, requiredFields: string[]): void => {
  for (const field of requiredFields) {
    if (!fields[field]) {
      throw new AppError(400, `${field} is required`);
    }
  }
};

export const validateFileType = (mimetype: string): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  return allowedTypes.includes(mimetype);
};

export const validateFileSize = (size: number): boolean => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return size <= maxSize;
};