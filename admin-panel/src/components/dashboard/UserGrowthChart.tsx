import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserGrowthChartProps {
  data: Array<{
    date: string;
    customers: number;
    sellers: number;
    drivers: number;
  }>;
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name === 'customers' ? '👤 Customers' : 
              name === 'sellers' ? '🏪 Sellers' : 
              name === 'drivers' ? '🚗 Drivers' : name
            ]}
            labelFormatter={(label) => `Date: ${formatDate(label as string)}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="customers"
            name="Customers"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="sellers"
            name="Sellers"
            stroke="#1e3a8a"
            strokeWidth={2}
            dot={{ fill: '#1e3a8a', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#1e3a8a', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="drivers"
            name="Drivers"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
