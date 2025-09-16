/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/vibe-test-utils';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { BrowserRouter } from 'react-router-dom';

// Mock the auth service
const mockAuthService = {
  login: vi.fn(),
  register: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
};

vi.mock('@/services/auth-service', () => ({
  authService: mockAuthService,
}));

// Mock the auth store
const mockAuthStore = {
  login: vi.fn(),
  logout: vi.fn(),
  user: null,
  isAuthenticated: false,
};

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockAuthStore,
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('token=test-token'), vi.fn()],
  };
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Login Flow with Vibe Components', () => {
    it('completes successful login flow', async () => {
      const mockUser = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token: 'test-token',
        refreshToken: 'refresh-token',
      });

      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill in the form using Vibe components
      const emailField = screen.getByTestId('vibe-textfield');
      const passwordField = screen.getAllByTestId('vibe-textfield')[1];
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(emailField, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalledWith(
          mockUser,
          'test-token',
          'refresh-token'
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('handles login errors with Vibe error display', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailField = screen.getByTestId('vibe-textfield');
      const passwordField = screen.getAllByTestId('vibe-textfield')[1];
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(emailField, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalled();
      });

      // Should display error using Vibe AlertBanner
      await waitFor(() => {
        const errorBanner = screen.queryByTestId('vibe-alert-banner');
        expect(errorBanner).toBeInTheDocument();
      });
    });

    it('shows loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockAuthService.login.mockReturnValue(loginPromise);

      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailField = screen.getByTestId('vibe-textfield');
      const passwordField = screen.getAllByTestId('vibe-textfield')[1];
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password' } });
      fireEvent.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        expect(submitButton).toHaveAttribute('data-loading', 'true');
      });

      // Resolve the promise
      resolveLogin!({
        user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
        token: 'token',
        refreshToken: 'refresh',
      });

      await waitFor(() => {
        expect(submitButton).not.toHaveAttribute('data-loading', 'true');
      });
    });
  });

  describe('Registration Flow with Vibe Components', () => {
    it('completes successful registration flow', async () => {
      mockAuthService.register.mockResolvedValue({
        message: 'Registration successful',
      });

      renderWithProviders(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill in registration form
      const textFields = screen.getAllByTestId('vibe-textfield');
      const [firstNameField, lastNameField, emailField, passwordField, confirmPasswordField] = textFields;
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(firstNameField, { target: { value: 'John' } });
      fireEvent.change(lastNameField, { target: { value: 'Doe' } });
      fireEvent.change(emailField, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordField, { target: { value: 'Password123!' } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
        });
      });

      // Should show success message and verification prompt
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('validates password strength with Vibe components', async () => {
      renderWithProviders(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      const passwordField = screen.getAllByTestId('vibe-textfield')[3]; // Password field

      // Test weak password
      fireEvent.change(passwordField, { target: { value: 'weak' } });

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });

      // Test strong password
      fireEvent.change(passwordField, { target: { value: 'StrongPassword123!' } });

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Flow with Vibe Components', () => {
    it('completes forgot password flow', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({
        message: 'Reset email sent',
      });

      renderWithProviders(
        <TestWrapper>
          <ForgotPasswordForm />
        </TestWrapper>
      );

      const emailField = screen.getByTestId('vibe-textfield');
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(emailField, { target: { value: 'user@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('user@example.com');
      });

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('completes password reset flow', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset successful',
      });

      renderWithProviders(
        <TestWrapper>
          <ResetPasswordForm />
        </TestWrapper>
      );

      const passwordFields = screen.getAllByTestId('vibe-textfield');
      const [newPasswordField, confirmPasswordField] = passwordFields;
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(newPasswordField, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmPasswordField, { target: { value: 'NewPassword123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
          'test-token',
          'NewPassword123!'
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Form Validation Integration', () => {
    it('shows validation errors using Vibe components', async () => {
      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByTestId('vibe-button');
      fireEvent.click(submitButton);

      // Should show validation errors in Vibe TextField components
      await waitFor(() => {
        const textFields = screen.getAllByTestId('vibe-textfield');
        textFields.forEach(field => {
          expect(field).toHaveAttribute('data-validation-status', 'error');
        });
      });
    });

    it('clears validation errors on input change', async () => {
      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailField = screen.getByTestId('vibe-textfield');
      const submitButton = screen.getByTestId('vibe-button');

      // Trigger validation error
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailField).toHaveAttribute('data-validation-status', 'error');
      });

      // Clear error by typing
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });

      await waitFor(() => {
        expect(emailField).not.toHaveAttribute('data-validation-status', 'error');
      });
    });
  });

  describe('Toast Notifications Integration', () => {
    it('shows success toast on successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        user: { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        token: 'token',
        refreshToken: 'refresh',
      });

      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailField = screen.getByTestId('vibe-textfield');
      const passwordField = screen.getAllByTestId('vibe-textfield')[1];
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(emailField, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const toast = screen.queryByTestId('vibe-toast');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveAttribute('data-type', 'positive');
      });
    });

    it('shows error toast on failed login', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Login failed'));

      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailField = screen.getByTestId('vibe-textfield');
      const passwordField = screen.getAllByTestId('vibe-textfield')[1];
      const submitButton = screen.getByTestId('vibe-button');

      fireEvent.change(emailField, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'wrong' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const toast = screen.queryByTestId('vibe-toast');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveAttribute('data-type', 'negative');
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains proper focus management', async () => {
      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailField = screen.getByTestId('vibe-textfield');
      const passwordField = screen.getAllByTestId('vibe-textfield')[1];

      // Tab navigation should work
      emailField.focus();
      expect(document.activeElement).toBe(emailField);

      fireEvent.keyDown(emailField, { key: 'Tab' });
      expect(document.activeElement).toBe(passwordField);
    });

    it('provides proper ARIA labels and descriptions', () => {
      renderWithProviders(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const textFields = screen.getAllByTestId('vibe-textfield');
      textFields.forEach(field => {
        expect(field).toHaveAttribute('aria-label');
      });
    });
  });
});