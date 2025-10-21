import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { analysisService } from '../../services/analysisService';

export const UploadCV: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await analysisService.uploadCV(selectedFile);
      setMessage('✅ CV uploadé avec succès!');
      setSelectedFile(null);
    } catch (err) {
      setMessage('❌ Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Uploader votre CV</h2>

      <div className="border-2 border-dashed border-blue-300 rounded-lg p-12 text-center">
        <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-xl font-semibold text-gray-800 mb-2">Glissez votre CV ici</p>
        <p className="text-gray-600 mb-6">ou</p>

        <input type="file" id="cv-input" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
        <button
          onClick={() => document.getElementById('cv-input')?.click()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Parcourir les fichiers
        </button>

        {selectedFile && (
          <div className="mt-4">
            <p className="text-gray-700 mb-4">Fichier sélectionné: {selectedFile.name}</p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {uploading ? 'Upload en cours...' : 'Confirmer l\'upload'}
            </button>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-4">PDF, DOC ou DOCX - Max 10MB</p>
        {message && <p className="mt-4 text-sm {color}">{message}</p>}
      </div>
    </div>
  );
};