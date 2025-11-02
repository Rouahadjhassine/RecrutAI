// src/services/jobOfferService.ts
import api from './api';
import { JobOffer, AnalysisResult } from '../types';

export const jobOfferService = {
  async createJobOffer(data: Omit<JobOffer, 'id' | 'created_at' | 'recruiter_id'>): Promise<JobOffer> {
    const response = await api.post<JobOffer>('/api/job-offers/', data);
    return response.data;
  },

  async getMyJobOffers(): Promise<JobOffer[]> {
    const response = await api.get<JobOffer[]>('/api/job-offers/my/');
    return response.data;
  },

  async analyzeJobOffer(jobOfferId: number, cvId?: number): Promise<AnalysisResult> {
    const response = await api.post<AnalysisResult>(`/api/analyze/job-offer/${jobOfferId}/`, {
      cv_id: cvId,
    });
    return response.data;
  },

  async rankCVs(jobOfferId: number): Promise<Array<{
    cv: any;
    analysis: AnalysisResult;
  }>> {
    const response = await api.post<Array<{
      cv: any;
      analysis: AnalysisResult;
    }>>(`/api/job-offers/${jobOfferId}/rank/`);
    return response.data;
  },

  async getJobOffersByRecruiter(recruiterId: number): Promise<JobOffer[]> {
    const response = await api.get<JobOffer[]>(`/api/recruiters/${recruiterId}/job-offers/`);
    return response.data;
  },
};