import { Upload as UploadIcon } from 'lucide-react';

interface Props {
  onUpload: (file: File) => void;
  multiple?: boolean;
}

export default function UploadCV({ onUpload, multiple = false }: Props) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Si multiple n'est pas activé, on ne prend que le premier fichier
    const filesToUpload = multiple ? files : [files[0]];
    
    filesToUpload.forEach(file => {
      if (file.name.endsWith('.pdf')) {
        onUpload(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    // Si multiple n'est pas activé, on ne prend que le premier fichier
    const filesToUpload = multiple ? files : [files[0]];
    
    filesToUpload.forEach(file => {
      if (file.name.endsWith('.pdf')) {
        onUpload(file);
      }
    });
  };

  return (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="p-3 bg-blue-100 rounded-full mb-4">
          <UploadIcon className="w-6 h-6 text-blue-600" />
        </div>
        <p className="text-lg font-medium mb-1">
          {multiple ? 'Glissez vos CVs ici' : 'Glissez votre CV ici'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          {multiple ? 'Sélectionnez ou déposez plusieurs fichiers PDF' : 'Sélectionnez ou déposez un fichier PDF'}
        </p>
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
          {multiple ? 'Sélectionner des fichiers' : 'Sélectionner un fichier'}
          <input
            type="file"
            accept=".pdf"
            onChange={handleFile}
            multiple={multiple}
            className="hidden"
          />
        </label>
        <p className="mt-2 text-xs text-gray-500">
          {multiple ? 'Fichiers PDF uniquement (max 10 Mo par fichier)' : 'Fichier PDF uniquement (max 10 Mo)'}
        </p>
      </div>
    </div>
  );
}