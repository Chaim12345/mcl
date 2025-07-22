import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the auth store to avoid issues with protected routes
vi.mock('./stores/auth-store', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
  }),
}));

// Mock the theme provider
vi.mock('./components/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

describe('App', () => {
  it('renders the home page by default', () => {
    render(<App />);
    expect(screen.getByText('Welcome to the Project Management Platform')).toBeInTheDocument();
  });
});