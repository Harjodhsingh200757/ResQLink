import React from 'react';
import logoFull from '../../assets/resqlink-logo.png';
import logoSymbol from '../../assets/resqlink-symbol.png';

export default function Logo({ variant = 'navbar', size, className = '', showText = false }) {
  let selectedAsset = logoFull;
  let heightClass = 'h-12'; // Default navbar height 48px

  if (variant === 'symbol') {
    selectedAsset = logoSymbol;
    heightClass = 'h-10';
  } else if (variant === 'large') {
    heightClass = 'h-20 sm:h-24';
  } else if (variant === 'compact') {
    heightClass = 'h-9';
  } else if (variant === 'navbar') {
    heightClass = 'h-11 sm:h-12'; // 44px to 48px visible height
  }

  // Override via explicit size prop if provided
  if (size === 'xs') heightClass = 'h-6';
  if (size === 'sm') heightClass = 'h-8';
  if (size === 'md') heightClass = 'h-12';
  if (size === 'lg') heightClass = 'h-18';
  if (size === 'xl') heightClass = 'h-24';

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <img
        src={selectedAsset}
        alt="ResQLink | Real-Time Emergency Response"
        className={`${heightClass} w-auto object-contain transition-all`}
      />
      {showText && (
        <span className="font-extrabold text-slate-900 tracking-tight text-xl ml-2">
          ResQ<span className="text-sky-600">Link</span>
        </span>
      )}
    </div>
  );
}
