import { FileText } from 'lucide-react';
import { cvService } from '../../services/cvService';

interface Props {
  onUpload: (cv: any) => void;
}

export default function UploadCV({ onUpload }: Props) {
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) return;
    try {
      const cv = await cvService.uploadCV(file);
      onUpload(cv);
    } catch (err) {
      alert('Erreur upload');
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <p className="text-lg font-medium mb-2">Glissez votre CV ici</p>
      <p className="text-sm text-gray-500 mb-4">PDF uniquement</p>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFile}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-blue-700"
      />
    </div>
  );
}