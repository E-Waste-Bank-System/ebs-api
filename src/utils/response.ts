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
  
  export const successResponse = (data?: any, message?: string): SuccessResponse => ({
    status: 'success',
    data,
    message
  });
  
  export const errorResponse = (message: string, errors?: any): ErrorResponse => ({
    status: 'error',
    message,
    errors
  });
  
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