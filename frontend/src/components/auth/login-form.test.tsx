import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './login-form';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
  }),
}));

vi.mock('@/services/auth-service', () => ({
  authService: {
    login: vi.fn(),
  },
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn().mockReturnValue({
    login: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn, onSuccess, onError }: any) => ({
    mutate: async (data: any) => {
      try {
        const result = await mutationFn(data);
        onSuccess(result);
      } catch (error) {
        onError(error);
      }
    },
  }),
}));

describe('LoginForm', () => {
  it('renders the login form correctly', () => {
    render(<LoginForm />);
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('validates form inputs', async () => {
    render(<LoginForm />);
    
    // Submit without filling in fields
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // Wait for validation messages
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('submits the form with valid data', async () => {
    const mockLogin = vi.fn();
    const mockToast = vi.fn();
    const mockNavigate = vi.fn();
    
    // Mock successful login response
    (authService.login as any).mockResolvedValue({
      user: { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      token: 'fake-token',
      refreshToken: 'fake-refresh-token',
    });
    
    (useAuthStore as any).mockReturnValue({ login: mockLogin });
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    render(<LoginForm />);
    
    // Fill in form fields
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // Verify service was called with correct data
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
      });
    });
  });
});