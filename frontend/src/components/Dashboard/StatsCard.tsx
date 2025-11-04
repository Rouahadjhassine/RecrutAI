// components/Dashboard/StatsCard.tsx
import { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}

export default function StatsCard({ title, value, icon, color }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className="p-3 bg-opacity-10 rounded-full" style={{ backgroundColor: `${color}10` }}>
          {icon}
        </div>
      </div>
    </div>
  );
}