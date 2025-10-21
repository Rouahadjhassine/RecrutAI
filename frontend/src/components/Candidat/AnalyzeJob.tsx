import React, { useState } from 'react';
import { Check } from 'lucide-react';

export const AnalyzeJob: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      setResults([
        { keyword: 'React', match: true, weight: 95 },
        { keyword: 'Django', match: true, weight: 90 },
        { keyword: 'TypeScript', match: false, weight: 0 },
        { keyword: 'AWS', match: true, weight: 75 },
        { keyword: 'Docker', match: true, weight: 85 },
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Analysez une offre d'emploi</h2>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Titre du poste</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Ex: React Developer Senior"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Collez la description complète..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={analyzing || !jobTitle || !jobDesc}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
        >
          {analyzing ? 'Analyse en cours...' : 'Analyser'}
        </button>

        {results.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <h3 className="text-xl font-bold mb-4">Résultats</h3>
            <div className="space-y-3">
              {results.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{item.keyword}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.match ? item.weight : 0}%` }}></div>
                    </div>
                    {item.match ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <span className="text-gray-400">✗</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};