import React from 'react';
import { VibeBox, VibeFlex } from '@/components/vibe';
import { Label, Text } from '@vibe/core';

export interface VibeFormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * VibeFormField - Composite component for consistent form field layout
 * 
 * Combines Vibe components to create a standardized form field structure
 * with label, description, input, and error message.
 */
export function VibeFormField({
  label,
  description,
  error,
  required = false,
  children,
  className,
  id
}: VibeFormFieldProps) {
  const fieldId = id || `form-field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;

  return (
    <VibeBox className={`vibe-form-field ${className || ''}`}>
      <VibeFlex direction="column" gap="xs">
        {label && (
          <Label
            text={label}

            className="vibe-form-label"
          />
        )}
        
        {description && (
          <Text
            type="text2"
            color="secondary"
            id={descriptionId}
            className="vibe-form-description"
          >
            {description}
          </Text>
        )}
        
        <div
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        >
          {children}
        </div>
        
        {error && (
          <Text
            type="text2"
            color="negative"
            id={errorId}
            className="vibe-form-error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </Text>
        )}
      </VibeFlex>
    </VibeBox>
  );
}

export default VibeFormField;