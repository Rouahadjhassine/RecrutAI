// src/components/job/AnalyzeJobOffer.tsx
import React, { useState } from 'react';
import { BarChart3, FileText, AlertCircle } from 'lucide-react';
import { jobOfferService } from '../../services/jobOfferService';
import { AnalysisResult } from '../../types';

interface AnalyzeJobOfferProps {
  onAnalyzeComplete: (result: AnalysisResult) => void;
  cvId?: number;
}

export const AnalyzeJobOffer: React.FC<AnalyzeJobOfferProps> = ({ onAnalyzeComplete, cvId }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Veuillez saisir une description de poste');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Create a temporary job offer to get an ID
      const newJobOffer = await jobOfferService.createJobOffer({
        title: 'Analyse rapide - ' + new Date().toLocaleString(),
        description: jobDescription,
        requirements: [],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours à partir de maintenant
        location: 'Non spécifié',
        status: 'draft',
        salary_range: 'Non spécifié',
        experience_level: 'Non spécifié',
        job_type: 'Temps plein',
        industry: 'Non spécifié',
        skills: []
      });
      
      // Then analyze it with the CV
      const result = await jobOfferService.analyzeJobOffer(newJobOffer.id, cvId);
      onAnalyzeComplete(result);
    } catch (err) {
      setError('Erreur lors de l\'analyse de l\'offre');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description du poste
        </label>
        <textarea
          id="job-description"
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="Collez ici la description complète du poste..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          disabled={isAnalyzing}
        />
      </div>

      {error && (
        <div className="flex items-center p-3 bg-red-50 text-red-700 rounded-md text-sm">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || !jobDescription.trim()}
        className={`flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isAnalyzing ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isAnalyzing ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyse en cours...
          </>
        ) : (
          <>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analyser la compatibilité
          </>
        )}
      </button>
    </div>
  );
};