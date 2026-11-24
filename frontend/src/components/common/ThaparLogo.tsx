import React from 'react';

interface ThaparLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export const ThaparLogo: React.FC<ThaparLogoProps> = ({ className = 'h-10 w-10', size = 40, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="tcMaroonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B0000" />
          <stop offset="50%" stopColor="#800000" />
          <stop offset="100%" stopColor="#4A0000" />
        </linearGradient>
        <linearGradient id="tcGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D061" />
          <stop offset="50%" stopColor="#E5B82A" />
          <stop offset="100%" stopColor="#C99700" />
        </linearGradient>
        <filter id="tcDropShadow" x="-10%" y="-10%" width="125%" height="125%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Base Shield / Crest with rounded corners */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="26"
        fill="url(#tcMaroonGrad)"
        filter="url(#tcDropShadow)"
      />
      {/* Gold Inner Stroke */}
      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="24"
        stroke="url(#tcGoldGrad)"
        strokeWidth="2.5"
        strokeOpacity="0.8"
      />

      {/* Academic Crest Emblem: Stylized Flame of Knowledge atop Open Book */}
      <path
        d="M60 22 C60 22, 70 34, 66 44 C63 51, 57 52, 60 58 C62 50, 68 47, 67 38 C75 48, 70 60, 60 64 C50 60, 45 48, 53 38 C52 47, 58 50, 60 58 C63 52, 57 51, 54 44 C50 34, 60 22, 60 22 Z"
        fill="url(#tcGoldGrad)"
      />

      {/* Stylized Open Book Wings */}
      <path
        d="M32 68 C44 65, 54 67, 58 72 L58 84 C54 79, 44 77, 32 80 Z"
        fill="url(#tcGoldGrad)"
        opacity="0.9"
      />
      <path
        d="M88 68 C76 65, 66 67, 62 72 L62 84 C66 79, 76 77, 88 80 Z"
        fill="url(#tcGoldGrad)"
        opacity="0.9"
      />

      {/* TC Monogram Lettering */}
      <text
        x="60"
        y="104"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="17"
        letterSpacing="2.5"
        fill="url(#tcGoldGrad)"
      >
        TIET
      </text>
    </svg>
  );
};
