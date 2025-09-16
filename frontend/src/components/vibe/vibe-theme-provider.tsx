import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider } from '@vibe/core';
import { vibeThemeConfig, generateThemeCSS } from '@/lib/vibe-theme-config';
import { generateVibeTokensCSS } from '@/lib/vibe-design-tokens';

type VibeTheme = 'light' | 'dark' | 'system';
type VibeSystemTheme = 'light' | 'dark' | 'black';

interface VibeThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: VibeTheme;
  storageKey?: string;
}

interface VibeThemeProviderState {
  theme: VibeTheme;
  systemTheme: VibeSystemTheme;
  effectiveTheme: VibeSystemTheme;
  setTheme: (theme: VibeTheme) => void;
  toggleTheme: () => void;
}

const initialState: VibeThemeProviderState = {
  theme: 'system',
  systemTheme: 'light',
  effectiveTheme: 'light',
  setTheme: () => null,
  toggleTheme: () => null,
};

const VibeThemeProviderContext = createContext<VibeThemeProviderState>(initialState);

export function VibeThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vibe-ui-theme',
  ...props
}: VibeThemeProviderProps) {
  const [theme, setTheme] = useState<VibeTheme>(
    () => (localStorage.getItem(storageKey) as VibeTheme) || defaultTheme
  );
  
  const [systemTheme, setSystemTheme] = useState<VibeSystemTheme>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Calculate effective theme
  const effectiveTheme: VibeSystemTheme = theme === 'system' ? systemTheme : (theme as VibeSystemTheme);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;

    // Remove existing theme classes
    root.classList.remove('light', 'dark', 'black');
    body.classList.remove('light-app-theme', 'dark-app-theme', 'black-app-theme');

    // Add new theme classes
    root.classList.add(effectiveTheme);
    body.classList.add(`${effectiveTheme}-app-theme`);
    
    // Set CSS custom property for theme
    root.style.setProperty('--vibe-theme', effectiveTheme);
    
    // Apply custom theme CSS variables and design tokens
    const themeCSS = generateThemeCSS(effectiveTheme === 'black' ? 'dark' : effectiveTheme);
    const tokensCSS = generateVibeTokensCSS();
    
    // Create or update theme style element
    let themeStyleElement = document.getElementById('vibe-theme-variables');
    if (!themeStyleElement) {
      themeStyleElement = document.createElement('style');
      themeStyleElement.id = 'vibe-theme-variables';
      document.head.appendChild(themeStyleElement);
    }
    
    themeStyleElement.textContent = `
      :root {
        ${themeCSS}
        ${tokensCSS}
      }
    `;
  }, [effectiveTheme]);

  const handleSetTheme = (newTheme: VibeTheme) => {
    localStorage.setItem(storageKey, newTheme);
    setTheme(newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'system') {
      handleSetTheme('light');
    } else if (theme === 'light') {
      handleSetTheme('dark');
    } else {
      handleSetTheme('light');
    }
  };

  const value = {
    theme,
    systemTheme,
    effectiveTheme,
    setTheme: handleSetTheme,
    toggleTheme,
  };

  return (
    <VibeThemeProviderContext.Provider {...props} value={value}>
      <ThemeProvider 
        systemTheme={effectiveTheme}
        themeConfig={vibeThemeConfig}
      >
        {children}
      </ThemeProvider>
    </VibeThemeProviderContext.Provider>
  );
}

export const useVibeTheme = () => {
  const context = useContext(VibeThemeProviderContext);

  if (context === undefined)
    throw new Error('useVibeTheme must be used within a VibeThemeProvider');

  return context;
};