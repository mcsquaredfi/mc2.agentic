/**
 * Base Component Library for Generative UI
 * 
 * This library provides building blocks that the AI can use to compose
 * sophisticated yield data visualizations based on user intent and context.
 */

export const BASE_COMPONENT_LIBRARY = {
  // Data Display Components
  APYIndicator: `
    <APYIndicator 
      value={apy} 
      trend="up|down|stable" 
      size="sm|md|lg" 
      showTrend={true} 
    />
  `,
  
  RiskBadge: `
    <RiskBadge 
      level="low|medium|high|very-high" 
      size="sm|md" 
    />
  `,
  
  TVLDisplay: `
    <TVLDisplay 
      value={tvl} 
      change={changePercentage} 
      showChange={true} 
      size="sm|md|lg" 
    />
  `,

  // Chart Components
  YieldComparisonChart: `
    <YieldComparisonChart 
      data={[
        { name: "Vault Name", apy: 25.5, tvl: 1000000, risk: "medium" },
        // ... more vault data
      ]} 
    />
  `,
  
  YieldTrendChart: `
    <YieldTrendChart 
      data={[
        { date: "2024-01", apy: 20.5, tvl: 950000 },
        { date: "2024-02", apy: 22.1, tvl: 1100000 },
        // ... more time series data
      ]} 
    />
  `,

  // Layout Components
  ComparisonGrid: `
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vaults.map((vault, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{vault.name}</h3>
              <RiskBadge level={vault.risk} />
            </div>
            <div className="flex justify-between items-center">
              <TVLDisplay value={vault.tvl} size="sm" />
              <APYIndicator value={vault.apy} size="lg" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  `,

  // Interactive Elements
  SortableTable: `
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
              Protocol
            </th>
            <th className="text-right p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
              APY
            </th>
            <th className="text-right p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
              TVL
            </th>
            <th className="text-center p-2">Risk</th>
          </tr>
        </thead>
        <tbody>
          {vaults.map((vault, index) => (
            <tr key={index} className="border-b hover:bg-neutral-50 dark:hover:bg-neutral-800">
              <td className="p-2 font-medium">{vault.name}</td>
              <td className="p-2 text-right">
                <APYIndicator value={vault.apy} size="sm" />
              </td>
              <td className="p-2 text-right">
                <TVLDisplay value={vault.tvl} size="sm" />
              </td>
              <td className="p-2 text-center">
                <RiskBadge level={vault.risk} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  `,

  // Insight Cards
  InsightCard: `
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">💡</span>
        <h3 className="font-semibold text-blue-700 dark:text-blue-300">Insight</h3>
      </div>
      <p className="text-sm text-blue-600 dark:text-blue-400">
        {insightText}
      </p>
    </Card>
  `,

  // Filter Controls
  FilterBar: `
    <div className="flex gap-2 mb-4 flex-wrap">
      <Button variant="secondary" size="sm">All</Button>
      <Button variant="secondary" size="sm">High Yield</Button>
      <Button variant="secondary" size="sm">Low Risk</Button>
      <Button variant="secondary" size="sm">New</Button>
    </div>
  `,

  // Export Controls
  ExportButtons: `
    <div className="flex gap-2 mt-4">
      <Button variant="secondary" size="sm" onClick={() => copyToClipboard(data)}>
        Copy Data
      </Button>
      <Button variant="secondary" size="sm" onClick={() => downloadCSV(data)}>
        Export CSV
      </Button>
    </div>
  `
};

export const COMPONENT_USAGE_GUIDELINES = `
## Component Usage Guidelines for AI:

### When to use each component:

1. **APYIndicator**: Always use for displaying yield percentages with visual emphasis
2. **RiskBadge**: Use when risk level is important for user decision-making
3. **TVLDisplay**: Use for showing protocol size and liquidity depth
4. **YieldComparisonChart**: Use when comparing multiple protocols side-by-side
5. **YieldTrendChart**: Use when showing historical performance or trends
6. **ComparisonGrid**: Use for card-based layout when showing multiple vaults
7. **SortableTable**: Use for detailed comparison with many data points
8. **InsightCard**: Use to highlight key findings or recommendations
9. **FilterBar**: Use when user wants to explore different categories
10. **ExportButtons**: Use when data export functionality is needed

### Composition Rules:
- Always wrap components in Card for consistent styling
- Use proper spacing with gap-4, gap-3, gap-2 classes
- Include dark mode support with dark: prefixes
- Use semantic HTML and accessibility attributes
- Make components responsive with responsive grid classes
- Include hover states for interactive elements

### Data Structure Examples:
- Vault data: { name: string, apy: number, tvl: number, risk: string, protocol: string }
- Trend data: { date: string, apy: number, tvl: number }
- Insight data: { title: string, description: string, type: 'positive' | 'warning' | 'info' }
`;
