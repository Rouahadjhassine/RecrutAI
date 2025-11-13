// src/pages/RecruteurAnalysisPage.tsx
import React, { useState } from 'react';
import { Upload, BarChart3, Mail, Download } from 'lucide-react';
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

export default function RecruteurAnalysisPage({ user }: { user: User }) {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedCVs, setUploadedCVs] = useState<any[]>([]);
  const [jobText, setJobText] = useState('');
  const [selectedCVId, setSelectedCVId] = useState<number | null>(null);
  const [singleResult, setSingleResult] = useState<SingleAnalysisResult | null>(null);
  const [rankings, setRankings] = useState<RankedCV[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload CVs
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await api.post('/api/cvs/recruteur/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedCVs(res.data.uploaded_cvs);
      alert(`${res.data.uploaded_cvs.length} CV(s) uploadé(s)`);
      setFiles([]);
    } catch (err) {
      alert('Erreur lors de l\'upload');
    } finally {
      setLoading(false);
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
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Uploader des CVs
          </h3>
          
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="block w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
          />
          
          {files.length > 0 && (
            <div className="mb-4">
              <p className="font-medium mb-2">{files.length} fichier(s) sélectionné(s) :</p>
              <ul className="text-sm text-gray-600">
                {files.map((f, i) => (
                  <li key={i}>• {f.name}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || files.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Upload...' : 'Uploader'}
          </button>

          {uploadedCVs.length > 0 && (
            <div className="mt-6">
              <p className="font-medium mb-2 text-green-700">
                ✓ {uploadedCVs.length} CV(s) uploadé(s)
              </p>
              <div className="max-h-40 overflow-y-auto">
                {uploadedCVs.map((cv, i) => (
                  <div key={i} className="text-sm text-gray-700 border-b py-2">
                    <strong>{cv.candidat_name}</strong> - {cv.candidat_email}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Offre d'emploi
          </h3>

          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            rows={8}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none mb-4"
            placeholder="Collez le texte de l'offre d'emploi ici..."
          />

          {mode === 'single' && uploadedCVs.length > 0 && (
            <div className="mb-4">
              <label className="block font-medium mb-2">Sélectionner un CV :</label>
              <select
                value={selectedCVId || ''}
                onChange={(e) => setSelectedCVId(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Choisir --</option>
                {uploadedCVs.map((cv) => (
                  <option key={cv.cv_id} value={cv.cv_id}>
                    {cv.candidat_name} ({cv.candidat_email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={mode === 'single' ? analyzeSingle : rankMultiple}
            disabled={loading || !jobText.trim() || (mode === 'single' && !selectedCVId)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
          >
            {loading
              ? 'Analyse en cours...'
              : mode === 'single'
              ? 'Analyser 1 CV'
              : 'Classer tous les CVs'}
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
}