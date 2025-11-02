// src/components/cv/UploadCV.tsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { cvService } from '../../services/cvService';

interface UploadCVProps {
  onUploadSuccess: (cv: any) => void;
}

export const UploadCV: React.FC<UploadCVProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const cv = await cvService.uploadCV(file);
      onUploadSuccess(cv);
    } catch (err) {
      setError('Erreur lors du téléchargement du CV');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-10 h-10 text-gray-400" />
          {isUploading ? (
            <p className="text-gray-600">Téléchargement en cours...</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-blue-600">Téléversez un fichier</span> ou glissez-déposez
              </p>
              <p className="text-xs text-gray-500">PDF, DOC, DOCX (max. 10MB)</p>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
};