// src/pages/recruteur/SendEmails.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Check, X, User as UserIcon, Paperclip, Send, AlertCircle } from 'lucide-react';
import { jobOfferService } from '../../services/jobOfferService';
import type { JobOffer, User } from '../../types';
import { toast } from 'react-toastify';

interface SendEmailsProps {
  user: User;
  onLogout: () => void;
  selectedCandidates: number[];
}

interface Candidate {
  id: number;
  name: string;
  email: string;
  cvId: number;
  selected: boolean;
}

const SendEmails: React.FC<SendEmailsProps> = ({ user, onLogout, selectedCandidates }) => {
  const navigate = useNavigate();
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emailContent, setEmailContent] = useState({
    subject: '',
    body: '',
    template: 'default',
  });

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
      fetchCandidates(Number(selectedOfferId));
    }
  }, [selectedOfferId]);

  const fetchCandidates = async (offerId: number) => {
    try {
      setLoading(true);
      // Simuler un appel API pour obtenir les candidats
      // Dans une implémentation réelle, cela appellerait le service approprié
      const response = await jobOfferService.rankCVs(offerId);
      setCandidates(
        response.map((item, index) => ({
          id: item.cv.id,
          name: `Candidat ${index + 1}`,
          email: `candidat${index + 1}@example.com`,
          cvId: item.cv.id,
          selected: false,
        }))
      );
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Erreur lors du chargement des candidats');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectCandidate = (candidateId: number) => {
    setCandidates(candidates.map(candidate =>
      candidate.id === candidateId
        ? { ...candidate, selected: !candidate.selected }
        : candidate
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = candidates.every(candidate => candidate.selected);
    setCandidates(candidates.map(candidate => ({
      ...candidate,
      selected: !allSelected
    })));
  };

  const handleSendEmails = async () => {
    const selectedCandidates = candidates.filter(candidate => candidate.selected);
    
    if (selectedCandidates.length === 0) {
      toast.error('Veuillez sélectionner au moins un candidat');
      return;
    }

    if (!emailContent.subject.trim()) {
      toast.error('Veuillez saisir un objet pour l\'email');
      return;
    }

    if (!emailContent.body.trim()) {
      toast.error('Veuillez saisir le contenu de l\'email');
      return;
    }

    try {
      setSending(true);
      
      // Simuler l'envoi d'emails
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Email envoyé à ${selectedCandidates.length} candidat(s) avec succès`);
      
      // Réinitialiser le formulaire
      setEmailContent({
        subject: '',
        body: '',
        template: 'default',
      });
      
      // Désélectionner tous les candidats
      setCandidates(candidates.map(candidate => ({
        ...candidate,
        selected: false
      })));
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Erreur lors de l\'envoi des emails');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: string) => {
    switch (template) {
      case 'interview':
        setEmailContent({
          ...emailContent,
          subject: 'Entretien pour le poste de ' + 
            (jobOffers.find(o => o.id.toString() === selectedOfferId)?.title || ''),
          body: `Bonjour [Prénom du candidat],

Nous avons le plaisir de vous informer que votre candidature pour le poste de ${jobOffers.find(o => o.id.toString() === selectedOfferId)?.title || ''} a retenu toute notre attention.

Nous souhaiterions vous rencontrer pour un entretien qui se déroulera à nos locaux.

Merci de nous indiquer vos disponibilités pour la semaine prochaine.

Cordialement,
L'équipe RH`
        });
        break;
      case 'rejection':
        setEmailContent({
          ...emailContent,
          subject: 'Réponse à votre candidature',
          body: `Bonjour [Prénom du candidat],

Nous vous remercions pour l'intérêt que vous avez porté à notre entreprise et pour le temps que vous avez consacré à votre candidature pour le poste de ${jobOffers.find(o => o.id.toString() === selectedOfferId)?.title || ''}.

Après une étude approfondie de votre dossier, nous sommes au regret de vous informer que nous ne pouvons pas donner suite à votre candidature.

Nous vous remercions de la confiance que vous nous avez accordée et vous souhaitons plein succès dans vos recherches.

Cordialement,
L'équipe RH`
        });
        break;
      default:
        setEmailContent({
          ...emailContent,
          subject: '',
          body: ''
        });
    }
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
                <h2 className="text-xl font-semibold text-gray-900">Envoyer des emails</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Contactez les candidats par email
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Sélection des candidats</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="jobOffer" className="block text-sm font-medium text-gray-700 mb-1">
                      Offre d'emploi
                    </label>
                    <select
                      id="jobOffer"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={selectedOfferId}
                      onChange={(e) => setSelectedOfferId(e.target.value)}
                    >
                      {jobOffers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Candidats</span>
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:text-blue-800"
                        onClick={toggleSelectAll}
                      >
                        {candidates.every(c => c.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {candidates.length > 0 ? (
                        candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className={`flex items-center p-2 rounded-md border ${
                              candidate.selected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={candidate.selected}
                              onChange={() => toggleSelectCandidate(candidate.id)}
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{candidate.name}</p>
                              <p className="text-xs text-gray-500">{candidate.email}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Aucun candidat trouvé pour cette offre
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Modèles d'emails</h3>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-100"
                      onClick={() => applyTemplate('interview')}
                    >
                      <p className="text-sm font-medium text-gray-900">Convocation à un entretien</p>
                      <p className="text-xs text-gray-500 mt-1">Inviter le candidat à un entretien</p>
                    </button>
                    
                    <button
                      type="button"
                      className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-100"
                      onClick={() => applyTemplate('rejection')}
                    >
                      <p className="text-sm font-medium text-gray-900">Lettre de refus</p>
                      <p className="text-xs text-gray-500 mt-1">Informer le candidat du rejet</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <input
                      type="text"
                      className="w-full p-2 border-0 text-base font-medium text-gray-900 focus:ring-0 focus:outline-none"
                      placeholder="Objet"
                      value={emailContent.subject}
                      onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                    />
                  </div>
                  
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Gras"
                      >
                        <span className="font-bold">B</span>
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Italique"
                      >
                        <em>I</em>
                      </button>
                      <div className="border-l border-gray-300 h-6 my-1"></div>
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Ajouter une pièce jointe"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <textarea
                      className="w-full p-2 border-0 text-gray-700 focus:ring-0 focus:outline-none resize-none"
                      rows={12}
                      placeholder="Écrivez votre message ici..."
                      value={emailContent.body}
                      onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
                    ></textarea>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {candidates.filter(c => c.selected).length} destinataire(s) sélectionné(s)
                    </div>
                    <button
                      type="button"
                      onClick={handleSendEmails}
                      disabled={sending || candidates.filter(c => c.selected).length === 0}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        sending || candidates.filter(c => c.selected).length === 0
                          ? 'bg-blue-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      {sending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <UserIcon className="h-4 w-4 mr-2" />
                          Envoyer
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Les variables comme [Prénom du candidat] seront automatiquement remplacées par les informations de chaque destinataire.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendEmails;