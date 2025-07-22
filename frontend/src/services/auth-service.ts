import { api } from './api-client';
import { AuthResponse, LoginCredentials, RegisterData } from '@/types';

export const authService = {
  login: (credentials: LoginCredentials) => 
    api.post<AuthResponse>('/auth/login', credentials),
    
  register: (data: RegisterData) => 
    api.post<AuthResponse>('/auth/register', data),
    
  logout: () => 
    api.post<{ success: boolean }>('/auth/logout'),
    
  forgotPassword: (email: string) => 
    api.post<{ success: boolean }>('/auth/forgot-password', { email }),
    
  resetPassword: (token: string, password: string) => 
    api.post<{ success: boolean }>('/auth/reset-password', { token, password }),
    
  verifyEmail: (token: string) => 
    api.post<{ success: boolean }>('/auth/verify-email', { token }),
    
  refreshToken: (refreshToken: string) => 
    api.post<{ token: string, refreshToken: string }>('/auth/refresh', { refreshToken }),
    
  getCurrentUser: () => 
    api.get<AuthResponse['user']>('/auth/me'),
};