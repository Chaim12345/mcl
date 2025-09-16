import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { User } from '@/types';
import { authService } from '@/services/auth-service';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastActivity: number | null;
  sessionTimeout: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (token: string | null, refreshToken: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsRefreshing: (isRefreshing: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: (reason?: 'manual' | 'expired' | 'error') => void;
  refreshTokens: () => Promise<boolean>;
  updateLastActivity: () => void;
  clearError: () => void;
  checkSession: () => boolean;
}

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Token refresh threshold in milliseconds (5 minutes before expiration)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastActivity: null,
        sessionTimeout: SESSION_TIMEOUT,
        
        setUser: (user) => set({ user }),
        
        setTokens: (token, refreshToken) => {
          set({ token, refreshToken });
          if (token) {
            get().updateLastActivity();
          }
        },
        
        setIsLoading: (isLoading) => set({ isLoading }),
        
        setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
        
        setError: (error) => set({ error }),
        
        clearError: () => set({ error: null }),
        
        login: (user, token, refreshToken) => {
          const now = Date.now();
          set({ 
            user, 
            token, 
            refreshToken, 
            isAuthenticated: true,
            error: null,
            lastActivity: now,
            isLoading: false
          });
        },
        
        logout: (reason = 'manual') => {
          // Clear the store state
          set({ 
            user: null, 
            token: null, 
            refreshToken: null, 
            isAuthenticated: false,
            isLoading: false,
            isRefreshing: false,
            error: null,
            lastActivity: null
          });
          
          // Clear local storage
          localStorage.removeItem('auth-storage');
          
          // Optionally handle different logout reasons
          if (reason === 'expired') {
            // Could show a toast or redirect to login with a message
            console.warn('Session expired. Please log in again.');
          } else if (reason === 'error') {
            console.error('Authentication error. Please log in again.');
          }
          
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        },
        
        refreshTokens: async (): Promise<boolean> => {
          const { refreshToken, isRefreshing } = get();
          
          if (!refreshToken || isRefreshing) {
            return false;
          }
          
          try {
            set({ isRefreshing: true, error: null });
            
            const response = await authService.refreshToken(refreshToken);
            
            set({
              token: response.token,
              refreshToken: response.refreshToken,
              isRefreshing: false,
              lastActivity: Date.now(),
            });
            
            return true;
          } catch (error: any) {
            console.error('Token refresh failed:', error);
            set({ isRefreshing: false });
            get().logout('error');
            return false;
          }
        },
        
        updateLastActivity: () => {
          set({ lastActivity: Date.now() });
        },
        
        checkSession: (): boolean => {
          const { isAuthenticated, lastActivity, sessionTimeout } = get();
          
          if (!isAuthenticated || !lastActivity) {
            return false;
          }
          
          const now = Date.now();
          const timeSinceLastActivity = now - lastActivity;
          
          if (timeSinceLastActivity > sessionTimeout) {
            get().logout('expired');
            return false;
          }
          
          return true;
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
          lastActivity: state.lastActivity,
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.isAuthenticated) {
            // Check if session is still valid after rehydration
            const isValidSession = state.checkSession();
            if (!isValidSession) {
              state.logout('expired');
            }
          }
        },
      }
    )
  )
);

// Helper function to decode JWT token and get expiration
function getTokenExpiration(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch {
    return null;
  }
}

// Auto-refresh tokens when they're about to expire
let refreshIntervalId: NodeJS.Timeout | null = null;

export function startTokenRefreshInterval() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
  }
  
  refreshIntervalId = setInterval(() => {
    const state = useAuthStore.getState();
    
    if (!state.isAuthenticated || !state.token) {
      return;
    }
    
    const tokenExp = getTokenExpiration(state.token);
    if (!tokenExp) {
      return;
    }
    
    const now = Date.now();
    const timeUntilExpiry = tokenExp - now;
    
    // Refresh token if it expires within the threshold
    if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0) {
      state.refreshTokens();
    } else if (timeUntilExpiry <= 0) {
      // Token has already expired
      state.logout('expired');
    }
  }, 60000); // Check every minute
}

export function stopTokenRefreshInterval() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

// Activity tracking for auto-logout
let activityTimeoutId: NodeJS.Timeout | null = null;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

function handleUserActivity() {
  const state = useAuthStore.getState();
  if (state.isAuthenticated) {
    state.updateLastActivity();
    
    // Reset the activity timeout
    if (activityTimeoutId) {
      clearTimeout(activityTimeoutId);
    }
    
    activityTimeoutId = setTimeout(() => {
      const currentState = useAuthStore.getState();
      if (currentState.isAuthenticated) {
        currentState.logout('expired');
      }
    }, SESSION_TIMEOUT);
  }
}

export function startActivityTracking() {
  // Add event listeners for user activity
  ACTIVITY_EVENTS.forEach(eventName => {
    document.addEventListener(eventName, handleUserActivity, true);
  });
}

export function stopActivityTracking() {
  // Remove event listeners
  ACTIVITY_EVENTS.forEach(eventName => {
    document.removeEventListener(eventName, handleUserActivity, true);
  });
  
  if (activityTimeoutId) {
    clearTimeout(activityTimeoutId);
    activityTimeoutId = null;
  }
}

// Subscribe to auth state changes to manage intervals
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      startTokenRefreshInterval();
      startActivityTracking();
    } else {
      stopTokenRefreshInterval();
      stopActivityTracking();
    }
  }
);