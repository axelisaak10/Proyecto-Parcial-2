export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export function apiSuccess<T>(
  data: T,
  message = 'Operation successful',
  statusCode = 200
): ApiResponse<T> {
  return {
    statusCode,
    message,
    data,
  };
}

export function apiError(message: string, statusCode = 400): ApiResponse<null> {
  return {
    statusCode,
    message,
    data: null,
  };
}
