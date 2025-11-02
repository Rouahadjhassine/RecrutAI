// src/pages/recruteur/AnalyzeCV.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Mail, BarChart2, Check, X, AlertCircle } from 'lucide-react';
import { cvService } from '../../services/cvService';
import { jobOfferService } from '../../services/jobOfferService';
import { CV, JobOffer, AnalysisResult } from '../../types';
import { toast } from 'react-toastify';

const AnalyzeCV: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cv, setCV] = useState<CV | null>(null);
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Récupérer les détails du CV
        const cvData = await cvService.getCV(Number(id));
        setCV(cvData);
        
        // Récupérer les offres d'emploi
        const offers = await jobOfferService.getMyJobOffers();
        setJobOffers(offers);
        
        // Si le CV a déjà une analyse, la charger
        if (cvData.analysis) {
          setAnalysis(cvData.analysis);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAnalyze = async () => {
    if (!selectedOfferId) {
      toast.error('Veuillez sélectionner une offre d\'emploi');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await cvService.analyzeCV(Number(id), Number(selectedOfferId));
      setAnalysis(result);
      toast.success('Analyse terminée avec succès !');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse du CV');
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadCV = () => {
    if (!cv) return;
    toast.info('Téléchargement du CV...');
    // Implémenter la logique de téléchargement
    console.log('Downloading CV:', cv.file_name);
  };

  const sendEmail = () => {
    if (!cv) return;
    toast.info('Ouverture de l\'éditeur d\'email...');
    // Implémenter la logique d'envoi d'email
  };

  if (loading || !cv) {
    return <div className="min-h-screen bg-gray-50 p-6">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Analyse de CV</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Évaluez la pertinence de ce CV par rapport à une offre d'emploi
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <button
                  onClick={downloadCV}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </button>
                <button
                  onClick={sendEmail}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contacter
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informations du CV</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Nom du fichier</h4>
                      <p className="mt-1 text-sm text-gray-900">{cv.file_name}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Date d'ajout</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(cv.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Statut</h4>
                      {analysis ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                          <Check className="h-3 w-3 mr-1" />
                          Analysé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          En attente d'analyse
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Analyser ce CV</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="jobOffer" className="block text-sm font-medium text-gray-700">
                          Sélectionner une offre d'emploi
                        </label>
                        <select
                          id="jobOffer"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          value={selectedOfferId}
                          onChange={(e) => setSelectedOfferId(e.target.value)}
                          disabled={analyzing}
                        >
                          <option value="">Sélectionner une offre</option>
                          {jobOffers.map((offer) => (
                            <option key={offer.id} value={offer.id}>
                              {offer.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={!selectedOfferId || analyzing}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                          !selectedOfferId || analyzing
                            ? 'bg-blue-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      >
                        {analyzing ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyse en cours...
                          </>
                        ) : (
                          <>
                            <BarChart2 className="h-4 w-4 mr-2" />
                            Lancer l'analyse
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                {analysis ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Résultats de l'analyse</h3>
                      
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50">
                          <BarChart2 className="h-12 w-12 text-blue-600" />
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-500">Score de compatibilité</p>
                          <p className="text-4xl font-bold text-blue-600">
                            {analysis.compatibility_score}%
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            Compétences correspondantes
                          </h4>
                          {analysis.matched_keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {analysis.matched_keywords.map((keyword, index) => (
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
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <X className="h-4 w-4 text-red-500 mr-2" />
                            Compétences manquantes
                          </h4>
                          {analysis.missing_keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {analysis.missing_keywords.map((keyword, index) => (
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
                      </div>

                      {analysis.summary && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                            Recommandations
                          </h4>
                          <p className="text-sm text-gray-600">{analysis.summary}</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Détails du CV</h3>
                      <div className="prose max-w-none">
                        {/* Afficher le contenu du CV ou un aperçu */}
                        <p className="text-sm text-gray-500">
                          Aperçu du contenu du CV. Dans une implémentation complète, cela afficherait
                          le contenu extrait du CV ou un lecteur PDF intégré.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                    <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune analyse disponible</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Sélectionnez une offre d'emploi et lancez une analyse pour voir les résultats.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeCV;