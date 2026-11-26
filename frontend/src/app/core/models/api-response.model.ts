export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database: string;
  timestamp: string;
}
