import React from 'react';
import { cn } from '@/lib/utils';

interface APYIndicatorProps {
  value: number;
  trend?: 'up' | 'down' | 'stable';
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  className?: string;
}

export const APYIndicator: React.FC<APYIndicatorProps> = ({
  value,
  trend,
  size = 'md',
  showTrend = true,
  className
}) => {
  const getTrendIcon = () => {
    if (!showTrend || !trend) return null;
    
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗</span>;
      case 'down':
        return <span className="text-red-500">↘</span>;
      case 'stable':
        return <span className="text-gray-500">→</span>;
      default:
        return null;
    }
  };

  const getColorClass = () => {
    if (value >= 50) return 'text-green-600 dark:text-green-400';
    if (value >= 20) return 'text-blue-600 dark:text-blue-400';
    if (value >= 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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
    <div className={cn("flex items-center gap-1", className)}>
      <span className={cn("font-semibold", getColorClass(), getSizeClass())}>
        {value.toFixed(2)}%
      </span>
      {getTrendIcon()}
    </div>
  );
};
