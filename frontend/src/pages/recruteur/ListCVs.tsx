// src/pages/recruteur/ListCVs.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Mail, X, Check, Clock, FileText } from 'lucide-react';
import { cvService } from '../../services/cvService';
import { CV } from '../../types';
import { toast } from 'react-toastify';

const ListCVs: React.FC = () => {
  const [cvs, setCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedCVs, setSelectedCVs] = useState<number[]>([]);

  useEffect(() => {
    const fetchCVs = async () => {
      try {
        const data = await cvService.getMyCVs();
        setCVs(data);
      } catch (error) {
        console.error('Failed to fetch CVs', error);
        toast.error('Erreur lors du chargement des CVs');
      } finally {
        setLoading(false);
      }
    };

    fetchCVs();
  }, []);

  const toggleSelectCV = (cvId: number) => {
    setSelectedCVs(prev =>
      prev.includes(cvId)
        ? prev.filter(id => id !== cvId)
        : [...prev, cvId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCVs.length === cvs.length) {
      setSelectedCVs([]);
    } else {
      setSelectedCVs(cvs.map(cv => cv.id));
    }
  };

  const filteredCVs = cvs.filter(cv => {
    const matchesSearch = cv.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cv.analysis?.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'analyzed' && cv.analysis) ||
      (filters.status === 'pending' && !cv.analysis);

    const matchesDate = (!filters.dateFrom || new Date(cv.uploaded_at) >= new Date(filters.dateFrom)) &&
      (!filters.dateTo || new Date(cv.uploaded_at) <= new Date(filters.dateTo + 'T23:59:59'));

    return matchesSearch && matchesStatus && matchesDate;
  });

  const downloadCV = (cv: CV) => {
    // Implémenter le téléchargement du CV
    toast.info('Téléchargement du CV...');
    console.log('Downloading CV:', cv.file_name);
  };

  const sendEmail = (cv: CV) => {
    // Implémenter l'envoi d'email
    toast.info('Ouverture de l\'éditeur d\'email...');
    console.log('Sending email for CV:', cv.id);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6">Chargement des CVs...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">CVs des candidats</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez et consultez les CVs des candidats
          </p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="relative rounded-md shadow-sm w-full sm:w-96 mb-4 sm:mb-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md h-10"
                  placeholder="Rechercher un CV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex space-x-3">
                <div className="relative">
                  <select
                    className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="analyzed">Analysés</option>
                    <option value="pending">En attente</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <Filter className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <button
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    // Réinitialiser les filtres
                    setSearchTerm('');
                    setFilters({
                      status: 'all',
                      dateFrom: '',
                      dateTo: '',
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Réinitialiser
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">
                  À partir du
                </label>
                <input
                  type="date"
                  id="dateFrom"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">
                  Jusqu'au
                </label>
                <input
                  type="date"
                  id="dateTo"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  min={filters.dateFrom}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedCVs.length === cvs.length && cvs.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom du fichier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'ajout
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCVs.length > 0 ? (
                  filteredCVs.map((cv) => (
                    <tr key={cv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={selectedCVs.includes(cv.id)}
                          onChange={() => toggleSelectCV(cv.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-md">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {cv.file_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {cv.analysis?.job_title || 'Aucune analyse'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cv.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cv.analysis ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Analysé
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cv.analysis ? (
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${cv.analysis.compatibility_score}%` }}
                              ></div>
                            </div>
                            <span>{cv.analysis.compatibility_score}%</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => downloadCV(cv)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Télécharger"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => sendEmail(cv)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Envoyer un email"
                          >
                            <Mail className="h-5 w-5" />
                          </button>
                          <Link
                            to={`/recruteur/cvs/${cv.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Voir les détails"
                          >
                            <span className="sr-only">Voir</span>
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucun CV trouvé avec les critères sélectionnés
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedCVs.length > 0 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between items-center">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{selectedCVs.length}</span> CV{selectedCVs.length > 1 ? 's' : ''} sélectionné{selectedCVs.length > 1 ? 's' : ''}
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => {
                      // Action groupée 1
                      toast.info('Action groupée 1 sur les CVs sélectionnés');
                    }}
                  >
                    <span>Action groupée 1</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => {
                      // Action groupée 2
                      toast.info('Action groupée 2 sur les CVs sélectionnés');
                    }}
                  >
                    <span>Action groupée 2</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListCVs;