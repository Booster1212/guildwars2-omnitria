import React from 'react';

/** Custom monochrome pictograms (consistent stroke width, no third-party icon set for main navigation). */
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const GlyphEvents: React.FC = () => (
  <svg {...base}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 8.5V13l3 2" />
    <path d="M9 3.5h6" />
    <path d="M12 3.5v2" />
  </svg>
);

export const GlyphWaypoint: React.FC = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 6.5l4.5 5.5-4.5 5.5-4.5-5.5z" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
);

export const GlyphAchievements: React.FC = () => (
  <svg {...base}>
    <path d="M7 4h10v5.5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3" />
    <path d="M12 14.5V18M8.5 20h7M10 18h4" />
  </svg>
);

export const GlyphCrafting: React.FC = () => (
  <svg {...base}>
    <path d="M3.5 8h11.5c1.5 0 2.5 1 4.5 1.5v2c-2 .5-3 1.5-5.5 1.5H13l1 3H15v2.5H8V16h1l1-3H8c-2.5 0-3-1.5-4.5-2z" />
  </svg>
);

export const GlyphLegendary: React.FC = () => (
  <svg {...base}>
    <path d="M18.5 3.5l-1 5-8 8-1.5-1.5 8-8z" />
    <path d="M7 14l3 3M6.5 17.5L4 20" />
    <path d="M17.5 8.5l2.5 0.5" />
  </svg>
);

export const GlyphInventory: React.FC = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" />
    <path d="M10 8.5h4v3h-4z" />
    <circle cx="15.5" cy="15" r="2.2" />
    <path d="M17.2 16.7l1.8 1.8" />
  </svg>
);

export const GlyphGear: React.FC = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8l1.4 2.4 2.7-.6.8 2.7 2.6 1-.7 2.7 1.9 2-1.9 2 .7 2.7-2.6 1-.8 2.7-2.7-.6L12 21.2l-1.4-2.4-2.7.6-.8-2.7-2.6-1 .7-2.7-1.9-2 1.9-2-.7-2.7 2.6-1 .8-2.7 2.7.6z" />
  </svg>
);

/** Subtle brandmark: Shield with waypoint diamond (not an original ArenaNet logo) */
export const BrandMark: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2.5l8 2.8v6.2c0 4.5-3.4 8.2-8 10-4.6-1.8-8-5.5-8-10V5.3z" stroke="#a4864a" strokeWidth="1.4" fill="#1b1814" />
    <path d="M12 7.5l3.2 4.2-3.2 4.2-3.2-4.2z" stroke="#d2b268" strokeWidth="1.3" fill="none" />
  </svg>
);
