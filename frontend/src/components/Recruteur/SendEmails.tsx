import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { analysisService } from '../../services/analysisService';

interface SendEmailsProps {
  selectedCandidates: number[];
}

export const SendEmails: React.FC<SendEmailsProps> = ({ selectedCandidates }) => {
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await analysisService.sendEmailsToCandidates(selectedCandidates, {
        subject: emailSubject,
        body: emailBody,
      });
      setMessage('✅ Emails envoyés avec succès!');
      setEmailSubject('');
      setEmailBody('');
    } catch (err) {
      setMessage('❌ Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Envoyer un email aux candidats</h2>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">📧 À envoyer à {selectedCandidates.length} candidat(s)</span>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Sujet</label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Opportunité d'emploi - React Developer"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Bonjour,\n\nNous avons identifié votre profil comme particulièrement adapté..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {message && <p className="mb-4 text-sm text-center font-semibold">{message}</p>}

        <div className="flex gap-3">
          <button className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition">
            Annuler
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sending || !emailSubject || !emailBody}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Mail className="w-5 h-5" />
            {sending ? 'Envoi...' : 'Envoyer les emails'}
          </button>
        </div>
      </div>
    </div>
  );
};
