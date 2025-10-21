import React, { useState } from 'react';
import { analysisService } from '../../services/analysisService';

export const PostJob: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');

  const handlePostJob = async () => {
    setPosting(true);
    try {
      await analysisService.createJobOffer({
        title: jobTitle,
        description: jobDesc,
        requirements: [],
      });
      setMessage('✅ Offre publiée avec succès!');
      setJobTitle('');
      setJobDesc('');
    } catch (err) {
      setMessage('❌ Erreur lors de la publication');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Publier une offre d'emploi</h2>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Titre</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="React Developer Senior"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Description complète du poste..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {message && <p className="mb-4 text-sm text-center font-semibold">{message}</p>}

        <div className="flex gap-3">
          <button className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition">
            Annuler
          </button>
          <button
            onClick={handlePostJob}
            disabled={posting || !jobTitle || !jobDesc}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            {posting ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  );
};
