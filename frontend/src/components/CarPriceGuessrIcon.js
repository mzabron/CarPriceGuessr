import React from 'react';

// CarPriceGuessrIcon - static minimal gauge icon with thicker needle
// Props: size (px), angle (deg), className, title
export function CarPriceGuessrIcon({ size = 200, angle = 40, className = '', title = 'Car Price Guessr Icon' }) {
  const cx = 100;
  const cy = 115;
  const radius = 85;
  const startAngle = 160;
  const endAngle = 20;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const startX = cx + radius * Math.cos(toRad(startAngle));
  const startY = cy + radius * Math.sin(toRad(startAngle));
  const endX = cx + radius * Math.cos(toRad(endAngle));
  const endY = cy + radius * Math.sin(toRad(endAngle));
  const largeArcFlag = 1;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="cpgIconGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <filter id="cpgIconShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>
      <rect width="200" height="200" rx="35" fill="#ffffff" />
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
        stroke="url(#cpgIconGradient)"
        strokeWidth={26}
        strokeLinecap="round"
      />
      <g transform={`translate(${cx}, ${cy}) rotate(${angle})`} filter="url(#cpgIconShadow)">
        <path d="M -18 0 L 0 -85 L 18 0 Z" fill="#1e293b" />
        <circle r="22" fill="#1e293b" />
        <circle r="8" fill="#ffffff" />
      </g>
    </svg>
  );
}

export default CarPriceGuessrIcon;
