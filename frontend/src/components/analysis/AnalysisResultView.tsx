// src/components/analysis/AnalysisResultView.tsx
import React from 'react';
import { Check, X, AlertTriangle, BarChart2 } from 'lucide-react';
import { AnalysisResult } from '../../types';

interface AnalysisResultViewProps {
  result: AnalysisResult;
  className?: string;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ 
  result, 
  className = '' 
}) => {
  const { compatibility_score, matched_keywords = [], missing_keywords = [] } = result;

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 mb-4">
            <BarChart2 className={`w-12 h-12 ${getScoreColor(compatibility_score)}`} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Score de compatibilité</h3>
          <p className={`text-5xl font-bold mt-2 ${getScoreColor(compatibility_score)}`}>
            {compatibility_score}%
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center mb-3">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <h4 className="font-medium text-gray-900">
                Compétences correspondantes ({matched_keywords.length})
              </h4>
            </div>
            {matched_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {matched_keywords.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune compétence correspondante trouvée</p>
            )}
          </div>

          <div>
            <div className="flex items-center mb-3">
              <X className="w-5 h-5 text-red-500 mr-2" />
              <h4 className="font-medium text-gray-900">
                Compétences manquantes ({missing_keywords.length})
              </h4>
            </div>
            {missing_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {missing_keywords.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Toutes les compétences requises sont couvertes</p>
            )}
          </div>
        </div>

        {result.summary && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
              Résumé
            </h4>
            <p className="text-sm text-gray-600">{result.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
};