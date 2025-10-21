import React, { useState } from 'react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { LoadingSpinner } from '../Shared/LoadingSpinner';

interface AnalyzeCVsProps {
  onSelectCVs?: (cvIds: number[]) => void;
}

export const AnalyzeCVs: React.FC<AnalyzeCVsProps> = ({ onSelectCVs }) => {
  const [jobOfferId, setJobOfferId] = useState('');
  const [selectedCVs, setSelectedCVs] = useState<number[]>([]);
  const { results, loading, rankCVs } = useAnalysis();

  const handleAnalyze = async () => {
    if (jobOfferId) {
      await rankCVs(parseInt(jobOfferId));
    }
  };

  const toggleCVSelection = (cvId: number) => {
    setSelectedCVs((prev) =>
      prev.includes(cvId) ? prev.filter((id) => id !== cvId) : [...prev, cvId]
    );
    onSelectCVs?.(selectedCVs);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Analyser et classer les candidats</h2>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">ID de l'offre d'emploi</label>
          <input
            type="text"
            value={jobOfferId}
            onChange={(e) => setJobOfferId(e.target.value)}
            placeholder="Entrez l'ID de l'offre"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !jobOfferId}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
        >
          {loading ? 'Analyse en cours...' : 'Analyser et classer'}
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((cv, idx) => (
            <div key={cv.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-purple-600">#{idx + 1}</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">Candidat {cv.cv}</h4>
                    <p className="text-sm text-gray-600">Score de compatibilité</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-green-600">{cv.compatibility_score}%</div>
                  <button
                    onClick={() => toggleCVSelection(cv.cv)}
                    className={`mt-2 px-4 py-2 rounded-lg font-semibold transition ${
                      selectedCVs.includes(cv.cv)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {selectedCVs.includes(cv.cv) ? '✓ Sélectionné' : 'Sélectionner'}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Mots-clés matchés:</p>
                <div className="flex flex-wrap gap-2">
                  {cv.matched_keywords.map((keyword, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
