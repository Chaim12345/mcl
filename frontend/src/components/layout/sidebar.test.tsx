import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './sidebar';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

describe('Sidebar', () => {
  it('renders the sidebar with navigation items', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Boards')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
  
  it('highlights the active navigation item', () => {
    render(<Sidebar />);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-primary');
  });
  
  it('toggles between expanded and collapsed states', () => {
    render(<Sidebar />);
    
    // Initially expanded
    expect(screen.getByText('Dashboard')).toBeVisible();
    
    // Click the collapse button
    const collapseButton = screen.getByRole('button');
    fireEvent.click(collapseButton);
    
    // Now should be collapsed (text not visible, but icons still are)
    expect(screen.queryByText('Dashboard')).not.toBeVisible();
  });
});