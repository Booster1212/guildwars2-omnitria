import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  fill?: string;
}

export const IconCastle: React.FC<IconProps> = ({ size = 16, className = '', fill = 'none' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 21V9l3-4h10l3 4v12" />
    <path d="M4 13h16" />
    <path d="M8 5v4" />
    <path d="M12 5v4" />
    <path d="M16 5v4" />
    <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
  </svg>
);

export const IconKeep: React.FC<IconProps> = ({ size = 16, className = '', fill = 'none' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 21h18" />
    <path d="M5 21V7l2-2h10l2 2v14" />
    <path d="M9 5v4h6V5" />
    <path d="M10 21v-5a2 2 0 0 1 4 0v5" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
);

export const IconTower: React.FC<IconProps> = ({ size = 16, className = '', fill = 'none' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6 21V8l2-3h8l2 3v13" />
    <path d="M6 12h12" />
    <path d="M9 5v3" />
    <path d="M15 5v3" />
    <path d="M11 21v-3a1 1 0 0 1 2 0v3" />
  </svg>
);

export const IconCamp: React.FC<IconProps> = ({ size = 16, className = '', fill = 'none' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 20h18" />
    <path d="M12 4L3 20h18L12 4z" />
    <path d="M12 4v16" />
    <path d="M8 20l4-9 4 9" />
  </svg>
);

export const IconRuins: React.FC<IconProps> = ({ size = 16, className = '', fill = 'none' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polygon points="12,3 16,10 12,17 8,10" />
    <path d="M4 21h16" />
    <path d="M8 17v4M16 17v4" />
  </svg>
);
