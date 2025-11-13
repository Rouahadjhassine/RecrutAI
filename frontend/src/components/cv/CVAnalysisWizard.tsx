// src/components/CV/CVAnalysisWizard.tsx
import React, { useState, useRef } from 'react';
import { Upload, FileSearch, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { User, CV } from '../../types';
import { cvService } from '../../services/cvService';
import CVList from './CVList';
import Navbar from '../Layout/Navbar';

interface CVAnalysisWizardProps {
  user: User;
  onAnalysisComplete?: (result: any) => void;
}

const CVAnalysisWizard: React.FC<CVAnalysisWizardProps> = ({ user, onAnalysisComplete }) => {
  const [jobText, setJobText] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [showCVList, setShowCVList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Fichier sélectionné:', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Veuillez sélectionner un fichier PDF valide');
        return;
      }
      setCvFile(file);
      setSelectedCV(null); // Désélectionner le CV existant si un fichier est sélectionné
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Réinitialiser les erreurs précédentes
    setError(null);
    
    // Validation
    if (!cvFile && !selectedCV) {
      setError('Veuillez sélectionner un fichier CV ou choisir un CV existant');
      return;
    }
    
    if (!jobText.trim()) {
      setError('Veuillez coller le texte de l\'offre d\'emploi');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let cvId: number;
      
      if (cvFile) {
        // Étape 1: Uploader le nouveau CV
        const uploadResponse = await cvService.uploadCV(cvFile);
        cvId = uploadResponse.id;
      } else if (selectedCV) {
        // Utiliser le CV existant sélectionné
        cvId = selectedCV.id;
      } else {
        throw new Error('Aucun CV sélectionné');
      }
      
      // Étape 2: Analyser avec l'offre d'emploi
      const analysisResponse = await cvService.analyzeWithJobDescription(
        cvId,
        { job_description: jobText }
      );
      
      setResult(analysisResponse);
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResponse);
      }
      
      // Réinitialiser la sélection
      setCvFile(null);
      setSelectedCV(null);
      
    } catch (err: any) {
      console.error('Erreur lors de l\'analyse:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'analyse');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectCV = (cv: CV) => {
    console.log('CV sélectionné:', cv);
    setSelectedCV(cv);
    setCvFile(null);
    setShowCVList(false);
    setError(null); // Réinitialiser les erreurs lors de la sélection d'un CV
  };
  
  const handleDeleteCV = () => {
    setSelectedCV(null);
    // La liste des CVs sera actualisée automatiquement via le composant CVList
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role="candidat" />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <FileSearch className="mr-2 text-blue-600" />
          Analyse de CV et Offre d'Emploi
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg">
          {/* Section Sélection CV */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-white">
                {selectedCV ? 'CV sélectionné' : 'Sélectionner un CV existant'}
              </label>
              <button
                type="button"
                onClick={() => setShowCVList(!showCVList)}
                className="text-sm text-white hover:text-blue-200 font-medium bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-md transition-colors"
              >
                {showCVList ? 'Masquer la liste' : 'Voir mes CVs'}
              </button>
            </div>
            
            {showCVList && (
              <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                <CVList 
                  onSelectCV={handleSelectCV} 
                  onDeleteCV={handleDeleteCV}
                  selectedCVId={selectedCV?.id}
                />
              </div>
            )}
            
            {selectedCV ? (
              <div className="mb-4 p-4 border border-green-300 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-green-800">
                      <FileText className="inline mr-2 h-5 w-5" />
                      {selectedCV.file_name || 'CV sans nom'}
                    </p>
                    <p className="text-sm text-green-600">
                      Ajouté le {new Date(selectedCV.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCV(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg bg-white ${
                  cvFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-1 text-center">
                  {cvFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                      <p className="text-sm text-gray-900">{cvFile.name}</p>
                      <p className="text-xs text-gray-500">Cliquez pour changer de fichier</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-blue-600" />
                      <div className="flex text-sm text-gray-700">
                        <span className="relative cursor-pointer rounded-md font-medium text-blue-700 hover:text-blue-800 focus-within:outline-none">
                          Téléverser un nouveau CV
                        </span>
                        <p className="pl-1 text-gray-700">ou glissez-déposez</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF uniquement (max. 10MB)</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="cv-upload"
                  name="cv-upload"
                  type="file"
                  className="sr-only"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>
          
          {/* Section Offre d'emploi */}
          <div>
            <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-2">
              Coller le texte de l'offre d'emploi
            </label>
            <textarea
              id="job-description"
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Copiez et collez ici le texte complet de l'offre d'emploi..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
          </div>
          
          {/* Bouton d'analyse */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isLoading || (!cvFile && !selectedCV) || !jobText.trim()}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (isLoading || (!cvFile && !selectedCV) || !jobText.trim()) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyse en cours...
                </>
              ) : (
                <>
                  <FileSearch className="mr-2 h-5 w-5" />
                  Analyser mon CV avec cette offre
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
        
        {/* Affichage des résultats */}
        {result && (
          <div className="mt-12 bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Résultats de l'analyse</h3>
            
            {/* Score de correspondance */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Score de correspondance</h4>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div 
                  className="bg-blue-600 h-6 rounded-full text-white text-center text-sm font-medium leading-none flex items-center justify-center"
                  style={{ width: `${result.match_score || 0}%` }}
                >
                  {result.match_score?.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Compétences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Compétences correspondantes */}
              <div>
                <h4 className="text-lg font-medium mb-2">Compétences correspondantes</h4>
                <div className="flex flex-wrap gap-2">
                  {result.matching_skills?.map((skill: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Compétences manquantes */}
              <div>
                <h4 className="text-lg font-medium mb-2">Compétences à améliorer</h4>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills?.map((skill: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Résumé et conseils */}
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="text-lg font-medium mb-2">Résumé du CV</h4>
                <p className="text-gray-700">{result.summary || 'Aucun résumé disponible.'}</p>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-2">Conseils personnalisés</h4>
                {result.advice ? (
                  <div className="prose max-w-none">
                    {result.advice.split('\n').map((paragraph: string, index: number) => (
                      <p key={index} className="text-gray-700 mb-2">{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-700">Aucun conseil disponible pour le moment.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CVAnalysisWizard;
