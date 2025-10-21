import React from 'react';
import { AnalysisResult } from '../../types';

interface RankingsProps {
  results: AnalysisResult[];
}

export const Rankings: React.FC<RankingsProps> = ({ results }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Classement des candidats</h2>

      {results.length === 0 ? (
        <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
          Aucun résultat d'analyse disponible
        </div>
      ) : (
        <div className="space-y-4">
          {results
            .sort((a, b) => b.compatibility_score - a.compatibility_score)
            .map((result, idx) => (
              <div key={result.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-purple-600">#{idx + 1}</span>
                    <span className="text-lg font-semibold text-gray-800">CV #{result.cv}</span>
                  </div>
                  <span className="text-3xl font-bold text-green-600">{result.compatibility_score}%</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
