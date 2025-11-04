// src/pages/UploadPage.tsx
import { useState } from 'react';
import Navbar from '../components/Layout/Navbar';
import UploadCV from '../components/CV/UploadCV';
import { User } from '../types';
import { cvService } from '../services/cvService';

export default function UploadPage({ user }: { user: User }) {
  const [uploaded, setUploaded] = useState<any>(null);

  const handleUpload = async (file: File) => {
    console.log('Fichier reçu dans handleUpload:', file);
    try {
      const cv = await cvService.uploadCV(file);
      setUploaded(cv);
    } catch {
      alert('Erreur lors de l\'upload');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role="candidat" />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Uploader votre CV
        </h2>

        {!uploaded ? (
          <div className="bg-white rounded-xl shadow-2xl p-10">
            <UploadCV onUpload={handleUpload} />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-2xl p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-4">CV uploadé !</h3>
            <p className="text-gray-700 mb-2"><strong>Nom :</strong> {uploaded.file_name}</p>
            <p className="text-gray-700 mb-2"><strong>Compétences :</strong> {uploaded.parsed_data.skills.join(', ')}</p>
            <p className="text-gray-700"><strong>Expérience :</strong> {uploaded.parsed_data.experience_years} ans</p>
          </div>
        )}
      </div>
    </div>
  );
}