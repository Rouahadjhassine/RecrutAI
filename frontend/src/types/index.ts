
export interface User {
  id: number;
  email: string;
  role: 'candidat' | 'recruteur';
  first_name: string;
  last_name: string;
  is_verified: boolean;
  created_at: string;
}

export interface CV {
  id: number;
  candidat: number;
  file: string;
  extracted_text: string;
  parsed_data: Record<string, any>;
  uploaded_at: string;
}

export interface JobOffer {
  id: number;
  recruteur: number;
  title: string;
  description: string;
  requirements: string[];
  created_at: string;
}

export interface AnalysisResult {
  id: number;
  cv: number;
  job_offer: number;
  compatibility_score: number;
  matched_keywords: string[];
  analysis_details: Record<string, any>;
  created_at: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}