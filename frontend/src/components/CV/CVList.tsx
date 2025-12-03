import React, { useState, useEffect } from 'react';
import { CV } from '../../types';
import { cvService } from '../../services/cvService';

interface CVListProps {
  onSelectCV?: (cv: CV) => void;
  onDeleteCV?: () => void;
  selectedCVId?: number | null;
}

export const CVList: React.FC<CVListProps> = ({ onSelectCV, onDeleteCV, selectedCVId }) => {
  const [cvs, setCVs] = useState<{cvs: CV[], max_cvs: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      const data = await cvService.getMyCVs();
      setCVs(data);
      setError(null);
    } catch (err: any) {
      console.error('Erreur lors du chargement des CVs:', err);
      setError('Impossible de charger la liste des CVs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVs();
  }, []);

  const handleDelete = async (cvId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce CV ?')) {
      try {
        await cvService.deleteCV(cvId);
        await fetchCVs();
        onDeleteCV?.();
      } catch (err) {
        console.error('Erreur lors de la suppression du CV:', err);
        setError('Erreur lors de la suppression du CV');
      }
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Chargement des CVs...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Mes CVs</h3>
        <span className="text-sm text-gray-500">
          {cvs?.cvs.length || 0} / {cvs?.max_cvs || 5} CVs
        </span>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {cvs?.cvs.length ? (
          cvs.cvs.map((cv) => (
            <div 
              key={cv.id}
              onClick={() => onSelectCV?.(cv)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedCVId === cv.id 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{cv.file_name || 'CV sans nom'}</p>
                  <p className="text-sm text-gray-500">
                    Ajouté le {new Date(cv.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(cv.id, e)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Supprimer ce CV"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">Aucun CV téléversé</p>
        )}
      </div>
    </div>
  );
};

export default CVList;
