import React, { useState, useEffect } from 'react';
import { cvService } from '../../services/cvService';
import { jobOfferService } from '../../services/jobOfferService';
import { analysisService } from '../../services/analysisService';
import { toast } from 'react-toastify';

import { User } from '../../types';

interface AnalyzeCVsProps {
  user: User;
  onLogout: () => void;
  onSelectCVs: (cvIds: number[]) => void;
}

interface CV {
  id: number;
  file_name: string;
  file_url: string;
  upload_date: string;
  candidate_id: number;
  candidate_name: string;
  score?: number;
  status?: 'pending' | 'analyzed' | 'selected' | 'rejected';
}

const AnalyzeCVs: React.FC<AnalyzeCVsProps> = ({ user, onLogout }) => {
  const [cvs, setCVs] = useState<CV[]>([]);
  const [jobOffers, setJobOffers] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCVs, setSelectedCVs] = useState<number[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchJobOffers();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchCVsForJob(Number(selectedJobId));
    } else {
      setCVs([]);
      setAnalysisResults({});
    }
  }, [selectedJobId]);

  const fetchJobOffers = async () => {
    try {
      const offers = await jobOfferService.getJobOffersByRecruiter(user.id);
      setJobOffers(offers);
    } catch (error) {
      console.error('Error fetching job offers:', error);
      toast.error('Erreur lors du chargement des offres');
    }
  };

  const fetchCVsForJob = async (jobId: number) => {
    try {
      setIsLoading(true);
      const cvsData = await cvService.getCVsForJobOffer(jobId);
      setCVs(cvsData);
      
      // Initialiser les résultats d'analyse vides
      const initialResults: Record<number, any> = {};
      cvsData.forEach((cv: CV) => {
        initialResults[cv.id] = null;
      });
      setAnalysisResults(initialResults);
    } catch (error) {
      console.error('Error fetching CVs:', error);
      toast.error('Erreur lors du chargement des CVs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeCV = async (cvId: number) => {
    try {
      setIsLoading(true);
      const result = await analysisService.analyzeCV(cvId, Number(selectedJobId));
      
      setAnalysisResults(prev => ({
        ...prev,
        [cvId]: result
      }));
      
      // Mettre à jour le score du CV dans la liste
      setCVs(prevCVs => 
        prevCVs.map(cv => 
          cv.id === cvId 
            ? { ...cv, score: result.compatibility_score, status: 'analyzed' } 
            : cv
        )
      );
      
      toast.success('Analyse du CV terminée avec succès');
    } catch (error) {
      console.error('Error analyzing CV:', error);
      toast.error('Erreur lors de l\'analyse du CV');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectCV = (cvId: number) => {
    setSelectedCVs(prev => 
      prev.includes(cvId)
        ? prev.filter(id => id !== cvId)
        : [...prev, cvId]
    );
  };

  const handleBulkAction = (action: 'select' | 'reject') => {
    setCVs(prevCVs => 
      prevCVs.map(cv => 
        selectedCVs.includes(cv.id)
          ? { ...cv, status: action === 'select' ? 'selected' : 'rejected' }
          : cv
      )
    );
    
    // Réinitialiser la sélection
    setSelectedCVs([]);
    
    toast.success(
      action === 'select' 
        ? 'CVs sélectionnés avec succès' 
        : 'CVs rejetés avec succès'
    );
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-gray-100 text-gray-800',
      analyzed: 'bg-blue-100 text-blue-800',
      selected: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    
    const statusText = {
      pending: 'En attente',
      analyzed: 'Analysé',
      selected: 'Sélectionné',
      rejected: 'Rejeté',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses] || ''}`}>
        {statusText[status as keyof typeof statusText] || status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Analyser des CVs</h1>
        
        <div className="mb-6">
          <label htmlFor="jobOffer" className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner une offre d'emploi
          </label>
          <select
            id="jobOffer"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">Sélectionner une offre</option>
            {jobOffers.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} - {job.location}
              </option>
            ))}
          </select>
        </div>
        
        {selectedJobId && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h2 className="text-lg font-medium">CVs reçus</h2>
              
              {selectedCVs.length > 0 && (
                <div className="space-x-2">
                  <button
                    onClick={() => handleBulkAction('select')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Sélectionner ({selectedCVs.length})
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Rejeter ({selectedCVs.length})
                  </button>
                </div>
              )}
            </div>
            
            {isLoading ? (
              <div className="px-4 py-5 sm:p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Chargement des CVs...</p>
              </div>
            ) : cvs.length === 0 ? (
              <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                Aucun CV trouvé pour cette offre.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {cvs.map((cv) => (
                  <li key={cv.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCVs.includes(cv.id)}
                          onChange={() => toggleSelectCV(cv.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {cv.file_name}
                            </p>
                            <span className="ml-2">
                              {getStatusBadge(cv.status || 'pending')}
                            </span>
                            {cv.score !== undefined && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Score: {cv.score.toFixed(1)}/10
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Candidat: {cv.candidate_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Téléversé le: {new Date(cv.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={cv.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Voir CV
                        </a>
                        <button
                          onClick={() => handleAnalyzeCV(cv.id)}
                          disabled={isLoading}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {isLoading ? 'Analyse...' : 'Analyser'}
                        </button>
                      </div>
                    </div>
                    
                    {analysisResults[cv.id] && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Résultats de l'analyse</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Compétences correspondantes:</p>
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              {analysisResults[cv.id]?.matchingSkills?.map((skill: string, index: number) => (
                                <li key={index} className="text-green-700">{skill}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium">Compétences manquantes:</p>
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              {analysisResults[cv.id]?.missingSkills?.map((skill: string, index: number) => (
                                <li key={index} className="text-red-700">{skill}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium">Détails:</p>
                            <p>Score global: <span className="font-medium">{analysisResults[cv.id]?.overallScore?.toFixed(1)}/10</span></p>
                            <p>Correspondance: <span className="font-medium">{analysisResults[cv.id]?.matchPercentage}%</span></p>
                            <p>Niveau d'expérience: <span className="font-medium">{analysisResults[cv.id]?.experienceLevel}</span></p>
                          </div>
                        </div>
                        
                        {analysisResults[cv.id]?.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                            <p className="text-sm text-yellow-700">
                              <span className="font-medium">Note:</span> {analysisResults[cv.id].notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzeCVs;
