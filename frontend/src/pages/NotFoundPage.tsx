import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-16 space-y-4">
      <h1 className="text-6xl font-extrabold text-[#20251F]">404</h1>
      <h2 className="text-xl font-bold text-[#20251F]">Page Not Found</h2>
      <p className="text-sm text-[#20251F]/60 max-w-sm mx-auto">
        The requested page does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-xl bg-[#A3D65C] hover:bg-[#92c949] px-5 py-2.5 text-sm font-bold text-[#20251F] shadow-xs transition"
      >
        <Home className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
};
