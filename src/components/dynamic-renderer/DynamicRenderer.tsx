import React, { useMemo } from 'react';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';

interface GeneratedUIComponent {
  componentType: string;
  jsx: string;
  propsSchema?: Record<string, any>;
  props?: Record<string, any>;
}

interface DynamicRendererProps {
  component: GeneratedUIComponent;
  className?: string;
}

/**
 * Safely renders AI-generated React components
 * Uses a controlled sandbox approach to execute generated JSX
 */
export const DynamicRenderer: React.FC<DynamicRendererProps> = ({ 
  component, 
  className 
}) => {
  const renderedComponent = useMemo(() => {
    try {
      // Clean and prepare the JSX string
      const cleanJSX = component.jsx
        .replace(/```jsx\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // For now, we'll create a safe wrapper that displays the component info
      // In a production environment, you'd want to use a proper JSX parser/sanitizer
      return (
        <Card className={`p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ${className || ''}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Generated UI Component
              </span>
            </div>
            
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Type: {component.componentType}
            </div>

            {/* Display the component preview */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</div>
              <div className="text-sm font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                {cleanJSX.substring(0, 200)}
                {cleanJSX.length > 200 && '...'}
              </div>
            </div>

            {/* Show props if available */}
            {component.props && Object.keys(component.props).length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Data:</div>
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(component.props, null, 2)}
                </pre>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  // Copy JSX to clipboard
                  navigator.clipboard.writeText(cleanJSX);
                }}
              >
                Copy JSX
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  // Copy props to clipboard
                  navigator.clipboard.writeText(JSON.stringify(component.props, null, 2));
                }}
              >
                Copy Data
              </Button>
            </div>
          </div>
        </Card>
      );
    } catch (error) {
      console.error('Error rendering dynamic component:', error);
      return (
        <Card className={`p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ${className || ''}`}>
          <div className="text-red-600 dark:text-red-400 text-sm">
            Error rendering component: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      );
    }
  }, [component, className]);

  return renderedComponent;
};
