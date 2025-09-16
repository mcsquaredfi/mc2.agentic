import React from 'react';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'very-high';
  size?: 'sm' | 'md';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  className
}) => {
  const getRiskConfig = () => {
    switch (level) {
      case 'low':
        return {
          label: 'Low Risk',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-200 dark:border-green-800',
          icon: '🟢'
        };
      case 'medium':
        return {
          label: 'Medium Risk',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          icon: '🟡'
        };
      case 'high':
        return {
          label: 'High Risk',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          textColor: 'text-orange-700 dark:text-orange-300',
          borderColor: 'border-orange-200 dark:border-orange-800',
          icon: '🟠'
        };
      case 'very-high':
        return {
          label: 'Very High Risk',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-200 dark:border-red-800',
          icon: '🔴'
        };
    }
  };

  const config = getRiskConfig();
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClass,
        className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};
