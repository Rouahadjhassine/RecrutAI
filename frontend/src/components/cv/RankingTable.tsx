import { Mail, Download } from 'lucide-react';
import { RankedCV } from '../../types';
import { cvService } from '../../services/cvService';

interface Props {
  rankings: RankedCV[];
}

export default function RankingTable({ rankings }: Props) {
  const exportCSV = () => {
    const csv = rankings.map(r => ({
      Rang: rankings.indexOf(r) + 1,
      Nom: r.candidat_name,
      Email: r.candidat_email,
      Score: r.score,
      Match: r.matched_keywords.join(', '),
      Manque: r.missing_keywords.join(', ')
    }));
    const data = [Object.keys(csv[0]), ...csv.map(Object.values)].map(e => e.join(',')).join('\n');
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classement.csv';
    a.click();
  };

  const sendEmail = async (cv: RankedCV) => {
    const subject = `Félicitations ! Score: ${cv.score}%`;
    const message = `Bonjour ${cv.candidat_name},\n\nVotre CV a obtenu ${cv.score}% de compatibilité.\n\nCordialement.`;
    await cvService.sendEmail(cv.candidat_id, subject, message);
    alert('Email envoyé');
  };

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
                <button onClick={() => sendEmail(r)} className="text-primary">
                  <Mail className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}