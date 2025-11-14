import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Mail, ArrowUpDown, X } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import { User } from '../types';
import { cvService } from '../services/cvService';

// Fonction utilitaire pour extraire un nom à partir d'un nom de fichier
const extractNameFromFile = (filename: string): string => {
  // Supprimer l'extension du fichier
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // Remplacer les tirets et underscores par des espaces
  const nameWithSpaces = nameWithoutExt.replace(/[-_]/g, ' ');
  // Mettre en majuscule la première lettre de chaque mot
  return nameWithSpaces.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Fonction utilitaire pour générer un email à partir d'un nom
const generateEmailFromName = (name: string): string => {
  // Créer une version simplifiée du nom pour l'email
  const emailName = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/(^\.|\.$)/g, '');
  
  return `${emailName}@example.com`;
};

interface CVFile {
  file: File;
  preview: string;
  extractedText?: string;
  email?: string;
  name: string;
  score?: number;
}

const RecruiterRankingPage: React.FC<{ user: User }> = ({ user }) => {
  const [cvFiles, setCvFiles] = useState<CVFile[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rankedCandidates, setRankedCandidates] = useState<CVFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour extraire le nom et l'email du nom du fichier
  const extractInfoFromFilename = (filename: string) => {
    // Supprimer l'extension du fichier
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Remplacer les tirets et underscores par des espaces
    const cleanName = nameWithoutExt.replace(/[-_]+/g, ' ');
    
    // Extraire le prénom et le nom (supposons que le format est "Prénom NOM")
    const nameParts = cleanName.split(' ').filter(Boolean);
    let firstName = '';
    let lastName = '';
    
    if (nameParts.length > 0) {
      firstName = nameParts[0];
      if (nameParts.length > 1) {
        // Si on a plusieurs parties, on considère que le nom de famille est la dernière partie
        lastName = nameParts[nameParts.length - 1];
      }
    }
    
    // Créer un email basé sur le nom
    let email = '';
    if (firstName && lastName) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    } else if (firstName) {
      email = `${firstName.toLowerCase()}@example.com`;
    } else {
      email = 'inconnu@example.com';
    }
    
    // Mettre en forme le nom (première lettre en majuscule pour chaque mot)
    const formattedName = cleanName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return {
      name: formattedName,
      email: email
    };
  };

  // Gestion du téléchargement des fichiers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = await Promise.all(
        Array.from(e.target.files).map(async (file) => {
          const { name, email } = extractInfoFromFilename(file.name);
          
          return {
            file,
            preview: URL.createObjectURL(file),
            name,
            email,
            score: Math.floor(Math.random() * 100) // Score simulé
          };
        })
      );
      
      setCvFiles(prev => {
        const updatedFiles = [...prev, ...newFiles];
        return updatedFiles.slice(0, 10); // Limite à 10 fichiers
      });
    }
  };

  // Nettoyage des URLs de prévisualisation
  useEffect(() => {
    return () => {
      cvFiles.forEach(file => URL.revokeObjectURL(file.preview));
    };
  }, [cvFiles]);

  // Supprimer un CV de la liste
  const removeFile = (index: number) => {
    setCvFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Lancer l'analyse
  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      alert('Veuillez saisir une description de poste');
      return;
    }
    
    if (cvFiles.length === 0) {
      alert('Veuillez ajouter au moins un CV');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      console.log('Envoi de la demande d\'analyse au serveur...', {
        job_offer_text: jobDescription,
        nombre_cvs: cvFiles.length
      });
      
      // Utiliser la méthode rankCVs avec les fichiers et la description du poste
      const rankings = await cvService.rankCVs(
        cvFiles.map(cv => cv.file),
        jobDescription
      );
      
      console.log('Réponse du serveur:', rankings);
      
      if (!rankings || rankings.length === 0) {
        throw new Error('Aucune donnée reçue du serveur');
      }
      
      // Mettre à jour les CVs avec les données du serveur
      const updatedCvFiles = cvFiles.map((cvFile, index) => {
        const rankedCv = rankings.find((r: any) => r.cv_id && r.cv_id.toString() === cvFile.file.name) || rankings[index] || {};
        return {
          ...cvFile,
          name: rankedCv.candidat_name || extractNameFromFile(cvFile.file.name),
          email: rankedCv.candidat_email || generateEmailFromName(extractNameFromFile(cvFile.file.name)),
          score: rankedCv.score || 0,
          extractedText: rankedCv.matched_keywords && rankedCv.matched_keywords.length > 0
            ? `Mots-clés correspondants: ${rankedCv.matched_keywords.join(', ')}`
            : 'Aucun mot-clé correspondant trouvé',
          missingKeywords: rankedCv.missing_keywords || []
        };
      });
      
      // Trier par score décroissant
      const sortedCandidates = [...updatedCvFiles].sort((a, b) => (b.score || 0) - (a.score || 0));
      setRankedCandidates(sortedCandidates);
      
    } catch (error: any) {
      console.error('Erreur lors de l\'analyse des CVs:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Afficher un message d'erreur clair à l'utilisateur
      alert(`Erreur lors de l'analyse des CVs: ${error.message || 'Erreur inconnue'}`);
      
      // Ne pas utiliser de données simulées pour éviter la confusion
      setRankedCandidates([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ouvrir le client mail
  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}?subject=Candidature&body=Bonjour,`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role="recruteur" />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-blue-700 mb-6">Classement IA des Candidats</h1>
          
          {/* Zone de dépôt de fichiers */}
          <div className="mb-8">
            <div 
              className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <p className="text-lg text-gray-700 mb-2">Glissez-déposez jusqu'à 10 CVs</p>
              <p className="text-sm text-gray-500">ou cliquez pour sélectionner des fichiers</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            {/* Liste des fichiers sélectionnés */}
            {cvFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {cvFiles.length} CV{cvFiles.length > 1 ? 's' : ''} sélectionné{cvFiles.length > 1 ? 's' : ''}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {cvFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-pink-500 mr-2" />
                        <span className="text-sm text-gray-700 truncate max-w-xs">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Description du poste */}
          <div className="mb-8">
            <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Description du poste
            </label>
            <textarea
              id="jobDescription"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
              placeholder="Collez ici la description du poste..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          
          {/* Bouton d'analyse */}
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || cvFiles.length === 0 || !jobDescription.trim()}
              className={`px-6 py-3 rounded-full font-medium text-white ${
                isAnalyzing || cvFiles.length === 0 || !jobDescription.trim()
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors flex items-center`}
            >
              {isAnalyzing ? (
                'Analyse en cours...'
              ) : (
                <>
                  <ArrowUpDown className="mr-2 h-5 w-5" />
                  Classer les candidats
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Résultats du classement */}
        {rankedCandidates.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-pink-700 mb-6">Résultats du classement</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rankedCandidates.map((candidate, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {candidate.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (candidate.score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                          (candidate.score || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {candidate.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => candidate.email && handleEmailClick(candidate.email)}
                          className="text-pink-600 hover:text-pink-900 flex items-center"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Contacter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RecruiterRankingPage;
