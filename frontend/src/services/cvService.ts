import api from './api';
import { CV, AnalysisResult, RankedCV } from '../types';

export const cvService = {
  async uploadCV(file: File): Promise<CV> {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/api/cvs/upload/', form);
    return res.data.cv;
  },

  async getMyCVs(): Promise<CV[]> {
    const res = await api.get('/api/cvs/my-cvs/');
    return res.data;
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

  async sendEmail(candidateId: number, subject: string, message: string) {
    await api.post('/api/cvs/send-email/', {
      candidate_id: candidateId,
      subject,
      message
    });
  },

  async getHistory(): Promise<AnalysisResult[]> {
    const res = await api.get('/api/cvs/history/');
    return res.data;
  }
};