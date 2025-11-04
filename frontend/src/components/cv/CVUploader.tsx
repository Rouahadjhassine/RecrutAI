// components/CV/CVUploader.tsx
import { Upload } from 'lucide-react';

interface Props {
  onFilesChange: (files: File[]) => void;
}

export default function CVUploader({ onFilesChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.name.endsWith('.pdf'));
    onFilesChange(files);
  };

  return (
    <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center">
      <Upload className="w-12 h-12 mx-auto text-purple-400 mb-4" />
      <input
        type="file"
        multiple
        accept=".pdf"
        onChange={handleChange}
        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-purple-600 file:text-white"
      />
      <p className="text-xs text-gray-500 mt-2">PDF uniquement</p>
    </div>
  );
}