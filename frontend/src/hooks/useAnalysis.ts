import { useState } from 'react';
import { AnalysisResult } from '../types';
import { analysisService } from '../services/analysisService';

export function useAnalysis() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rankCVs = async (jobOfferId: number) => {
    setLoading(true);
    setError('');
    try {
      const rankResults = await analysisService.rankCVsForJob(jobOfferId);
      setResults(rankResults);
      return rankResults;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCV = async (cvId: number, jobOfferId: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await analysisService.analyzeCVWithJob(cvId, jobOfferId);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, rankCVs, analyzeCV };
}
