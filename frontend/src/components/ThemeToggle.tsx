/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDarkMode, themeMode, setThemeMode } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'dark':
        return <Moon className="w-4 h-4 text-blue-400" />;
      case 'system':
        return <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
      default:
        return <Sun className="w-4 h-4 text-yellow-500" />;
    }
  };

  const themeOptions = [
    { mode: 'light' as const, label: 'Light', icon: Sun },
    { mode: 'dark' as const, label: 'Dark', icon: Moon },
    { mode: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-1 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        aria-label="Theme settings"
      >
        {getThemeIcon()}
        <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {themeOptions.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => {
                setThemeMode(mode);
                setShowDropdown(false);
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                themeMode === mode
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;