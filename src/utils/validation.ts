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

/**
 * Validation utilities for authentication
 */

/**
 * Validates registration input
 * @param name User's name
 * @param email User's email
 * @param password User's password
 * @returns Error message if validation fails, null otherwise
 */
export const validateRegister = (
  name: string, 
  email: string, 
  password: string
): string | null => {
  // Validate name
  if (!name || name.trim() === '') {
    return 'Name is required';
  }

  // Validate email
  if (!email || !isValidEmail(email)) {
    return 'Please provide a valid email address';
  }

  // Validate password
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }

  return null;
};

/**
 * Validates login input
 * @param email User's email
 * @param password User's password
 * @returns Error message if validation fails, null otherwise
 */
export const validateLogin = (
  email: string, 
  password: string
): string | null => {
  // Validate email
  if (!email || !isValidEmail(email)) {
    return 'Please provide a valid email address';
  }

  // Validate password
  if (!password) {
    return 'Password is required';
  }

  return null;
};

/**
 * Validates email format
 * @param email Email to validate
 * @returns Boolean indicating if email is valid
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates category
 * @param category Category to validate
 * @returns Error message if validation fails, null otherwise
 */
export const validateCategory = (category: string): string | null => {
  if (!category || category.trim() === '') {
    return 'Category is required';
  }

  // Add more validation rules if needed
  return null;
};

/**
 * Validates weight
 * @param weight Weight to validate
 * @returns Error message if validation fails, null otherwise
 */
export const validateWeight = (weight: number | string): string | null => {
  const weightNum = typeof weight === 'string' ? parseFloat(weight) : weight;

  if (isNaN(weightNum)) {
    return 'Weight must be a number';
  }

  if (weightNum <= 0) {
    return 'Weight must be greater than 0';
  }

  return null;
};

/**
 * Validates price
 * @param price Price to validate
 * @returns Error message if validation fails, null otherwise
 */
export const validatePrice = (price: number | string): string | null => {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(priceNum)) {
    return 'Price must be a number';
  }

  if (priceNum < 0) {
    return 'Price cannot be negative';
  }

  return null;
};