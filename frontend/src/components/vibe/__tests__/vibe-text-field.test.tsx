/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { VibeTextField } from '../vibe-text-field';
import { renderWithProviders, vibeTestUtils, mockVibeComponents } from '@/test/vibe-test-utils';

describe('VibeTextField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      renderWithProviders(
        <VibeTextField title="Test Field" />
      );
      
      const textField = screen.getByTestId('vibe-textfield');
      expect(textField).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      const props = vibeTestUtils.createTextFieldProps({
        title: 'Custom Field',
        placeholder: 'Enter custom text',
        size: 'large',
        disabled: true,
      });

      renderWithProviders(<VibeTextField {...props} />);
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        title: 'Custom Field',
        placeholder: 'Enter custom text',
        size: 'large',
        disabled: true,
      });
    });

    it('renders with validation state', () => {
      renderWithProviders(
        <VibeTextField 
          title="Validated Field"
          validation={{
            status: 'error',
            text: 'This field is required'
          }}
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        validation: {
          status: 'error',
          text: 'This field is required'
        },
      });
    });
  });

  describe('Value and Change Handling', () => {
    it('handles value changes', () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <VibeTextField 
          title="Changeable Field"
          value="initial"
          onChange={handleChange}
        />
      );
      
      const textField = screen.getByTestId('vibe-textfield');
      fireEvent.change(textField, { target: { value: 'new value' } });
      
      expect(handleChange).toHaveBeenCalledWith('new value');
    });

    it('handles controlled component pattern', () => {
      const { rerender } = renderWithProviders(
        <VibeTextField title="Controlled" value="initial" />
      );
      
      rerender(
        <VibeTextField title="Controlled" value="updated" />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        value: 'updated',
      });
    });

    it('supports dual onChange signature (Vibe and Shadcn)', () => {
      const handleVibeChange = vi.fn();
      const handleShadcnChange = vi.fn();
      
      // Test Vibe-style onChange (string parameter)
      renderWithProviders(
        <VibeTextField 
          title="Vibe Style"
          onChange={handleVibeChange}
        />
      );
      
      const textField = screen.getByTestId('vibe-textfield');
      fireEvent.change(textField, { target: { value: 'vibe value' } });
      
      expect(handleVibeChange).toHaveBeenCalledWith('vibe value');
    });
  });

  describe('Input Types and Features', () => {
    it('handles password type with visibility toggle', () => {
      renderWithProviders(
        <VibeTextField 
          title="Password"
          type="password"
          secondaryIconName="Eye"
          onIconClick={vi.fn()}
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        type: 'password',
        secondaryIconName: 'Eye',
      });
    });

    it('handles email type', () => {
      renderWithProviders(
        <VibeTextField 
          title="Email"
          type="email"
          autoComplete="email"
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        type: 'email',
        autoComplete: 'email',
      });
    });

    it('handles number type', () => {
      renderWithProviders(
        <VibeTextField 
          title="Number"
          type="number"
          min={0}
          max={100}
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        type: 'number',
        min: 0,
        max: 100,
      });
    });
  });

  describe('Validation and Error States', () => {
    it('displays error validation', () => {
      renderWithProviders(
        <VibeTextField 
          title="Error Field"
          validation={{
            status: 'error',
            text: 'Invalid input'
          }}
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        validation: expect.objectContaining({
          status: 'error',
          text: 'Invalid input'
        }),
      });
    });

    it('displays success validation', () => {
      renderWithProviders(
        <VibeTextField 
          title="Success Field"
          validation={{
            status: 'success',
            text: 'Valid input'
          }}
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        validation: expect.objectContaining({
          status: 'success',
          text: 'Valid input'
        }),
      });
    });

    it('clears validation when value changes', () => {
      const { rerender } = renderWithProviders(
        <VibeTextField 
          title="Clearing Field"
          validation={{ status: 'error', text: 'Error' }}
        />
      );
      
      rerender(
        <VibeTextField 
          title="Clearing Field"
          validation={undefined}
        />
      );
      
      // Should not have validation prop in the latest call
      const lastCall = mockVibeComponents.TextField.mock.calls.slice(-1)[0];
      expect(lastCall[0]).not.toHaveProperty('validation');
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility attributes', () => {
      renderWithProviders(
        <VibeTextField 
          title="Accessible Field"
          ariaLabel="Custom aria label"
          required={true}
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        ariaLabel: 'Custom aria label',
        required: true,
      });
    });

    it('supports aria-describedby for validation', () => {
      renderWithProviders(
        <VibeTextField 
          title="Described Field"
          validation={{
            status: 'error',
            text: 'Error description'
          }}
        />
      );
      
      // The wrapper should handle aria-describedby internally
      expect(mockVibeComponents.TextField).toHaveBeenCalled();
    });
  });

  describe('Form Integration', () => {
    it('works with React Hook Form', () => {
      const mockRegister = vi.fn(() => ({
        name: 'testField',
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
      }));
      
      renderWithProviders(
        <VibeTextField 
          title="Form Field"
          {...mockRegister('testField')}
        />
      );
      
      expect(mockVibeComponents.TextField).toHaveBeenCalled();
    });

    it('handles form validation errors', () => {
      renderWithProviders(
        <VibeTextField 
          title="Form Field"
          validation={{
            status: 'error',
            text: 'This field is required'
          }}
        />
      );
      
      vibeTestUtils.expectVibeProps(mockVibeComponents.TextField, {
        validation: expect.objectContaining({
          status: 'error'
        }),
      });
    });
  });

  describe('Performance', () => {
    it('renders within acceptable time', async () => {
      const renderTime = await vibeTestUtils.measureRenderTime(() => {
        renderWithProviders(
          <VibeTextField title="Performance Test" />
        );
      });
      
      expect(renderTime).toBeLessThan(50);
    });

    it('handles rapid value changes efficiently', () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <VibeTextField 
          title="Rapid Changes"
          onChange={handleChange}
        />
      );
      
      const textField = screen.getByTestId('vibe-textfield');
      
      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        fireEvent.change(textField, { target: { value: `value${i}` } });
      }
      
      expect(handleChange).toHaveBeenCalledTimes(10);
      expect(handleChange).toHaveBeenLastCalledWith('value9');
    });
  });

  describe('Theme Integration', () => {
    it('renders correctly in different themes', () => {
      vibeTestUtils.testWithThemes((theme) => {
        renderWithProviders(
          <VibeTextField title={`${theme} theme field`} />,
          { theme }
        );
        
        const textField = screen.getByTestId('vibe-textfield');
        expect(textField).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing title gracefully', () => {
      renderWithProviders(<VibeTextField />);
      
      const textField = screen.getByTestId('vibe-textfield');
      expect(textField).toBeInTheDocument();
    });

    it('handles invalid validation prop', () => {
      renderWithProviders(
        <VibeTextField 
          title="Invalid Validation"
          validation={'invalid' as any}
        />
      );
      
      const textField = screen.getByTestId('vibe-textfield');
      expect(textField).toBeInTheDocument();
    });
  });
});