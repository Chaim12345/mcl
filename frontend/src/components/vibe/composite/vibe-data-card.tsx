import React from 'react';
import { VibeBox, VibeFlex, VibeButton } from '@/components/vibe';
import { Heading, Text, Divider } from '@vibe/core';

export interface VibeDataCardAction {
  label: string;
  onClick: () => void;
  kind?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  loading?: boolean;
}

export interface VibeDataCardProps {
  title?: string;
  subtitle?: string;
  description?: string;
  children?: React.ReactNode;
  actions?: VibeDataCardAction[];
  className?: string;
  loading?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

/**
 * VibeDataCard - Composite component for displaying structured data
 * 
 * Combines Vibe components to create a consistent card layout for
 * displaying data with optional actions and interactions.
 */
export function VibeDataCard({
  title,
  subtitle,
  description,
  children,
  actions,
  className,
  loading = false,
  onClick,
  hoverable = false
}: VibeDataCardProps) {
  const hasHeader = title || subtitle;
  const hasActions = actions && actions.length > 0;
  const isClickable = onClick && !loading;

  return (
    <VibeBox
      className={`
        vibe-card 
        ${hoverable || isClickable ? 'vibe-hover' : ''} 
        ${isClickable ? 'cursor-pointer' : ''} 
        ${className || ''}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      <VibeFlex direction="column" gap="medium">
        {hasHeader && (
          <VibeFlex direction="column" gap="xs">
            {title && (
              <Heading
                type="h3"

                className="vibe-text-primary"
              >
                {title}
              </Heading>
            )}
            {subtitle && (
              <Text
                type="text2"
                color="secondary"
                className="vibe-text-secondary"
              >
                {subtitle}
              </Text>
            )}
          </VibeFlex>
        )}

        {description && (
          <Text
            type="text1"
            color="primary"
            className="vibe-text-primary"
          >
            {description}
          </Text>
        )}

        {children && (
          <div className="vibe-card-content">
            {children}
          </div>
        )}

        {hasActions && (
          <>
            <Divider className="vibe-divider" />
            <VibeFlex 
              justify="end" 
              gap="small" 
              className="vibe-card-actions"
            >
              {actions.map((action, index) => (
                <VibeButton
                  key={index}
                  kind={action.kind || 'secondary'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click when action is clicked
                    action.onClick();
                  }}
                  disabled={action.disabled || loading}
                  loading={action.loading}
                >
                  {action.label}
                </VibeButton>
              ))}
            </VibeFlex>
          </>
        )}
      </VibeFlex>
    </VibeBox>
  );
}

export default VibeDataCard;