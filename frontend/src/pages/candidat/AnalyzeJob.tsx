// src/pages/candidat/AnalyzeJob.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, FileText, Check, X, AlertCircle } from 'lucide-react';
import { cvService } from '../../services/cvService';
import { analysisService } from '../../services/analysisService';
import { toast } from 'react-toastify';
import { AnalysisResult, CV } from '../../types';

interface CVWithSelection extends CV {
  selected: boolean;
  id: number;
  file_name: string;
  uploaded_at: string;
  analysis?: AnalysisResult;
}

const AnalyzeJob: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [cvs, setCVs] = useState<CVWithSelection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCVs = async () => {
      try {
        const data = await cvService.getMyCVs();
        setCVs(data.map(cv => ({ ...cv, selected: false })));
      } catch (error) {
        console.error('Failed to fetch CVs', error);
        toast.error('Erreur lors du chargement des CVs');
      } finally {
        setLoading(false);
      }
    };

    fetchCVs();
  }, []);

  const handleCVSelect = (cvId: number) => {
    setCVs(cvs.map(cv => ({
      ...cv,
      selected: cv.id === cvId ? !cv.selected : false
    })));
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Veuillez saisir une description de poste');
      return;
    }

    const selectedCV = cvs.find(cv => cv.selected);
    if (!selectedCV) {
      toast.error('Veuillez sélectionner un CV à analyser');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analysisService.analyzeCV(selectedCV.id, undefined, jobDescription);
      setAnalysisResult(result);
      
      // Update the CV's analysis in the list
      setCVs(cvs.map(cv => 
        cv.id === selectedCV.id 
          ? { ...cv, analysis: result } 
          : cv
      ));
      
      toast.success('Analyse terminée avec succès !');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse du CV');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6">Chargement de vos CVs...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analyser une offre d'emploi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Analysez la compatibilité de votre CV avec une offre d'emploi
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">1. Description du poste</h2>
              <textarea
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Collez ici la description complète du poste..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">2. Sélectionnez un CV</h2>
              {cvs.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun CV trouvé</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Vous devez d'abord téléverser un CV.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/candidat/upload')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Téléverser un CV
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cvs.map((cv) => (
                    <li key={cv.id}>
                      <button
                        type="button"
                        onClick={() => handleCVSelect(cv.id)}
                        className={`w-full text-left p-4 rounded-lg border ${
                          cv.selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        } transition-colors`}
                        disabled={isAnalyzing}
                      >
                        <div className="flex items-center">
                          <div
                            className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center ${
                              cv.selected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {cv.selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{cv.file_name}</p>
                            <p className="text-xs text-gray-500">
                              Téléversé le {new Date(cv.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isAnalyzing}
              >
                Annuler
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobDescription.trim() || !cvs.some(cv => cv.selected)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <BarChart2 className="-ml-1 mr-2 h-4 w-4" />
                    Analyser la compatibilité
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Résultats d'analyse</h2>
              
              {analysisResult ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50">
                      <BarChart2 className="h-10 w-10 text-blue-600" />
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-500">Score de compatibilité</p>
                      <p className="text-4xl font-bold text-blue-600">
                        {analysisResult.compatibility_score}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-1" />
                        Compétences correspondantes
                      </h3>
                      {analysisResult.matched_keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.matched_keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Aucune compétence correspondante</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <X className="h-4 w-4 text-red-500 mr-1" />
                        Compétences manquantes
                      </h3>
                      {analysisResult.missing_keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.missing_keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Toutes les compétences sont couvertes</p>
                      )}
                    </div>

                    {analysisResult.summary && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                          <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                          Recommandations
                        </h3>
                        <p className="text-sm text-gray-600">{analysisResult.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune analyse</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Les résultats d'analyse apparaîtront ici après avoir analysé une offre.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeJob;