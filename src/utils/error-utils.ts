/**
 * Utility functions for handling errors consistently throughout the application
 */

/**
 * Interface for errors that contain a message property
 */
export interface ErrorWithMessage {
  message: string;
}

/**
 * Type guard to check if an error object has a message property
 * @param error - The error to check
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Convert an unknown error to a string message
 * @param error - The error to convert
 */
export function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) return error;
  
  try {
    return { message: JSON.stringify(error) };
  } catch {
    // fallback in case there are circular references
    return { message: String(error) };
  }
}

/**
 * Extract a message from an unknown error
 * @param error - The error to extract the message from
 */
export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}