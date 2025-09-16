import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';
import { useToast } from '@/hooks/use-toast';
import { LoginCredentials, RegisterData, User } from '@/types';

interface UseAuthOptions {
  redirectTo?: string;
  redirectOnLogout?: string;
  showToasts?: boolean;
}

interface AuthHookReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: (reason?: 'manual' | 'expired' | 'error') => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  clearError: () => void;
  
  // Utilities
  checkPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  getDisplayName: () => string;
  getInitials: () => string;
  
  // Session management
  updateActivity: () => void;
  getSessionTimeRemaining: () => number;
  isSessionExpiringSoon: () => boolean;
}

export function useAuth(options: UseAuthOptions = {}): AuthHookReturn {
  const {
    redirectTo = '/dashboard',
    redirectOnLogout = '/login',
    showToasts = true,
  } = options;
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Auth store state
  const {
    user,
    isAuthenticated,
    isLoading,
    isRefreshing,
    error,
    lastActivity,
    sessionTimeout,
    login: storeLogin,
    logout: storeLogout,
    refreshTokens: storeRefreshTokens,
    clearError: storeClearError,
    updateLastActivity,
    checkSession,
  } = useAuthStore();
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      storeLogin(data.user, data.token, data.refreshToken);
      if (showToasts) {
        toast({
          title: 'Welcome back!',
          description: `Hello ${data.user.firstName}, you're successfully logged in.`,
        });
      }
      navigate(redirectTo);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Login failed';
      if (showToasts) {
        toast({
          title: 'Login failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: () => {
      if (showToasts) {
        toast({
          title: 'Registration successful!',
          description: 'Please check your email to verify your account.',
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Registration failed';
      if (showToasts) {
        toast({
          title: 'Registration failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });
  
  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      if (showToasts) {
        toast({
          title: 'Reset email sent',
          description: 'Check your inbox for password reset instructions.',
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Request failed';
      if (showToasts) {
        toast({
          title: 'Request failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => 
      authService.resetPassword(token, password),
    onSuccess: () => {
      if (showToasts) {
        toast({
          title: 'Password reset successful',
          description: 'Your password has been updated. You can now sign in.',
        });
      }
      navigate('/login');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Reset failed';
      if (showToasts) {
        toast({
          title: 'Reset failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });
  
  // Current user query (for session validation)
  const { refetch: refetchUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getCurrentUser,
    enabled: isAuthenticated && !!user,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Enhanced logout function
  const logout = useCallback((reason: 'manual' | 'expired' | 'error' = 'manual') => {
    storeLogout(reason);
    
    if (showToasts) {
      const messages = {
        manual: 'You have been logged out.',
        expired: 'Your session has expired. Please log in again.',
        error: 'Authentication error. Please log in again.',
      };
      
      toast({
        title: 'Logged out',
        description: messages[reason],
        variant: reason === 'manual' ? 'default' : 'destructive',
      });
    }
    
    navigate(redirectOnLogout);
  }, [storeLogout, showToasts, toast, navigate, redirectOnLogout]);
  
  // Action functions
  const login = useCallback(async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  }, [loginMutation]);
  
  const register = useCallback(async (data: RegisterData) => {
    await registerMutation.mutateAsync(data);
  }, [registerMutation]);
  
  const forgotPassword = useCallback(async (email: string) => {
    await forgotPasswordMutation.mutateAsync(email);
  }, [forgotPasswordMutation]);
  
  const resetPassword = useCallback(async (token: string, password: string) => {
    await resetPasswordMutation.mutateAsync({ token, password });
  }, [resetPasswordMutation]);
  
  // Utility functions
  const checkPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    // Implement permission checking logic based on your user model
    // This is a placeholder implementation
    return true;
  }, [user]);
  
  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    // Implement role checking logic based on your user model
    // This is a placeholder implementation
    return true;
  }, [user]);
  
  const getDisplayName = useCallback((): string => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);
  
  const getInitials = useCallback((): string => {
    if (!user) return '';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }, [user]);
  
  const getSessionTimeRemaining = useCallback((): number => {
    if (!lastActivity) return 0;
    const elapsed = Date.now() - lastActivity;
    return Math.max(0, sessionTimeout - elapsed);
  }, [lastActivity, sessionTimeout]);
  
  const isSessionExpiringSoon = useCallback((): boolean => {
    const remaining = getSessionTimeRemaining();
    return remaining > 0 && remaining < 5 * 60 * 1000; // Less than 5 minutes
  }, [getSessionTimeRemaining]);
  
  // Update activity on hook usage
  const updateActivity = useCallback(() => {
    if (isAuthenticated) {
      updateLastActivity();
    }
  }, [isAuthenticated, updateLastActivity]);
  
  // Session checking effect
  useEffect(() => {
    if (isAuthenticated) {
      const isValid = checkSession();
      if (!isValid) {
        logout('expired');
      }
    }
  }, [isAuthenticated, checkSession, logout]);
  
  // Periodic session validation
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      const isValid = checkSession();
      if (!isValid) {
        logout('expired');
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [isAuthenticated, checkSession, logout]);
  
  return {
    // State
    user,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    isRefreshing,
    error: error || loginMutation.error?.message || registerMutation.error?.message || null,
    
    // Actions
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    refreshTokens: storeRefreshTokens,
    clearError: storeClearError,
    
    // Utilities
    checkPermission,
    hasRole,
    getDisplayName,
    getInitials,
    
    // Session management
    updateActivity,
    getSessionTimeRemaining,
    isSessionExpiringSoon,
  };
}