// src/pages/candidat/UploadCV.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, Check } from 'lucide-react';
import { cvService } from '../../services/cvService';
import { toast } from 'react-toastify';

const UploadCV: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await cvService.uploadCV(file);
      toast.success('CV téléversé avec succès !');
      navigate('/candidat');
    } catch (err) {
      console.error('Upload error:', err);
      setError('Une erreur est survenue lors du téléversement du CV');
      toast.error('Erreur lors du téléversement du CV');
    } finally {
      setIsUploading(false);
    }
  }, [navigate]);

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Téléverser un CV</h1>
          <p className="mt-1 text-sm text-gray-500">
            Téléversez votre CV au format PDF, DOC ou DOCX pour commencer à postuler.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          } ${isUploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600">Téléversement en cours...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">
                    Glissez-déposez un fichier
                  </span>{' '}
                  ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX (max. 10MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Conseils pour un bon CV
          </h2>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Incluez vos compétences techniques et vos expériences pertinentes</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Assurez-vous que le texte est lisible (évitez les images scannées)</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Vérifiez l'orthographe et la grammaire</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadCV;