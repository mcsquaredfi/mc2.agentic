import React, { useMemo } from 'react';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';
import { APYIndicator, RiskBadge, TVLDisplay, YieldComparisonChart, YieldTrendChart } from '@/components/charts';

interface GeneratedUIComponent {
  componentType: string;
  jsx?: string;
  componentCode?: string;
  propsSchema?: Record<string, any>;
  props?: Record<string, any>;
}

interface SafeJSXRendererProps {
  component: GeneratedUIComponent;
  className?: string;
}

// Calculate insights from the data
function calculateInsights(data: any[]) {
  if (!data || data.length === 0) return null;

  const apys = data.map(item => item.effective_apy || item.apy_1d || 0).filter(apy => apy > 0);
  const tvls = data.map(item => item.tvl || item.liquidity_metrics?.current_tvl || 0);
  
  const averageAPY = apys.reduce((sum, apy) => sum + apy, 0) / apys.length;
  const totalTVL = tvls.reduce((sum, tvl) => sum + tvl, 0);
  
  const riskDistribution = {
    low: data.filter(item => {
      const apy = item.effective_apy || item.apy_1d || 0;
      const riskLevel = item.risk_metrics?.risk_level || item.risk;
      return riskLevel === 'low' || apy < 20;
    }).length,
    medium: data.filter(item => {
      const apy = item.effective_apy || item.apy_1d || 0;
      const riskLevel = item.risk_metrics?.risk_level || item.risk;
      return riskLevel === 'medium' || (apy >= 20 && apy < 50);
    }).length,
    high: data.filter(item => {
      const apy = item.effective_apy || item.apy_1d || 0;
      const riskLevel = item.risk_metrics?.risk_level || item.risk;
      return riskLevel === 'high' || apy >= 50;
    }).length
  };

  return {
    averageAPY,
    totalTVL: totalTVL >= 1e9 ? `$${(totalTVL / 1e9).toFixed(1)}B` : 
              totalTVL >= 1e6 ? `$${(totalTVL / 1e6).toFixed(1)}M` : 
              `$${(totalTVL / 1e3).toFixed(1)}K`,
    riskDistribution,
    highestAPY: Math.max(...apys),
    lowestAPY: Math.min(...apys)
  };
}

/**
 * Advanced renderer that can safely execute AI-generated JSX
 * Uses a controlled approach with predefined safe components
 */
export const SafeJSXRenderer: React.FC<SafeJSXRendererProps> = ({ 
  component, 
  className 
}) => {
  const renderedComponent = useMemo(() => {
    try {
      // Get the JSX string from either jsx or componentCode field
      const jsxString = component.jsx || component.componentCode || '' || component.componentCode || '';
      
      // Clean the JSX string
      const cleanJSX = jsxString
        .replace(/```jsx\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

          // Parse the component type to determine how to render
          const componentType = component.componentType.toLowerCase();

          if (componentType.includes('data-display') || componentType.includes('table')) {
            return renderDataDisplay(component, className);
          } else if (componentType.includes('comparison') || componentType.includes('grid')) {
            return renderComparisonGrid(component, className);
          } else if (componentType.includes('chart') || componentType.includes('graph')) {
            return renderChart(component, className);
          } else if (componentType.includes('card') || componentType.includes('info')) {
            return renderInfoCard(component, className);
          } else {
            // Fallback to generic renderer
            return renderGeneric(component, className);
          }
    } catch (error) {
      console.error('Error in SafeJSXRenderer:', error);
      return renderError(error, className);
    }
  }, [component, className]);

  return renderedComponent;
};

// Render data display components (tables, lists, etc.)
function renderDataDisplay(component: GeneratedUIComponent, className?: string) {
  const props = component.props || {};
  const data = props.vaults || props.tokens || props.data || [];
  
  return (
    <Card className={`p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ${className || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Enhanced Data Display
          </span>
        </div>

        {data.length > 0 ? (
          <div className="space-y-3">
            {data.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-50 text-lg">
                      {item.name || item.symbol || `Item ${index + 1}`}
                    </div>
                    {item.entity_name && (
                      <div className="text-sm text-muted-foreground">
                        by {item.entity_name}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {(item.apy_1d !== undefined || item.effective_apy !== undefined) && (
                      <APYIndicator 
                        value={item.effective_apy || item.apy_1d} 
                        trend={(item.effective_apy || item.apy_1d) > 0 ? 'up' : 'down'}
                        size="lg"
                      />
                    )}
                    {item.price && (
                      <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                        ${item.price}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  {(item.liquidity_metrics?.current_tvl || item.tvl) && (
                    <TVLDisplay 
                      value={item.tvl || item.liquidity_metrics.current_tvl} 
                      size="sm"
                    />
                  )}
                  <RiskBadge 
                    level={item.risk_metrics?.risk_level || item.risk || ((item.effective_apy || item.apy_1d) > 50 ? 'high' : (item.effective_apy || item.apy_1d) > 20 ? 'medium' : 'low')}
                    size="sm"
                  />
                </div>
              </div>
            ))}
            {data.length > 5 && (
              <div className="text-xs text-center text-muted-foreground">
                ... and {data.length - 5} more items
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No data available</div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
          >
            Copy Data
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(component.jsx || component.componentCode || '')}
          >
            Copy JSX
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Render info card components
function renderInfoCard(component: GeneratedUIComponent, className?: string) {
  return (
    <Card className={`p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 ${className || ''}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            Information Card
          </span>
        </div>
        
        <div className="text-sm text-purple-600 dark:text-purple-400">
          {component.componentType}
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Generated JSX Preview:</div>
          <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
            {component.jsx || component.componentCode || ''.substring(0, 300)}
            {component.jsx || component.componentCode || ''.length > 300 && '...'}
          </pre>
        </div>

        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => navigator.clipboard.writeText(component.jsx || component.componentCode || '')}
        >
          Copy JSX
        </Button>
      </div>
    </Card>
  );
}

// Render comparison grid components
function renderComparisonGrid(component: GeneratedUIComponent, className?: string) {
  const props = component.props || {};
  const data = props.vaults || props.tokens || props.data || [];
  
  // Calculate insights from the data
  const insights = calculateInsights(data);
  
  return (
    <Card className={`p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ${className || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Yield Strategy Comparison
          </span>
        </div>

        <div className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-4">
          Top Yield Strategies
        </div>

        {/* Insights Section */}
        {insights && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <span className="font-semibold text-purple-700 dark:text-purple-300">Key Insights</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {insights.averageAPY.toFixed(1)}%
                </div>
                <div className="text-purple-600 dark:text-purple-400">Average APY</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {insights.totalTVL}
                </div>
                <div className="text-green-600 dark:text-green-400">Total TVL</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {insights.riskDistribution.high} High Risk
                </div>
                <div className="text-orange-600 dark:text-orange-400">Risk Profile</div>
              </div>
            </div>
          </div>
        )}

        {data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.slice(0, 6).map((item: any, index: number) => (
              <Card key={index} className="p-4 rounded-lg bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-700 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 text-base">
                        {item.name || item.symbol || `Strategy ${index + 1}`}
                      </h3>
                      {item.entity_name && (
                        <div className="text-xs text-muted-foreground">
                          by {item.entity_name}
                        </div>
                      )}
                    </div>
                    <RiskBadge 
                      level={item.risk_metrics?.risk_level || item.risk || ((item.effective_apy || item.apy_1d) > 50 ? 'high' : (item.effective_apy || item.apy_1d) > 20 ? 'medium' : 'low')}
                      size="sm"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    {(item.apy_1d !== undefined || item.effective_apy !== undefined) && (
                      <APYIndicator 
                        value={item.effective_apy || item.apy_1d} 
                        trend={(item.effective_apy || item.apy_1d) > 0 ? 'up' : 'down'}
                        size="lg"
                      />
                    )}
                    {(item.liquidity_metrics?.current_tvl || item.tvl) && (
                      <TVLDisplay 
                        value={item.tvl || item.liquidity_metrics.current_tvl} 
                        size="sm"
                      />
                    )}
                  </div>

                  {/* Additional insights for each strategy */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {insights && (item.effective_apy || item.apy_1d) > insights.averageAPY && (
                      <div className="text-green-600 dark:text-green-400">
                        ⭐ Above average yield
                      </div>
                    )}
                    {(item.tvl || item.liquidity_metrics?.current_tvl) > 1000000 && (
                      <div className="text-blue-600 dark:text-blue-400">
                        💰 High liquidity pool
                      </div>
                    )}
                  </div>

                  {item.website && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(item.website, '_blank')}
                    >
                      View Strategy
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            No yield strategies data available
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
          >
            Copy Data
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(component.jsx || component.componentCode || '')}
          >
            Copy JSX
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Render chart components
function renderChart(component: GeneratedUIComponent, className?: string) {
  const props = component.props || {};
  const data = props.vaults || props.tokens || props.data || [];
  
  return (
    <Card className={`p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 ${className || ''}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            Chart Component
          </span>
        </div>

        {data.length > 0 ? (
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
            <YieldComparisonChart data={data} className="h-48" />
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-orange-200 dark:border-orange-700 text-center">
            <div className="text-orange-600 dark:text-orange-400 text-sm">
              📊 Chart visualization would be rendered here
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Component type: {component.componentType}
            </div>
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigator.clipboard.writeText(component.jsx || component.componentCode || '')}
        >
          Copy JSX
        </Button>
      </div>
    </Card>
  );
}

// Render generic components
function renderGeneric(component: GeneratedUIComponent, className?: string) {
  return (
    <Card className={`p-4 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 ${className || ''}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom Component
          </span>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {component.componentType}
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Generated JSX:</div>
          <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-32">
            {component.jsx || component.componentCode || ''}
          </pre>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(component.jsx || component.componentCode || '')}
          >
            Copy JSX
          </Button>
          {component.props && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(component.props, null, 2))}
            >
              Copy Props
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Render error state
function renderError(error: any, className?: string) {
  return (
    <Card className={`p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ${className || ''}`}>
      <div className="text-red-600 dark:text-red-400 text-sm">
        Error rendering component: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    </Card>
  );
}
