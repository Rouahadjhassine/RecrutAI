// src/pages/recruteur/RankCVs.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BarChart2, Filter, Download, Mail, Check, X, AlertCircle } from 'lucide-react';
import { jobOfferService } from '../../services/jobOfferService';
import { JobOffer, AnalysisResult } from '../../types';
import { toast } from 'react-toastify';

interface RankedCV {
  id: number;
  file_name: string;
  analysis: AnalysisResult;
  rank: number;
}

const RankCVs: React.FC = () => {
  const navigate = useNavigate();
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [rankedCVs, setRankedCVs] = useState<RankedCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);

  useEffect(() => {
    const fetchJobOffers = async () => {
      try {
        const offers = await jobOfferService.getMyJobOffers();
        setJobOffers(offers);
        
        // Sélectionner la première offre par défaut si disponible
        if (offers.length > 0) {
          setSelectedOfferId(offers[0].id.toString());
        }
      } catch (error) {
        console.error('Error fetching job offers:', error);
        toast.error('Erreur lors du chargement des offres');
      } finally {
        setLoading(false);
      }
    };

    fetchJobOffers();
  }, []);

  useEffect(() => {
    if (selectedOfferId) {
      fetchRankedCVs(Number(selectedOfferId));
    }
  }, [selectedOfferId]);

  const fetchRankedCVs = async (offerId: number) => {
    try {
      setRanking(true);
      // Simuler un appel API pour obtenir les CVs classés
      // Dans une implémentation réelle, cela appellerait le service approprié
      const response = await jobOfferService.rankCVs(offerId);
      setRankedCVs(
        response
          .sort((a, b) => b.analysis.compatibility_score - a.analysis.compatibility_score)
          .map((item, index) => ({
            ...item.cv,
            analysis: item.analysis,
            rank: index + 1,
          }))
      );
    } catch (error) {
      console.error('Error ranking CVs:', error);
      toast.error('Erreur lors du classement des CVs');
    } finally {
      setRanking(false);
    }
  };

  const handleRankCVs = async () => {
    if (!selectedOfferId) {
      toast.error('Veuillez sélectionner une offre d\'emploi');
      return;
    }

    try {
      setRanking(true);
      // Simuler un nouvel appel pour reclasser les CVs
      await fetchRankedCVs(Number(selectedOfferId));
      toast.success('Classement des CVs mis à jour avec succès');
    } catch (error) {
      console.error('Error ranking CVs:', error);
      toast.error('Erreur lors du classement des CVs');
    } finally {
      setRanking(false);
    }
  };

  const downloadRanking = () => {
    toast.info('Téléchargement du classement...');
    // Implémenter la logique de téléchargement
  };

  const sendEmails = () => {
    toast.info('Préparation de l\'envoi d\'emails...');
    // Implémenter la logique d'envoi d'emails
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6">Chargement des offres d'emploi...</div>;
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
                <h2 className="text-xl font-semibold text-gray-900">Classement des CVs</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Classez automatiquement les CVs par pertinence pour une offre donnée
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <button
                  onClick={downloadRanking}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </button>
                <button
                  onClick={sendEmails}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contacter les candidats
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-96">
                  <label htmlFor="jobOffer" className="block text-sm font-medium text-gray-700">
                    Offre d'emploi
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <select
                      id="jobOffer"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={selectedOfferId}
                      onChange={(e) => setSelectedOfferId(e.target.value)}
                      disabled={ranking}
                    >
                      {jobOffers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleRankCVs}
                      disabled={!selectedOfferId || ranking}
                      className={`ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        !selectedOfferId || ranking
                          ? 'bg-blue-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      {ranking ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Classement en cours...
                        </>
                      ) : (
                        <>
                          <BarChart2 className="h-4 w-4 mr-2" />
                          Classer les CVs
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {rankedCVs.length > 0 ? (
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rang
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom du fichier
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Détails
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rankedCVs.map((cv) => (
                      <tr key={cv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                              {cv.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-md">
                              <BarChart2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{cv.file_name}</div>
                              <div className="text-sm text-gray-500">
                                {cv.analysis.compatibility_score}% de correspondance
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${cv.analysis.compatibility_score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {cv.analysis.compatibility_score}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/recruteur/cvs/${cv.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Voir détails
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun CV à classer</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sélectionnez une offre d'emploi et lancez le classement pour voir les résultats.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankCVs;