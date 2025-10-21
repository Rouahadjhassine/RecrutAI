import { apiClient } from './api';
import { AnalysisResult, CV, JobOffer } from '../types';

export const analysisService = {
  async uploadCV(file: File): Promise<CV> {
    return apiClient.uploadFile('/api/cvs/upload/', file);
  },

  async analyzeCVWithJob(cvId: number, jobOfferId: number): Promise<AnalysisResult> {
    return apiClient.post('/api/nlp/analyze/', { cv_id: cvId, job_offer_id: jobOfferId });
  },

  async rankCVsForJob(jobOfferId: number): Promise<AnalysisResult[]> {
    return apiClient.post('/api/nlp/rank-cvs/', { job_offer_id: jobOfferId });
  },

  async summarizeCV(cvId: number): Promise<string> {
    const response = await apiClient.get<{ summary: string }>(`/api/nlp/summarize-cv/${cvId}/`);
    return response.summary;
  },

  async getCVList(): Promise<CV[]> {
    return apiClient.get('/api/cvs/list/');
  },

  async getJobOfferList(): Promise<JobOffer[]> {
    return apiClient.get('/api/cvs/job-offers/');
  },

  async createJobOffer(data: { title: string; description: string; requirements: string[] }): Promise<JobOffer> {
    return apiClient.post('/api/cvs/job-offers/', data);
  },

  async sendEmailsToCandidates(candidateIds: number[], emailData: { subject: string; body: string }): Promise<void> {
    return apiClient.post('/api/notifications/send-emails/', { candidate_ids: candidateIds, ...emailData });
  },
};

