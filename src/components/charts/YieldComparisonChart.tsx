import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface YieldData {
  name: string;
  apy: number;
  tvl: number;
  risk: 'low' | 'medium' | 'high' | 'very-high';
}

interface YieldComparisonChartProps {
  data: YieldData[];
  className?: string;
}

export const YieldComparisonChart: React.FC<YieldComparisonChartProps> = ({
  data,
  className
}) => {
  const chartData = data.map(item => ({
    ...item,
    displayName: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-neutral-800 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg">
          <p className="font-semibold text-neutral-900 dark:text-neutral-50">{data.name}</p>
          <p className="text-sm">
            <span className="text-blue-600 dark:text-blue-400">APY:</span> {data.apy.toFixed(2)}%
          </p>
          <p className="text-sm">
            <span className="text-green-600 dark:text-green-400">TVL:</span> ${(data.tvl / 1e6).toFixed(1)}M
          </p>
          <p className="text-sm">
            <span className="text-orange-600 dark:text-orange-400">Risk:</span> {data.risk}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full h-64", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="displayName" 
            tick={{ fontSize: 12, fill: '#6B7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6B7280' }}
            label={{ value: 'APY (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="apy" 
            fill="#F48120"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
