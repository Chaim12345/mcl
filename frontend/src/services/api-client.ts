import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError, ApiResponse } from '@/types';

// Create axios instance
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug logging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('API Client initialized with baseURL:', '/api');
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
      });
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        
        if (!refreshToken) {
          // No refresh token, logout
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
        
        // Try to refresh token
        const response = await axios.post<ApiResponse<{ token: string, refreshToken: string }>>('/api/auth/refresh', {
          refreshToken,
        });
        
        const { token, refreshToken: newRefreshToken } = response.data.data;
        
        // Update tokens in store
        useAuthStore.getState().setTokens(token, newRefreshToken);
        
        // Retry original request with new token
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        };
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    // Format error response
    const errorData = error.response?.data as any;
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: errorData,
        url: error.config?.url,
        method: error.config?.method,
      });
    }
    
    const errorResponse: ApiError = {
      code: errorData?.code || 'unknown_error',
      message: errorData?.message || error.message || 'An unexpected error occurred',
      details: errorData?.details,
    };
    
    return Promise.reject(errorResponse);
  }
);

// Helper methods for API calls
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.get<ApiResponse<T>>(url, config).then((res) => res.data.data),
    
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.post<ApiResponse<T>>(url, data, config).then((res) => res.data.data),
    
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.put<ApiResponse<T>>(url, data, config).then((res) => res.data.data),
    
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.delete<ApiResponse<T>>(url, config).then((res) => res.data.data),
};

export default apiClient;