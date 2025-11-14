import { Mail, Download } from 'lucide-react';
import { RankedCV } from '../../types';

interface Props {
  rankings: RankedCV[];
}

export default function RankingTable({ rankings }: Props) {
  const exportCSV = () => {
    if (rankings.length === 0) return;
    
    const csv = rankings.map((r, index) => ({
      Rang: index + 1,
      Nom: r.candidat_name || 'Non spécifié',
      Email: r.candidat_email || '',
      Score: r.score || 0,
      Match: (r.matched_keywords || []).join(', '),
      Manque: (r.missing_keywords || []).join(', ')
    }));
    
    const headers = ['Rang', 'Nom', 'Email', 'Score', 'Match', 'Manque'];
    const data = [headers, ...csv.map(item => [
      item.Rang,
      `"${item.Nom}"`,
      item.Email,
      item.Score,
      `"${item.Match}"`,
      `"${item.Manque}"`
    ].join(','))].join('\n');
    
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classement.csv';
    a.click();
  };
  const handleEmailClick = (email: string, name: string, score: number) => {
  if (!email || email === 'Non extrait' || !email.includes('@')) {
    alert(`Aucun email valide trouvé pour ${name}`);
    return;
  }

  const subject = `Candidature - Score de compatibilité: ${score}%`;
  const body = `Bonjour ${name},\n\nVotre profil a obtenu un score de compatibilité de ${score}% avec notre offre.\n\nNous souhaiterions échanger avec vous concernant cette opportunité.\n\nCordialement,\nL'équipe Recrutement`;

  // URL Gmail avec pré-remplissage
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
};

  if (rankings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun classement disponible. Veuillez analyser des CV pour voir les résultats.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-bold">Classement des candidats</h3>
        <button onClick={exportCSV} className="flex items-center gap-2 text-primary">
          <Download className="w-5 h-5" /> CSV
        </button>
      </div>
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left">Rang</th>
            <th className="px-6 py-3 text-left">Candidat</th>
            <th className="px-6 py-3 text-left">Score</th>
            <th className="px-6 py-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r, i) => (
            <tr key={i} className={r.score > 70 ? 'bg-green-50' : ''}>
              <td className="px-6 py-4">#{i + 1}</td>
              <td className="px-6 py-4">
                <div>{r.candidat_name}</div>
                <div className="text-sm text-gray-500">{r.candidat_email}</div>
              </td>
              <td className="px-6 py-4">
                <span className={`font-bold ${r.score > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {r.score}%
                </span>
              </td>
              <td className="px-6 py-4">
                <button 
  onClick={() => handleEmailClick(r.candidat_email, r.candidat_name, r.score)}
  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
  title="Ouvrir dans Gmail"
>
  <Mail className="w-4 h-4" />
  Contacter
</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}