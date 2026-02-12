import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ApiError } from '@/types/api';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiClient {
  private userId: string;
  private client: AxiosInstance;

  constructor(userId: string = 'user-1') {
    this.userId = userId;

    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // If needed for cookies, though we use custom headers
    });

    // Request interceptor to add dynamic headers
    this.client.interceptors.request.use((config) => {
      config.headers['X-User-ID'] = this.userId;
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          statusCode: error.response?.status || 500,
          error: error.message,
          message: (error.response?.data as any)?.message || 'An error occurred',
          timestamp: new Date().toISOString(),
          path: error.config?.url || '',
        };
        return Promise.reject(apiError);
      }
    );
  }

  setUser(userId: string) {
    this.userId = userId;
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(path, config);
    return response.data;
  }

  async post<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(path, body, config);
    return response.data;
  }

  async patch<T>(path: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(path, body, config);
    return response.data;
  }

  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(path, config);
    return response.data;
  }
}

// Singleton instance
export const apiClient = new ApiClient();
