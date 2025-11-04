// src/pages/RecruteurAnalysisPage.tsx
import React, { useState, useRef } from 'react';
import { Upload, BarChart3, Mail, Download, X, Info, Search, FileText, User as UserIcon } from 'lucide-react';
import Tooltip from '../components/Shared/Tooltip';
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

const RecruteurAnalysisPage = ({ user }: { user: User }) => {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [files, setFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedCVs, setUploadedCVs] = useState<any[]>([]);
  const [jobText, setJobText] = useState('');
  const [selectedCVId, setSelectedCVId] = useState<number | null>(null);
  const [singleResult, setSingleResult] = useState<SingleAnalysisResult | null>(null);
  const [rankings, setRankings] = useState<RankedCV[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Upload CVs
  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('cvs', file);
    });

    try {
      const response = await api.post('/api/upload_cvs_recruteur/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          console.log(`Upload progress: ${progress}%`);
        },
      });
      setUploadedCVs(prev => [...prev, ...response.data]);
      setFiles([]);
      if (response.data.length > 0) {
        setSelectedCVId(response.data[0].cv_id);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Erreur lors de l\'upload des CVs. Veuillez réessayer.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeCV = (cvId: number) => {
    setUploadedCVs(prev => prev.filter(cv => cv.cv_id !== cvId));
    if (selectedCVId === cvId) {
      setSelectedCVId(uploadedCVs[0]?.cv_id || null);
    }
  };

  const filteredCVs = uploadedCVs.filter(cv => 
    cv.candidat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.candidat_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      // Check for duplicate filenames
      const duplicates = newFiles.filter(newFile => 
        uploadedCVs.some(cv => cv.cv_name === newFile.name)
      );
      
      if (duplicates.length > 0) {
        setError(`Les fichiers suivants existent déjà : ${duplicates.map(f => f.name).join(', ')}`);
        return;
      }
      
      setFiles(newFiles);
      setError('');
    }
  };

  // Analyse 1 CV
  const analyzeSingle = async () => {
    if (!selectedCVId || !jobText.trim()) return;
    
    setLoading(true);
    try {
      const res = await api.post('/api/cvs/recruteur/analyze-single/', {
        cv_id: selectedCVId,
        job_offer_text: jobText
      });
      setSingleResult(res.data);
    } catch (err) {
      alert('Erreur d\'analyse');
    } finally {
      setLoading(false);
    }
  };

  // Classement multiple
  const rankMultiple = async () => {
    if (!jobText.trim()) return;
    
    setLoading(true);
    try {
      const res = await api.post('/api/cvs/recruteur/rank/', {
        job_offer_text: jobText
      });
      setRankings(res.data.rankings);
    } catch (err) {
      alert('Erreur de classement');
    } finally {
      setLoading(false);
    }
  };

  // Envoi email
  const sendEmail = async (candidateId: number, name: string, score: number) => {
    const subject = `Opportunité : Score ${score}%`;
    const message = `Bonjour ${name},\n\nVotre profil a obtenu un score de ${score}% pour notre offre.\n\nCordialement,\nL'équipe RecrutAI`;
    
    try {
      await api.post('/api/cvs/send-email/', {
        candidate_id: candidateId,
        subject,
        message
      });
      alert('Email envoyé !');
    } catch (err) {
      alert('Erreur d\'envoi');
    }
  };

  // Export CSV
  const exportCSV = () => {
    const csv = rankings.map((r, i) => ({
      Rang: i + 1,
      Nom: r.candidat_name,
      Email: r.candidat_email,
      Score: r.score,
      Compétences: r.matched_keywords.join('; ')
    }));
    
    const headers = Object.keys(csv[0]).join(',');
    const rows = csv.map(row => Object.values(row).join(','));
    const data = [headers, ...rows].join('\n');
    
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classement_cvs.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <Navbar user={user} onLogout={() => {}} role="recruteur" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-4xl font-bold text-white mb-8 text-center">
          Analyse de CVs
        </h2>

        {/* Toggle Mode */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setMode('single')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              mode === 'single'
                ? 'bg-white text-purple-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            1 CV
          </button>
          <button
            onClick={() => setMode('multiple')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              mode === 'multiple'
                ? 'bg-white text-purple-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Plusieurs CVs
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Gérer les CVs
              <Tooltip content="Formats acceptés : PDF, DOCX, TXT (max 5MB par fichier)">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </Tooltip>
            </h3>
            {uploadedCVs.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un CV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 text-center">
            <div className="flex flex-col items-center justify-center py-4">
              <Upload className="w-10 h-10 text-purple-600 mb-2" />
              <p className="text-sm text-gray-600 mb-2">Glissez-déposez vos fichiers ici ou</p>
              <label className="cursor-pointer bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Parcourir les fichiers
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Formats acceptés : PDF, DOCX, TXT (max 5MB)</p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mb-4 bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="font-medium text-blue-800">
                  {files.length} fichier(s) prêt(s) à l'upload
                </p>
                <button 
                  onClick={() => setFiles([])}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ul className="text-sm text-blue-700 space-y-1 max-h-32 overflow-y-auto">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between bg-white p-2 rounded">
                    <span className="truncate max-w-xs">{f.name}</span>
                    <span className="text-xs text-gray-500">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              {uploadedCVs.length > 0 && (
                <p className="text-sm text-gray-600">
                  {uploadedCVs.length} CV(s) dans la base
                </p>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={loading || files.length === 0}
              className={`px-6 py-2 rounded-lg font-medium ${
                loading || files.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Upload en cours...
                </span>
              ) : (
                'Uploader les CVs'
              )}
            </button>
          </div>

          {uploadedCVs.length > 0 && (
            <div className="mt-6">
              <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCVs.map((cv) => (
                    <div 
                      key={cv.cv_id} 
                      className={`border rounded-lg p-3 flex items-start justify-between ${
                        selectedCVId === cv.cv_id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{cv.candidat_name}</p>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">{cv.candidat_email}</p>
                          <p className="text-xs text-gray-400 mt-1">Ajouté le {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedCVId(cv.cv_id)}
                          className="text-gray-400 hover:text-purple-600"
                          title="Sélectionner"
                        >
                          <UserIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeCV(cv.cv_id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Supprimer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Analysis Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              {mode === 'single' ? 'Analyse du CV' : 'Analyse des CVs'}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Mode :</span>
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    mode === 'single'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  1 CV
                </button>
                <button
                  type="button"
                  onClick={() => setMode('multiple')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    mode === 'multiple'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Multi-CVs
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  {mode === 'single' 
                    ? 'Sélectionnez un CV et entrez le texte de l\'offre pour obtenir une analyse détaillée.'
                    : 'Tous les CVs seront analysés et classés par pertinence par rapport à l\'offre.'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <h4 className="text-lg font-medium text-gray-900 mb-3">Description du poste</h4>

          <div className="relative mb-4">
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              rows={8}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="Collez le texte de l'offre d'emploi ici..."
            />
            {jobText && (
              <button
                onClick={() => setJobText('')}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
                title="Effacer le texte"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {jobText.length} caractères
            </div>
          </div>

          {mode === 'single' && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block font-medium mb-2 text-gray-700">
                CV sélectionné :
              </label>
              {selectedCVId ? (
                <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {uploadedCVs.find(cv => cv.cv_id === selectedCVId)?.candidat_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {uploadedCVs.find(cv => cv.cv_id === selectedCVId)?.candidat_email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCVId(null)}
                    className="text-gray-400 hover:text-red-600"
                    title="Changer de CV"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed rounded-lg">
                  <p className="text-gray-500 mb-2">Aucun CV sélectionné</p>
                  <p className="text-sm text-gray-400">
                    {uploadedCVs.length > 0 
                      ? 'Sélectionnez un CV dans la liste ci-dessus' 
                      : 'Veuvez d\'abord uploader un CV'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={mode === 'single' ? analyzeSingle : rankMultiple}
              disabled={loading || !jobText.trim() || (mode === 'single' && !selectedCVId)}
              className={`w-full py-3 px-6 rounded-lg font-bold transition-all ${
                loading || !jobText.trim() || (mode === 'single' && !selectedCVId)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-200 transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyse en cours...
                </div>
              ) : mode === 'single' ? (
                <div className="flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analyser ce CV
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Classer tous les CVs ({uploadedCVs.length})
                </div>
              )}
            </button>
            
            {!jobText.trim() && (
              <p className="mt-2 text-sm text-red-600 text-center">
                Veuillez saisir la description du poste
              </p>
            )}
            {mode === 'single' && !selectedCVId && (
              <p className="mt-2 text-sm text-red-600 text-center">
                Veuillez sélectionner un CV à analyser
              </p>
            )}
          </div>
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