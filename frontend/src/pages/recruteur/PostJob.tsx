import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobOfferService } from '../../services/jobOfferService';
import { toast } from 'react-toastify';

import { User } from '../../types';

interface PostJobProps {
  user: User;
  onLogout: () => void;
}

const PostJob: React.FC<PostJobProps> = ({ user, onLogout }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: 'Non spécifié',
    salary: 'Non spécifié',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours par défaut
    status: 'published',
    experience_level: 'Non spécifié',
    job_type: 'Temps plein',
    industry: 'Non spécifié'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Convertir la chaîne d'exigences en tableau
      const requirementsArray = formData.requirements
        .split(',')
        .map(req => req.trim())
        .filter(req => req.length > 0);
      
      await jobOfferService.createJobOffer({
        title: formData.title,
        description: formData.description,
        requirements: requirementsArray,
        location: formData.location,
        deadline: formData.deadline,
        status: 'published' as const,
        salary_range: formData.salary,
        experience_level: formData.experience_level,
        job_type: formData.job_type,
        industry: formData.industry,
        skills: []
      });
      
      toast.success('Offre publiée avec succès !');
      navigate('/recruteur');
    } catch (error) {
      console.error('Erreur lors de la publication de l\'offre :', error);
      toast.error('Une erreur est survenue lors de la publication de l\'offre');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Publier une nouvelle offre d'emploi</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Intitulé du poste *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description du poste *
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
            Compétences requises *
          </label>
          <textarea
            id="requirements"
            name="requirements"
            rows={3}
            value={formData.requirements}
            onChange={handleChange}
            required
            placeholder="Séparez les compétences par des virgules"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Localisation *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
              Salaire (optionnel)
            </label>
            <input
              type="text"
              id="salary"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              placeholder="Ex: 35K-45K€/an"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/recruteur')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Publication...' : 'Publier l\'offre'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostJob;
