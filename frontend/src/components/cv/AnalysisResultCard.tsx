import { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export default function AnalysisResultCard({ result }: Props) {
  const score = result.compatibility_score;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Score de compatibilité</h3>
        <span className={`text-3xl font-bold ${score > 70 ? 'text-green-600' : score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {score}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="font-medium text-green-700">Compétences trouvées</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {result.matched_keywords.map((k, i) => (
              <span key={i} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">{k}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium text-red-700">Compétences manquantes</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {result.missing_keywords.map((k, i) => (
              <span key={i} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">{k}</span>
            ))}
          </div>
        </div>
      </div>

      {result.summary && (
        <div>
          <p className="font-medium mb-2">Résumé du CV</p>
          <p className="text-sm text-gray-600">{result.summary}</p>
        </div>
      )}
    </div>
  );
}