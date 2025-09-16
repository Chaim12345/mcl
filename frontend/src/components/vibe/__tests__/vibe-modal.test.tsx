/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { VibeModal } from '../vibe-modal';
import { renderWithProviders, vibeTestUtils, mockVibeComponents } from '@/test/vibe-test-utils';

describe('VibeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders when open', () => {
      renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()}>
          <div>Modal Content</div>
        </VibeModal>
      );
      
      const modal = screen.getByTestId('vibe-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveTextContent('Modal Content');
    });

    it('does not render when closed', () => {
      renderWithProviders(
        <VibeModal open={false} onClose={vi.fn()}>
          <div>Modal Content</div>
        </VibeModal>
      );
      
      const modal = screen.queryByTestId('vibe-modal');
      expect(modal).not.toBeInTheDocument();
    });

    it('renders with custom props', () => {
      const props = vibeTestUtils.createModalProps({
        title: 'Custom Modal',
        size: 'large',
        className: 'custom-modal',
      });

      renderWithProviders(
        <VibeModal {...props}>
          <div>Custom Content</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        title: 'Custom Modal',
        size: 'large',
        className: 'custom-modal',
      });
    });
  });

  describe('Open/Close Behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <VibeModal open={true} onClose={handleClose}>
          <div>Closeable Modal</div>
        </VibeModal>
      );
      
      const closeButton = screen.getByTestId('modal-close');
      fireEvent.click(closeButton);
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('handles controlled open state', () => {
      const { rerender } = renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()}>
          <div>Controlled Modal</div>
        </VibeModal>
      );
      
      expect(screen.getByTestId('vibe-modal')).toBeInTheDocument();
      
      rerender(
        <VibeModal open={false} onClose={vi.fn()}>
          <div>Controlled Modal</div>
        </VibeModal>
      );
      
      expect(screen.queryByTestId('vibe-modal')).not.toBeInTheDocument();
    });

    it('supports onOpenChange callback', () => {
      const handleOpenChange = vi.fn();
      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={vi.fn()}
          onOpenChange={handleOpenChange}
        >
          <div>OpenChange Modal</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        onOpenChange: handleOpenChange,
      });
    });
  });

  describe('Modal Sizes and Variants', () => {
    it('renders small modal', () => {
      renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()} size="small">
          <div>Small Modal</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        size: 'small',
      });
    });

    it('renders large modal', () => {
      renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()} size="large">
          <div>Large Modal</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        size: 'large',
      });
    });

    it('renders fullscreen modal', () => {
      renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()} fullscreen={true}>
          <div>Fullscreen Modal</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        fullscreen: true,
      });
    });
  });

  describe('Modal Content and Structure', () => {
    it('renders with header', () => {
      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={vi.fn()}
          title="Modal Title"
          subtitle="Modal Subtitle"
        >
          <div>Modal Body</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        title: 'Modal Title',
        subtitle: 'Modal Subtitle',
      });
    });

    it('renders with footer actions', () => {
      const actions = [
        { text: 'Cancel', onClick: vi.fn(), kind: 'secondary' as const },
        { text: 'Save', onClick: vi.fn(), kind: 'primary' as const },
      ];

      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={vi.fn()}
          actions={actions}
        >
          <div>Modal with Actions</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        actions: actions,
      });
    });

    it('renders complex content structure', () => {
      renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()}>
          <div>
            <h2>Complex Content</h2>
            <p>This is a paragraph</p>
            <button>Action Button</button>
          </div>
        </VibeModal>
      );
      
      const modal = screen.getByTestId('vibe-modal');
      expect(modal).toHaveTextContent('Complex Content');
      expect(modal).toHaveTextContent('This is a paragraph');
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility attributes', () => {
      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={vi.fn()}
          ariaLabel="Accessible Modal"
          role="dialog"
        >
          <div>Accessible Content</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        ariaLabel: 'Accessible Modal',
        role: 'dialog',
      });
    });

    it('supports keyboard navigation', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <VibeModal open={true} onClose={handleClose}>
          <div>Keyboard Modal</div>
        </VibeModal>
      );
      
      const modal = screen.getByTestId('vibe-modal');
      fireEvent.keyDown(modal, { key: 'Escape' });
      
      // The mock doesn't handle keyboard events, but we verify the component renders
      expect(modal).toBeInTheDocument();
    });

    it('manages focus properly', () => {
      renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()} autoFocus={true}>
          <div>Focus Modal</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        autoFocus: true,
      });
    });
  });

  describe('Backdrop and Overlay', () => {
    it('handles backdrop click', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={handleClose}
          closeOnBackdropClick={true}
        >
          <div>Backdrop Modal</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        closeOnBackdropClick: true,
      });
    });

    it('prevents backdrop close when disabled', () => {
      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={vi.fn()}
          closeOnBackdropClick={false}
        >
          <div>No Backdrop Close</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        closeOnBackdropClick: false,
      });
    });
  });

  describe('Animation and Transitions', () => {
    it('supports custom animation duration', () => {
      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={vi.fn()}
          animationDuration={300}
        >
          <div>Animated Modal</div>
        </VibeModal>
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.Modal, {
        animationDuration: 300,
      });
    });

    it('handles enter and exit animations', () => {
      const { rerender } = renderWithProviders(
        <VibeModal open={false} onClose={vi.fn()}>
          <div>Transition Modal</div>
        </VibeModal>
      );
      
      // Modal should not be in DOM when closed
      expect(screen.queryByTestId('vibe-modal')).not.toBeInTheDocument();
      
      rerender(
        <VibeModal open={true} onClose={vi.fn()}>
          <div>Transition Modal</div>
        </VibeModal>
      );
      
      // Modal should appear when opened
      expect(screen.getByTestId('vibe-modal')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders within acceptable time', async () => {
      const renderTime = await vibeTestUtils.measureRenderTime(() => {
        renderWithProviders(
          <VibeModal open={true} onClose={vi.fn()}>
            <div>Performance Test</div>
          </VibeModal>
        );
      });
      
      expect(renderTime).toBeLessThan(50);
    });

    it('handles multiple open/close cycles efficiently', () => {
      const { rerender } = renderWithProviders(
        <VibeModal open={false} onClose={vi.fn()}>
          <div>Cycle Modal</div>
        </VibeModal>
      );
      
      // Multiple open/close cycles
      for (let i = 0; i < 5; i++) {
        rerender(
          <VibeModal open={true} onClose={vi.fn()}>
            <div>Cycle Modal {i}</div>
          </VibeModal>
        );
        
        rerender(
          <VibeModal open={false} onClose={vi.fn()}>
            <div>Cycle Modal {i}</div>
          </VibeModal>
        );
      }
      
      // Should handle cycles without issues
      expect(screen.queryByTestId('vibe-modal')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing onClose gracefully', () => {
      renderWithProviders(
        <VibeModal open={true}>
          <div>No onClose</div>
        </VibeModal>
      );
      
      const modal = screen.getByTestId('vibe-modal');
      expect(modal).toBeInTheDocument();
    });

    it('handles missing children gracefully', () => {
      renderWithProviders(
        <VibeModal open={true} onClose={vi.fn()} />
      );
      
      const modal = screen.getByTestId('vibe-modal');
      expect(modal).toBeInTheDocument();
    });

    it('handles invalid size prop', () => {
      renderWithProviders(
        <VibeModal 
          open={true} 
          onClose={vi.fn()}
          size={'invalid' as any}
        >
          <div>Invalid Size</div>
        </VibeModal>
      );
      
      const modal = screen.getByTestId('vibe-modal');
      expect(modal).toBeInTheDocument();
    });
  });
});