import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  bgColor?: string;
  subtitle?: string;
  tooltip?: string;
}

export function StatCard({
  title,
  value,
  icon,
  change,
  changeType = 'neutral',
  bgColor = 'bg-blue-500',
  subtitle,
  tooltip,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center">
        <div
          className={`${bgColor} w-12 h-12 rounded-lg flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className="flex items-center mt-1">
            <p 
              className="text-2xl font-bold text-gray-900"
              title={tooltip}
            >
              {value}
            </p>
            {change && (
              <span className={`ml-2 text-sm ${changeColors[changeType]}`}>
                {change}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
} 