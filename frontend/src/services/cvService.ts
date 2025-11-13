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
      const res = await api.post('/api/cvs/candidat/upload/', formData, {
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
    const res = await api.get('/api/cvs/candidat/cvs/');
    return res.data;
  },

  async deleteCV(cvId: number): Promise<void> {
    await api.delete(`/api/cvs/candidat/cvs/${cvId}/`);
  },

  async getAllCVs(): Promise<CV[]> {
    const res = await api.get('/api/cvs/all-cvs/');
    return res.data;
  },

  async analyze(jobText: string, cvId?: number): Promise<AnalysisResult> {
    const payload: any = { job_offer_text: jobText };
    if (cvId) payload.cv_id = cvId;
    const res = await api.post('/api/cvs/analyze/', payload);
    return res.data;
  },

  async rank(jobText: string): Promise<RankedCV[]> {
    const res = await api.post('/api/cvs/rank/', { job_offer_text: jobText });
    return res.data.rankings;
  },

  async rankCVs(formData: FormData): Promise<RankedCV[]> {
    const { data } = await api.post('/cvs/recruteur/rank/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.rankings;
  },

  async sendEmail(candidateId: number, subject: string, message: string) {
    await api.post('/api/cvs/send-email/', {
      candidate_id: candidateId,
      subject,
      message
    });
  },
  
  async analyzeWithJobDescription(cvId: number, jobData: { job_description: string }): Promise<CVAnalysisResult> {
    const response = await api.post(`/api/cvs/candidat/analyze-job/${cvId}/`, jobData);
    return response.data;
  },

  async getHistory(): Promise<AnalysisResult[]> {
    const res = await api.get('/api/cvs/history/');
    return res.data;
  }
};