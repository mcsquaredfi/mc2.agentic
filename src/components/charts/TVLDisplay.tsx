import React from 'react';
import { cn } from '@/lib/utils';

interface TVLDisplayProps {
  value: number;
  change?: number;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TVLDisplay: React.FC<TVLDisplayProps> = ({
  value,
  change,
  showChange = true,
  size = 'md',
  className
}) => {
  const formatTVL = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const getChangeColor = () => {
    if (!change) return 'text-gray-500';
    return change > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeIcon = () => {
    if (!change) return null;
    return change > 0 ? '↗' : '↘';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("font-semibold text-neutral-900 dark:text-neutral-50", getSizeClass())}>
        {formatTVL(value)}
      </span>
      {showChange && change !== undefined && (
        <span className={cn("text-xs flex items-center gap-1", getChangeColor())}>
          {getChangeIcon()} {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  );
};
