// components/CV/CVDetailsModal.tsx
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cv: any;
}

export default function CVDetailsModal({ isOpen, onClose, cv }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Détails du CV</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p><strong>Nom :</strong> {cv?.name || 'Inconnu'}</p>
          <p><strong>Email :</strong> {cv?.email || 'non trouvé'}</p>
          <p><strong>Score :</strong> {cv?.score}%</p>
          <p><strong>Fichier :</strong> {cv?.file_name}</p>
        </div>
      </div>
    </div>
  );
}