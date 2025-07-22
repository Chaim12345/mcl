import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const location = useLocation();
  
  // If we have a token but no user data, fetch the current user
  const shouldFetchUser = isAuthenticated && !user;
  
  const { isLoading, data: userData, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getCurrentUser,
    enabled: shouldFetchUser,
    retry: false,
  });

  // Handle successful user data fetch
  useEffect(() => {
    if (userData && shouldFetchUser) {
      const token = useAuthStore.getState().token;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (token && refreshToken) {
        login(userData, token, refreshToken);
      }
    }
  }, [userData, shouldFetchUser, login]);

  // Handle error in user data fetch
  useEffect(() => {
    if (error && shouldFetchUser) {
      logout();
    }
  }, [error, shouldFetchUser, logout]);
  
  // If we're loading user data, show nothing yet
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // For protected routes
  if (requireAuth && !isAuthenticated) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // For auth routes (login, register) when user is already authenticated
  if (!requireAuth && isAuthenticated) {
    // Redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  // If all checks pass, render the children
  return <>{children}</>;
}