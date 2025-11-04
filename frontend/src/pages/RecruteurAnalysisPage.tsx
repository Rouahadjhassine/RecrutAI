// src/pages/RecruteurAnalysisPage.tsx
import React, { useState, useRef } from 'react'; // ChangeEvent non utilisé
import { Upload, Mail, Download, BarChart2, FileText } from 'lucide-react'; // X, Search, Users, CheckCircle non utilisés
import Navbar from '../components/Layout/Navbar';
import { User } from '../types';
import api from '../services/api';

interface RankedCV {
  cv_id: number;
  candidat_name: string;
  candidat_email: string;
  candidat_id: number;
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary?: string;
}

interface SingleAnalysisResult {
  cv_id: number;
  candidat_name: string;
  candidat_email: string;
  compatibility_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary: string;
}

const MAX_CVS = 10;

interface RecruteurAnalysisPageProps {
  user: User;
  initialMode?: 'single' | 'multiple' | 'ranking';
}

const RecruteurAnalysisPage = ({ user, initialMode = 'multiple' }: RecruteurAnalysisPageProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedCVs] = useState<RankedCV[]>([]);
  const [jobText, setJobText] = useState('');
  const [rankings, setRankings] = useState<RankedCV[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [, setAnalysisComplete] = useState(false);
  const [singleResult] = useState<SingleAnalysisResult | null>(null);
  const [mode] = useState<'single' | 'multiple' | 'ranking'>(
    initialMode === 'ranking' ? 'multiple' : initialMode
  );

  // Gestion du glisser-déposer
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      handleFiles(newFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const remainingSlots = MAX_CVS - files.length;
    
    if (newFiles.length > remainingSlots) {
      setError(`Vous ne pouvez télécharger que ${remainingSlots} CV(s) supplémentaire(s).`);
      return;
    }

    // Filtrer les fichiers non-PDF
    const validFiles = newFiles.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    if (validFiles.length === 0) {
      setError('Veuillez sélectionner des fichiers PDF ou Word (DOC/DOCX) valides.');
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    setError('');
  };

  // Fonction de téléchargement des CVs (désactivée mais conservée pour référence)
  // const handleUpload = async () => {
  //   if (files.length === 0) {
  //     setError('Veuillez sélectionner au moins un CV à télécharger');
  //     return;
  //   }
  //   // ... reste de l'implémentation ...
  // };

  // Analyse des CVs
  const handleAnalyze = async () => {
    if (!jobText.trim()) {
      setError('Veuillez saisir une description de poste');
      return;
    }

    if (uploadedCVs.length === 0) {
      setError('Veuillez d\'abord télécharger des CVs à analyser');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cvIds = uploadedCVs.map(cv => cv.cv_id);
      const response = await api.post('/api/cvs/analyze-multiple/', {
        cv_ids: cvIds,
        job_description: jobText
      });

      if (response.status === 200) {
        setRankings(response.data.rankings);
        setAnalysisComplete(true);
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'analyse des CVs:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'analyse des CVs');
    } finally {
      setLoading(false);
    }
  };


  // Fonction pour exporter les résultats en CSV
  const exportCSV = () => {
    if (rankings.length === 0) return;
    
    const headers = ['Rang', 'Nom', 'Email', 'Score', 'Compétences correspondantes'];
    const csvContent = [
      headers.join(','),
      ...rankings.map((r: RankedCV, i: number) => [
        i + 1,
        `"${r.candidat_name}"`,
        `"${r.candidat_email}"`,
        r.score,
        `"${r.matched_keywords.join(', ')}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `classement-cvs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gestion du changement de la description du poste
  const handleJobTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobText(e.target.value);
  };

  // Fonction pour envoyer un email au candidat
  const sendEmail = (candidatId: number, candidatName: string, score: number) => {
    // Implémentez la logique d'envoi d'email ici
    console.log(`Envoi d'email à ${candidatName} (ID: ${candidatId}) avec un score de ${score}%`);
    // Exemple d'implémentation avec window.location
    window.location.href = `mailto:${candidatName}?subject=Votre candidature&body=Bonjour ${candidatName},%0D%0A%0D%0AVotre score est de ${score}%.`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={() => {}} role="recruteur" />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analyse des CVs</h1>
        
        {/* Zone de dépôt de fichiers */}
        <div 
          className={`border-2 border-dashed rounded-lg p-12 text-center mb-8 ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="text-sm text-gray-600">
              <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                <span>Téléchargez un fichier</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFiles(Array.from(e.target.files));
                    }
                  }}
                />
              </label>
              <p className="pl-1">ou glissez-déposez</p>
            </div>
            <p className="text-xs text-gray-500">
              PDF, DOC, DOCX jusqu'à {MAX_CVS} fichiers (max 10MB chacun)
            </p>
          </div>
        </div>

        {/* Liste des fichiers sélectionnés */}
        {files.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fichiers sélectionnés ({files.length}/{MAX_CVS})</h3>
            <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
              {files.map((file, index) => (
                <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                  <div className="w-0 flex-1 flex items-center">
                    <FileText className="flex-shrink-0 h-5 w-5 text-gray-400" />
                    <span className="ml-2 flex-1 w-0 truncate">
                      {file.name}
                    </span>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = [...files];
                        newFiles.splice(index, 1);
                        setFiles(newFiles);
                      }}
                      className="font-medium text-red-600 hover:text-red-500"
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Job Description */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Description du poste</h3>
          <textarea
            className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Copiez-collez ici la description du poste à pourvoir..."
            value={jobText}
            onChange={handleJobTextChange}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-8">
          <div>
            {jobText.trim() === '' && (
              <p className="text-gray-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ajoutez une description de poste pour commencer
              </p>
            )}
            {jobText.trim() && uploadedCVs.length === 0 && (
              <p className="text-amber-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Téléchargez au moins un CV pour l'analyse
              </p>
            )}
            {jobText.trim() && uploadedCVs.length > 0 && (
              <p className="text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Prêt à analyser {uploadedCVs.length} CV(s)
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || jobText.trim() === '' || uploadedCVs.length === 0}
            className={`px-6 py-3 rounded-lg font-medium text-white flex items-center ${
              loading || jobText.trim() === '' || uploadedCVs.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyse en cours...
              </span>
            ) : (
              <span className="flex items-center">
                <BarChart2 className="w-5 h-5 mr-2" />
                Lancer l'analyse
              </span>
            )}
          </button>
        </div>

        {/* Single Result */}
        {mode === 'single' && singleResult && (
          <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Résultat</h3>
              <span
                className={`text-4xl font-bold ${
                  singleResult.compatibility_score > 70
                    ? 'text-green-600'
                    : singleResult.compatibility_score > 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {singleResult.compatibility_score}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="font-medium text-green-700 mb-2">Compétences trouvées</p>
                <div className="flex flex-wrap gap-2">
                  {singleResult.matched_keywords.map((k, i) => (
                    <span key={i} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-red-700 mb-2">Compétences manquantes</p>
                <div className="flex flex-wrap gap-2">
                  {singleResult.missing_keywords.map((k, i) => (
                    <span key={i} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {singleResult.summary && (
              <div className="mt-4">
                <p className="font-medium mb-2">Résumé du CV</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {singleResult.summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Multiple Rankings */}
        {mode === 'multiple' && rankings.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-purple-50 flex justify-between items-center">
              <h3 className="text-xl font-bold">Classement ({rankings.length} CVs)</h3>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium"
              >
                <Download className="w-5 h-5" /> Exporter CSV
              </button>
            </div>

            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">Rang</th>
                  <th className="px-6 py-3 text-left">Candidat</th>
                  <th className="px-6 py-3 text-left">Score</th>
                  <th className="px-6 py-3 text-left">Compétences</th>
                  <th className="px-6 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-b ${r.score > 70 ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-6 py-4 font-bold">#{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{r.candidat_name}</div>
                      <div className="text-sm text-gray-500">{r.candidat_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-2xl font-bold ${
                          r.score > 70 ? 'text-green-600' : 'text-yellow-600'
                        }`}
                      >
                        {r.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {r.matched_keywords.slice(0, 3).map((k, j) => (
                          <span key={j} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {k}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => sendEmail(r.candidat_id, r.candidat_name, r.score)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Envoyer un email"
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruteurAnalysisPage;