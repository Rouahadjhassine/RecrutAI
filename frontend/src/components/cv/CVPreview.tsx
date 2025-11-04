// components/CV/CVPreview.tsx
import { FileText } from 'lucide-react';

interface Props {
  file: File;
}

export default function CVPreview({ file }: Props) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <FileText className="w-5 h-5 text-purple-600" />
      <span className="text-sm font-medium">{file.name}</span>
      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
    </div>
  );
}