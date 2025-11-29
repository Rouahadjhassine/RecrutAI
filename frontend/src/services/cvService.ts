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

  async deleteCV(cvId: number): Promise<void> {
    await api.delete(`/cvs/candidat/cvs/${cvId}/`);
  },

  async getAllCVs(): Promise<CV[]> {
    const res = await api.get('/cvs/all-cvs/');
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

  async getHistory(): Promise<any[]> {
    try {
      console.log('Récupération de l\'historique...');
      const response = await api.get('/cvs/history/');
      console.log('Réponse de l\'API (historique):', response.data);
      
      // Le backend filtre déjà par utilisateur, donc on peut retourner directement les données
      return Array.isArray(response.data) ? response.data : [];
      
    } catch (error: any) {
      console.error('Erreur lors de la récupération de l\'historique:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: error.config
      });
      throw new Error('Impossible de récupérer l\'historique des analyses. Veuillez réessayer plus tard.');
    }
  }
};