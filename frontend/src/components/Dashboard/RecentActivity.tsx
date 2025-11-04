// components/Dashboard/RecentActivity.tsx
import { Clock, Mail, FileText } from 'lucide-react';

export default function RecentActivity() {
  const activities = [
    { icon: <Mail className="w-4 h-4" />, text: 'Email envoyé à jean@gmail.com', time: 'Il y a 2 min' },
    { icon: <FileText className="w-4 h-4" />, text: '3 CVs analysés', time: 'Il y a 15 min' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <h3 className="text-lg font-bold mb-4">Activité récente</h3>
      <div className="space-y-3">
        {activities.map((a, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="text-purple-600">{a.icon}</div>
            <span className="flex-1">{a.text}</span>
            <span className="text-xs text-gray-500">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}