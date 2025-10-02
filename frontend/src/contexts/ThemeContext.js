import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const themes = {
  light: {
    name: 'light',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      secondary: '#6b7280',
      background: '#ffffff',
      backgroundSecondary: '#f9fafb',
      backgroundAccent: '#f3f4f6',
      text: '#111827',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      secondary: '#9ca3af',
      background: '#111827',
      backgroundSecondary: '#1f2937',
      backgroundAccent: '#374151',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',
      border: '#374151',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      gradient: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)'
    }
  },
  modern: {
    name: 'modern',
    colors: {
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      secondary: '#8b5cf6',
      background: '#ffffff',
      backgroundSecondary: '#fafafa',
      backgroundAccent: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      text: '#1e293b',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      border: '#e2e8f0',
      success: '#22c55e',
      warning: '#f97316',
      error: '#ef4444',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
  },
  professional: {
    name: 'professional',
    colors: {
      primary: '#1e40af',
      primaryHover: '#1d4ed8',
      secondary: '#475569',
      background: '#f8fafc',
      backgroundSecondary: '#f1f5f9',
      backgroundAccent: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      border: '#cbd5e1',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      gradient: 'linear-gradient(135deg, #475569 0%, #1e40af 100%)'
    }
  },
  premium: {
    name: 'premium',
    colors: {
      primary: '#d4af37',
      primaryHover: '#b8941f',
      secondary: '#8b7355',
      background: '#000000',
      backgroundSecondary: '#1a1a1a',
      backgroundAccent: '#2a2a2a',
      text: '#ffffff',
      textSecondary: '#d4af37',
      textMuted: '#666666',
      border: '#333333',
      success: '#d4af37',
      warning: '#d4af37',
      error: '#8b7355',
      gradient: 'linear-gradient(135deg, #d4af37 0%, #b8941f 50%, #000000 100%)'
    }
  },
  classic: {
    name: 'classic',
    colors: {
      primary: '#667eea',
      primaryHover: '#5a67d8',
      secondary: '#764ba2',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      backgroundSecondary: '#ffffff',
      backgroundAccent: '#f9fafb',
      text: '#2d3748',
      textSecondary: '#4a5568',
      textMuted: '#718096',
      border: '#e2e8f0',
      success: '#48bb78',
      warning: '#ed8936',
      error: '#f56565',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('classic');

  const applyTheme = (themeName) => {
    const theme = themes[themeName] || themes.classic;
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
    
    // Apply theme class to body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${themeName}`);
    
    setCurrentTheme(themeName);
  };

  const getTheme = () => themes[currentTheme] || themes.classic;

  useEffect(() => {
    // Apply initial theme
    applyTheme(currentTheme);
  }, []);

  const value = {
    currentTheme,
    applyTheme,
    getTheme,
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
