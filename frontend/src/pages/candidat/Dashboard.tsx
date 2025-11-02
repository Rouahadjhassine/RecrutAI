// src/pages/candidat/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Search,
  FileText,
  TrendingUp,
  Target,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cvService } from '../../services/cvService';
import { CV } from '../../types';
import { toast } from 'react-toastify';

interface CandidatDashboardProps {
  user: any; // Replace 'any' with your User type
  onLogout: () => void;
}

const CandidatDashboard: React.FC<CandidatDashboardProps> = ({ user, onLogout }) => {
  const [cvs, setCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCVs: 0,
    analyzedJobs: 0,
    averageScore: 0,
    bestMatch: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await cvService.getMyCVs();
      setCVs(Array.isArray(data) ? data : []);
      
      // Calculer les statistiques
      const analyzed = data.filter((cv: CV) => cv.analysis);
      const scores = analyzed.map((cv: CV) => cv.analysis?.compatibility_score || 0);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

      setStats({
        totalCVs: data.length,
        analyzedJobs: analyzed.length,
        averageScore: Math.round(avgScore),
        bestMatch: Math.round(bestScore),
      });
    } catch (error) {
      console.error('Failed to load dashboard data', error);
      toast.error('Erreur lors du chargement des données');
      setCVs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Mon Espace Candidat</h1>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Bienvenue sur votre Dashboard ! 👋
                </h1>
                <p className="text-blue-100 text-lg">
                  Optimisez vos candidatures avec notre analyse IA
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Target className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<FileText className="w-8 h-8" />}
            label="CVs Uploadés"
            value={stats.totalCVs.toString()}
            color="blue"
            trend="+2 ce mois"
          />
          <StatCard
            icon={<Search className="w-8 h-8" />}
            label="Offres Analysées"
            value={stats.analyzedJobs.toString()}
            color="green"
            trend="+5 cette semaine"
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8" />}
            label="Score Moyen"
            value={`${stats.averageScore}%`}
            color="purple"
            trend="+12% vs mois dernier"
          />
          <StatCard
            icon={<Award className="w-8 h-8" />}
            label="Meilleur Match"
            value={`${stats.bestMatch}%`}
            color="yellow"
            trend="Excellent !"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/candidat/upload"
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Uploader un CV</h3>
                <p className="text-blue-100 mb-4">
                  Ajoutez votre CV pour commencer l'analyse
                </p>
                <div className="flex items-center text-white font-semibold">
                  <span>Commencer</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              to="/candidat/analyze"
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Analyser une Offre</h3>
                <p className="text-purple-100 mb-4">
                  Comparez votre CV avec une offre d'emploi
                </p>
                <div className="flex items-center text-white font-semibold">
                  <span>Analyser</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent CVs */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Mes CVs Récents</h2>
            <Link
              to="/candidat/upload"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              Voir tout
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {cvs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun CV uploadé</h3>
              <p className="text-gray-500 mb-6">Commencez par uploader votre premier CV</p>
              <Link
                to="/candidat/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                <Upload className="w-5 h-5" />
                Uploader mon CV
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cvs.slice(0, 6).map((cv) => (
                <CVCard key={cv.id} cv={cv} />
              ))}
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">💡 Conseil du jour</h3>
              <p className="text-gray-700 leading-relaxed">
                Pour maximiser vos chances, mettez à jour votre CV régulièrement et analysez-le 
                avec différentes offres pour identifier les compétences les plus demandées.
                Optimisez vos candidatures avec notre analyse IA
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Target className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FileText className="w-8 h-8" />}
          label="CVs Uploadés"
          value={stats.totalCVs.toString()}
          color="blue"
          trend="+2 ce mois"
        />
        <StatCard
          icon={<Search className="w-8 h-8" />}
          label="Offres Analysées"
          value={stats.analyzedJobs.toString()}
          color="green"
          trend="+5 cette semaine"
        />
        <StatCard
          icon={<TrendingUp className="w-8 h-8" />}
          label="Score Moyen"
          value={`${stats.averageScore}%`}
          color="purple"
          trend="+12% vs mois dernier"
        />
        <StatCard
          icon={<Award className="w-8 h-8" />}
          label="Meilleur Match"
          value={`${stats.bestMatch}%`}
          color="yellow"
          trend="Excellent !"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/candidat/upload"
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Uploader un CV</h3>
              <p className="text-blue-100 mb-4">
                Ajoutez votre CV pour commencer l'analyse
              </p>
              <div className="flex items-center text-white font-semibold">
                <span>Commencer</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            to="/candidat/analyze"
            className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Analyser une Offre</h3>
              <p className="text-purple-100 mb-4">
                Comparez votre CV avec une offre d'emploi
              </p>
              <div className="flex items-center text-white font-semibold">
                <span>Analyser</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent CVs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Mes CVs Récents</h2>
          <Link
            to="/candidat/upload"
            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
          >
            Voir tout
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {cvs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun CV uploadé</h3>
            <p className="text-gray-500 mb-6">Commencez par uploader votre premier CV</p>
            <Link
              to="/candidat/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              <Upload className="w-5 h-5" />
              Uploader mon CV
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cvs.slice(0, 6).map((cv) => (
              <CVCard key={cv.id} cv={cv} />
            ))}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">💡 Conseil du jour</h3>
            <p className="text-gray-700 leading-relaxed">
              Pour maximiser vos chances, mettez à jour votre CV régulièrement et analysez-le 
              avec différentes offres pour identifier les compétences les plus demandées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  trend: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, trend }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
          {trend}
        </span>
      </div>
      <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

// CV Card Component
interface CVCardProps {
  cv: CV;
}

const CVCard: React.FC<CVCardProps> = ({ cv }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        {cv.analysis ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Analysé
          </span>
        ) : (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        )}
      </div>

      <h3 className="font-bold text-gray-900 mb-2 truncate">{cv.file_name}</h3>
      <p className="text-sm text-gray-500 mb-4">
        Uploadé le {new Date(cv.uploaded_at).toLocaleDateString('fr-FR')}
      </p>

      {cv.analysis && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Meilleur match</span>
            <span className="text-2xl font-bold text-green-600">
              {cv.analysis.compatibility_score}%
            </span>
          </div>
        </div>
      )}

      <Link
        to={`/candidat/cv/${cv.id}`}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-semibold hover:bg-blue-100 transition"
      >
        Voir détails
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
};

export default CandidatDashboard;