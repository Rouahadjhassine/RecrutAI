import api from './api';
import { CV, AnalysisResult, RankedCV, CVAnalysisResult } from '../types';

export const cvService = {
  async uploadCV(file: File): Promise<CV> {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Envoi du fichier:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    try {
      const res = await api.post('/cvs/candidat/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        transformRequest: (data, headers) => {
          // Ne pas transformer les données pour FormData
          if (data instanceof FormData) {
            return data;
          }
          return data;
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          console.log(`Progression de l'upload: ${progress}%`);
        }
      });
      
      console.log('Réponse du serveur:', res.data);
      return res.data.cv;
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
      console.error('Erreur lors de l\'upload:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: errorMessage
      });
      throw new Error(`Échec de l'upload du CV: ${errorMessage}`);
    }
  },

  async getMyCVs(): Promise<{cvs: CV[], max_cvs: number}> {
    const res = await api.get('/cvs/candidat/cvs/');
    return res.data;
  },

  async deleteCV(analysisId: number): Promise<void> {
    // Utilisation du bon endpoint pour supprimer une analyse
    // On utilise une URL relative sans slash initial pour éviter le double slash
    await api.delete(`cvs/analyses/${analysisId}/`);
  },

  async getAllCVs(): Promise<CV[]> {
    const res = await api.get('/cvs/recruteur/cvs/');
    return res.data;
  },

  async analyze(jobText: string, cvId?: number): Promise<AnalysisResult> {
    const payload: any = { job_offer_text: jobText };
    if (cvId) payload.cv_id = cvId;
    const res = await api.post('/cvs/analyze/', payload);
    return res.data;
  },

  async rank(jobText: string, cvIds?: number[]): Promise<RankedCV[]> {
    const payload: { job_offer_text: string, cv_ids?: number[] } = { 
      job_offer_text: jobText 
    };
    
    if (cvIds && cvIds.length > 0) {
      payload.cv_ids = cvIds;
    }
    
    const res = await api.post('/cvs/recruteur/rank/', payload);
    return res.data.rankings || [];
  },

  async uploadCVsAsRecruiter(files: File[]): Promise<{id: number}[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/cvs/recruteur/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.uploaded_cvs || [];
    } catch (error: any) {
      console.error('Erreur lors de l\'upload des CVs:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Échec de l'upload des CVs: ${error.response?.data?.error || error.message}`);
    }
  },

  async rankCVs(files: File[], jobDescription: string): Promise<RankedCV[]> {
    try {
      // Télécharger les CVs avec l'endpoint recruteur
      const uploadedCVs = await this.uploadCVsAsRecruiter(files);
      
      if (uploadedCVs.length === 0) {
        throw new Error('Aucun CV n\'a pu être uploadé');
      }
      
      // Ensuite, envoyer la requête de classement avec les IDs des CVs
      console.log('Envoi de la demande de classement...', {
        cv_ids: uploadedCVs.map(cv => cv.id),
        job_offer_text: jobDescription.substring(0, 50) + '...' // Log partiel pour éviter la pollution
      });
      
      const response = await api.post('/cvs/recruteur/rank/', {
        cv_ids: uploadedCVs.map(cv => cv.id),
        job_offer_text: jobDescription
      });
      
      return response.data.rankings || [];
    } catch (error: any) {
      console.error('Erreur lors du classement des CVs:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  async sendEmail(candidateId: number, subject: string, message: string) {
    await api.post('/cvs/send-email/', {
      candidate_id: candidateId,
      subject,
      message
    });
  },
  
  async analyzeWithJobDescription(cvId: number, jobData: { job_description: string }): Promise<CVAnalysisResult> {
    const response = await api.post(`/cvs/candidat/analyze-job/${cvId}/`, jobData);
    return response.data;
  },

  async getHistory(): Promise<Array<{
    id: number;
    cv_file_name: string;
    created_at: string;
    match_score: number;
    summary: string;
    user: number;
    [key: string]: any;
  }>> {
    try {
      console.log('Début de la récupération de l\'historique...');
      
      // Le préfixe /api/v1/ est déjà ajouté par la configuration de base de l'API
      const url = '/cvs/history/';
      console.log('Appel API vers:', url);
      
      const response = await api.get(url);
      
      // Validation des données reçues
      if (!Array.isArray(response.data)) {
        console.warn('La réponse de l\'API n\'est pas un tableau:', response.data);
        return [];
      }
      
      // Nettoyage et validation des données
      const validData = response.data
        .filter(item => item && typeof item === 'object' && 'id' in item) // Filtre les entrées invalides
        .map(item => ({
          ...item,
          // Assure que les champs obligatoires ont des valeurs par défaut
          id: Number(item.id) || 0,
          cv_file_name: item.cv_file_name || 'Sans nom',
          created_at: item.created_at || new Date().toISOString(),
          match_score: typeof item.match_score === 'number' ? Math.max(0, Math.min(100, item.match_score)) : 0,
          summary: item.summary || '',
          user: Number(item.user) || 0
        }))
        .filter(item => item.id > 0); // Supprime les entrées avec ID invalide
      
      // Détection des doublons
      const uniqueIds = new Set();
      const duplicates = validData.filter(item => {
        if (uniqueIds.has(item.id)) return true;
        uniqueIds.add(item.id);
        return false;
      });
      
      if (duplicates.length > 0) {
        console.warn(`Attention: ${duplicates.length} doublons détectés dans les données d'historique`, duplicates);
      }
      
      // Suppression des doublons en gardant la version la plus récente
      const uniqueData = Object.values(
        validData.reduce((acc, item) => {
          const existing = acc[item.id];
          if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
            acc[item.id] = item;
          }
          return acc;
        }, {} as Record<number, typeof validData[0]>)
      ) as Array<typeof validData[0]>;
      
      // Tri par date décroissante
      uniqueData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log(`Données traitées: ${uniqueData.length} analyses uniques (${duplicates.length} doublons supprimés)`);
      
      return uniqueData;
      
    } catch (error: any) {
      const errorDetails = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      };
      
      console.error('Erreur lors de la récupération de l\'historique:', errorDetails);
      
      // Message d'erreur plus détaillé
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         'Impossible de récupérer l\'historique des analyses. Veuillez réessayer plus tard.';
      
      throw new Error(`Erreur: ${errorMessage} (${error.response?.status || 'Pas de réponse'})`);
    }
  }
};