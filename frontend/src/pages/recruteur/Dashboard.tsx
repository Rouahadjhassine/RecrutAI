// src/pages/recruteur/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  BarChart3,
  Mail,
  TrendingUp,
  Clock,
  CheckCircle,
  Search,
  Star,
} from 'lucide-react';
import { jobOfferService } from '../../services/jobOfferService';
import { JobOffer } from '../../types';
import { toast } from 'react-toastify';


interface RecruteurDashboardProps {
  user: any;
  onLogout: () => void;
}

const RecruteurDashboard: React.FC<RecruteurDashboardProps> = ({ user, onLogout }) => {
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOffers: 0,
    activeOffers: 0,
    totalCVs: 0,
    pendingReviews: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await jobOfferService.getMyJobOffers();
      
      // Handle different response formats
      let offersList: JobOffer[] = [];
      
      if (Array.isArray(response)) {
        // If the response is already an array, use it directly
        offersList = response;
      } else if (response && typeof response === 'object') {
        // If the response is an object with a data property that might be an array
        const responseData = response as { data?: JobOffer[] };
        if (Array.isArray(responseData.data)) {
          offersList = responseData.data;
        }
      }
      
      console.log('Processed offers:', offersList);
      setJobOffers(offersList);

      const activeOffers = offersList.filter((offer: JobOffer) => {
        if (!offer || !offer.deadline) return false;
        try {
          return new Date(offer.deadline) > new Date();
        } catch (e) {
          console.error('Invalid date format for offer deadline:', offer.deadline);
          return false;
        }
      });

      setStats({
        totalOffers: offersList.length,
        activeOffers: activeOffers.length,
        totalCVs: 0, // Will be updated later via API call
        pendingReviews: 0, // Will be updated later via API call
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Erreur lors du chargement des offres d\'emploi');
      setJobOffers([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-purple-700 to-pink-800 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Tableau de Bord RH 👔
              </h1>
              <p className="text-purple-100 text-lg">
                Trouvez les meilleurs talents avec l'IA
              </p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Déconnexion
            </button>
            <div className="hidden lg:block">
              <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Users className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Briefcase className="w-8 h-8" />}
          label="Offres Publiées"
          value={stats.totalOffers.toString()}
          color="purple"
          trend="+3 ce mois"
        />
        <StatCard
          icon={<CheckCircle className="w-8 h-8" />}
          label="Offres Actives"
          value={stats.activeOffers.toString()}
          color="green"
          trend="En cours"
        />
        <StatCard
          icon={<Users className="w-8 h-8" />}
          label="CVs Reçus"
          value={stats.totalCVs.toString()}
          color="blue"
          trend="+15 cette semaine"
        />
        <StatCard
          icon={<Clock className="w-8 h-8" />}
          label="En Attente"
          value={stats.pendingReviews.toString()}
          color="yellow"
          trend="À traiter"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard
            to="/recruteur/cvs"
            icon={<Users className="w-8 h-8" />}
            title="Voir les CVs"
            description="Consulter tous les CVs candidats"
            color="from-purple-500 to-purple-600"
          />
          <ActionCard
            to="/recruteur/analyze"
            icon={<Search className="w-8 h-8" />}
            title="Analyser un CV"
            description="Évaluer un candidat spécifique"
            color="from-blue-500 to-blue-600"
          />
          <ActionCard
            to="/recruteur/rank"
            icon={<TrendingUp className="w-8 h-8" />}
            title="Classer les CVs"
            description="Ranking automatique par IA"
            color="from-green-500 to-green-600"
          />
          <ActionCard
            to="/recruteur/offers/new"
            icon={<Briefcase className="w-8 h-8" />}
            title="Nouvelle Offre"
            description="Publier une offre d'emploi"
            color="from-orange-500 to-orange-600"
          />
          <ActionCard
            to="/recruteur/emails"
            icon={<Mail className="w-8 h-8" />}
            title="Envoyer Emails"
            description="Contacter les candidats"
            color="from-pink-500 to-pink-600"
          />
          <ActionCard
            to="/recruteur/analytics"
            icon={<BarChart3 className="w-8 h-8" />}
            title="Analytics"
            description="Statistiques détaillées"
            color="from-indigo-500 to-indigo-600"
          />
        </div>
      </div>

      {/* Recent Job Offers */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Offres Récentes</h2>
          <Link
            to="/recruteur/offers"
            className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2"
          >
            Voir tout
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {jobOffers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune offre publiée</h3>
            <p className="text-gray-500 mb-6">Commencez par créer votre première offre</p>
            <Link
              to="/recruteur/offers/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
            >
              <Briefcase className="w-5 h-5" />
              Créer une offre
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobOffers.slice(0, 6).map((offer) => (
              <JobOfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>

      {/* Analytics Preview */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">🚀 Pro Tip</h3>
            <p className="text-gray-700 leading-relaxed">
              Utilisez la fonctionnalité de ranking NLP pour économiser jusqu'à 70% de votre 
              temps de présélection. L'IA analyse automatiquement les compétences, l'expérience 
              et la compatibilité culturelle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component (réutilisé)
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

// Action Card Component
interface ActionCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ to, icon, title, description, color }) => {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}></div>
      <div className="relative">
        <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{description}</p>
        <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
          <span>Accéder</span>
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
};

// Job Offer Card Component
interface JobOfferCardProps {
  offer: JobOffer;
}

const JobOfferCard: React.FC<JobOfferCardProps> = ({ offer }) => {
  if (!offer) return null;
  
  
  const isActive = offer.deadline && new Date(offer.deadline) > new Date();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-purple-600" />
        </div>
        {isActive ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        ) : (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Expirée
          </span>
        )}
      </div>

      <h3 className="font-bold text-gray-900 mb-2 truncate">{offer.title}</h3>
      <p className="text-sm text-gray-500 mb-2">{offer.location || 'Télétravail'}</p>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{offer.description}</p>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Clôture</span>
          <span className="font-semibold text-gray-900">
            {offer.applicants_count || 0} candidat{offer.applicants_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecruteurDashboard;