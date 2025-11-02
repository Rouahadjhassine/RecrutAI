// src/services/cvService.ts
import api from './api';
import { CV, AnalysisResult } from '../types';

export const cvService = {
  async uploadCV(file: File): Promise<CV> {
    const response = await api.uploadFile<CV>('/api/cvs/upload/', file);
    return response;
  },

  async getMyCVs(): Promise<CV[]> {
    const response = await api.get<CV[]>('/api/cvs/');
    return response.data;
  },

  async analyzeCV(cvId: number, jobOfferId?: number, jobDescription?: string): Promise<AnalysisResult> {
    const response = await api.post<AnalysisResult>('/api/analyze/cv/', {
      cv_id: cvId,
      job_offer_id: jobOfferId,
      job_description: jobDescription,
    });
    return response.data;
  },

  async getCV(id: number): Promise<CV> {
    const response = await api.get<CV>(`/api/cvs/${id}/`);
    return response.data;
  },

  async getCVsForJobOffer(jobOfferId: number): Promise<CV[]> {
    const response = await api.get<CV[]>(`/api/cvs/for-job/${jobOfferId}/`);
    return response.data;
  },

  async getCVsByCandidate(candidateId: number): Promise<CV[]> {
    const response = await api.get<CV[]>(`/api/candidates/${candidateId}/cvs/`);
    return response.data;
  },
};