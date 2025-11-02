// src/services/analysisService.ts
import api from './api';
import { AnalysisResult, CV, JobOffer } from '../types';

export const analysisService = {
  async uploadCV(file: File): Promise<CV> {
    return api.uploadFile<CV>('/api/cvs/upload/', file);
  },

  async analyzeCV(cvId: number, jobOfferId?: number, jobDescription?: string): Promise<AnalysisResult> {
    const response = await api.post('/api/analysis/analyze/', {
      cv_id: cvId,
      job_offer_id: jobOfferId,
      job_description: jobDescription
    });
    return response as unknown as AnalysisResult;
  },

  async analyzeCVWithJob(cvId: number, jobOfferId: number): Promise<AnalysisResult> {
    return this.analyzeCV(cvId, jobOfferId);
  },

  async rankCVsForJob(jobOfferId: number): Promise<AnalysisResult[]> {
    const response = await api.get(`/api/analysis/job/${jobOfferId}/rank/`);
    return response as unknown as AnalysisResult[];
  },

  async summarizeCV(cvId: number): Promise<string> {
    const response = await api.get(`/api/analysis/cv/${cvId}/summary/`);
    return (response as unknown as { summary: string }).summary;
  },

  async getCVList(): Promise<CV[]> {
    const response = await api.get('/api/cvs/');
    return response as unknown as CV[];
  },

  async getJobOfferList(): Promise<JobOffer[]> {
    const response = await api.get('/api/job-offers/');
    return response as unknown as JobOffer[];
  },

  async createJobOffer(data: { 
    title: string; 
    description: string; 
    requirements: string[];
    deadline?: string;
    location?: string;
  }): Promise<JobOffer> {
    const response = await api.post('/api/job-offers/', data);
    return response as unknown as JobOffer;
  },

  async sendEmailsToCandidates(
    candidateIds: number[], 
    emailData: { subject: string; body: string }
  ): Promise<void> {
    await api.post('/api/emails/send/', {
      candidate_ids: candidateIds,
      ...emailData
    });
  },
};