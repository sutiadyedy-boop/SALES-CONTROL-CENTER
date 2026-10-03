import React, { useState } from 'react';
import { useLogo, DEFAULT_LOGO_URL } from '../../services/logoService';

export interface LogoDashboardProps {
  className?: string;
  imageClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  showText?: boolean;
  collapsed?: boolean;
  title?: string;
  subtitle?: string;
  alt?: string;
  onClick?: () => void;
}

export function LogoDashboard({
  className = '',
  imageClassName = '',
  size = 'md',
  showText = false,
  collapsed = false,
  title = 'CONTROL TOWER',
  subtitle = 'PT PINUS MERAH ABADI',
  alt = 'Logo Dashboard Resmi',
  onClick,
}: LogoDashboardProps) {
  const { logoUrl } = useLogo();
  const [imgSrc, setImgSrc] = useState<string>(logoUrl);

  // Sync if logoUrl changes from server or admin upload
  React.useEffect(() => {
    setImgSrc(logoUrl);
  }, [logoUrl]);

  // Size mappings for image badge
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    auto: 'w-full h-full max-w-full max-h-full',
  };

  // Safe fallback to prevent broken image
  const handleImageError = () => {
    if (imgSrc !== DEFAULT_LOGO_URL) {
      setImgSrc(DEFAULT_LOGO_URL);
    }
  };

  const imageElement = (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden bg-slate-900/80 border border-cyan-500/20 shadow-sm p-0.5 transition-all ${
        sizeMap[size]
      } ${imageClassName}`}
    >
      <img
        src={imgSrc || DEFAULT_LOGO_URL}
        alt={alt}
        onError={handleImageError}
        className="w-full h-full object-contain rounded-lg select-none pointer-events-none"
        loading="eager"
      />
    </div>
  );

  if (collapsed) {
    return (
      <div 
        className={`flex items-center justify-center ${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
        onClick={onClick}
        title={`${title} - ${subtitle}`}
      >
        {imageElement}
      </div>
    );
  }

  if (!showText) {
    return (
      <div 
        className={`inline-flex items-center ${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
        onClick={onClick}
      >
        {imageElement}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 min-w-0 ${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
      onClick={onClick}
    >
      {imageElement}
      <div className="truncate">
        <h1 className="text-xs font-extrabold tracking-wider uppercase text-slate-100 font-mono truncate leading-tight">
          {title}
        </h1>
        {subtitle && (
          <span className="text-[10px] text-cyan-400 font-bold block truncate tracking-wide">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export default LogoDashboard;
