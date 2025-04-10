import { Response } from 'express';

interface SuccessResponse {
    status: 'success';
    data?: any;
    message?: string;
  }
  
  interface ErrorResponse {
    status: 'error';
    message: string;
    errors?: any;
  }
  
  /**
   * Send a success response with the given data
   * @param res Express Response object
   * @param status HTTP status code (default: 200)
   * @param message Success message (default: 'Success')
   * @param data Data to send (default: null)
   * @returns void
   */
  export const successResponse = (
    res: Response, 
    status: number = 200, 
    message: string = 'Success', 
    data: any = null
  ): void => {
    res.status(status).json({
      status: 'success',
      message,
      data
    });
  };
  
  /**
   * Send an error response with the given error message
   * @param res Express Response object
   * @param status HTTP status code
   * @param message Error message
   */
  export const errorResponse = (
    res: Response, 
    status: number = 500, 
    message: string = 'Error'
  ): void => {
    res.status(status).json({
      status: 'error',
      message
    });
  };
  
  export const paginationResponse = (data: any[], page: number, limit: number, total: number): SuccessResponse => ({
    status: 'success',
    data: {
      items: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });