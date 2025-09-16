import React from 'react';
import { VibeButton } from './vibe-button';
import { useVibeTheme } from './vibe-theme-provider';

/**
 * Vibe Demo Component
 * Demonstrates the Vibe Design System integration
 */
export const VibeDemo: React.FC = () => {
  const { theme, setTheme } = useVibeTheme();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Vibe Design System Demo</h2>
      
      <div className="space-y-2">
        <p>Current theme: {theme}</p>
        <div className="flex gap-2">
          <VibeButton 
            kind="primary" 
            onClick={() => setTheme('light')}
          >
            Light Theme
          </VibeButton>
          <VibeButton 
            kind="secondary" 
            onClick={() => setTheme('dark')}
          >
            Dark Theme
          </VibeButton>
          <VibeButton 
            kind="tertiary" 
            onClick={() => setTheme('system')}
          >
            System Theme
          </VibeButton>
        </div>
      </div>
      
      <div className="space-y-2">
        <p>Button variants:</p>
        <div className="flex gap-2">
          <VibeButton kind="primary">Primary</VibeButton>
          <VibeButton kind="secondary">Secondary</VibeButton>
          <VibeButton kind="tertiary">Tertiary</VibeButton>
        </div>
      </div>
    </div>
  );
};