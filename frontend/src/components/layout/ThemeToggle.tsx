import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-thapar-800/80 text-slate-100 transition hover:bg-thapar-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-400 dark:bg-slate-800 dark:text-slate-200",
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-gold-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-200" />
      )}
    </button>
  );
};
