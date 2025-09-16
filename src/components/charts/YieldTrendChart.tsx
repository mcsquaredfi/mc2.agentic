import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface TrendDataPoint {
  date: string;
  apy: number;
  tvl: number;
}

interface YieldTrendChartProps {
  data: TrendDataPoint[];
  className?: string;
}

export const YieldTrendChart: React.FC<YieldTrendChartProps> = ({
  data,
  className
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-neutral-800 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg">
          <p className="font-semibold text-neutral-900 dark:text-neutral-50">{data.date}</p>
          <p className="text-sm">
            <span className="text-blue-600 dark:text-blue-400">APY:</span> {data.apy.toFixed(2)}%
          </p>
          <p className="text-sm">
            <span className="text-green-600 dark:text-green-400">TVL:</span> ${(data.tvl / 1e6).toFixed(1)}M
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full h-48", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6B7280' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6B7280' }}
            label={{ value: 'APY (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="apy" 
            stroke="#F48120" 
            strokeWidth={2}
            dot={{ fill: '#F48120', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#F48120', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
