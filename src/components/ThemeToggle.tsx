import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export function ThemeToggle({ isDarkMode, toggleTheme }: ThemeToggleProps) {
  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-full w-20 h-10 relative transition-colors duration-300
        ${isDarkMode ? 'bg-gray-800' : 'bg-blue-500'}
      `}
    >
      <div
        className={`
          absolute top-1 w-8 h-8 rounded-full transition-transform duration-300
          ${isDarkMode ? 'translate-x-10 bg-gray-600' : 'translate-x-0 bg-white'}
          flex items-center justify-center
        `}
      >
        {isDarkMode ? (
          <Moon className="h-5 w-5 text-white" />
        ) : (
          <Sun className="h-5 w-5 text-yellow-500" />
        )}
      </div>
    </button>
  );
}