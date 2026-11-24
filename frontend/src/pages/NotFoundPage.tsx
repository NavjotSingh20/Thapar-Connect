import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-16 space-y-4">
      <h1 className="text-6xl font-extrabold text-thapar-700 dark:text-gold-400">404</h1>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        The requested page does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-xl bg-thapar-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-thapar-800"
      >
        <Home className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
};
