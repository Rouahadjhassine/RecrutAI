// src/types/index.ts
export type UserRole = 'candidat' | 'recruteur';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
}

export interface CV {
  id: number;
  user_id: number;
  file_path: string;
  file_name: string;
  file_url: string;
  upload_date: string;
  uploaded_at: string;
  candidate_id: number;
  candidate_name: string;
  score?: number;
  status?: 'pending' | 'analyzed' | 'selected' | 'rejected';
  analysis?: AnalysisResult;
}

export interface JobOffer {
  id: number;
  title: string;
  description: string;
  requirements: string[];
  created_at: string;
  recruiter_id: number;
  deadline: string;
  location: string;
  status?: 'draft' | 'published' | 'closed';
  salary_range?: string;
  experience_level?: string;
  job_type?: string;
  industry?: string;
  skills?: string[];
  applicants_count?: number;
}

export interface AnalysisResult {
  id: number;
  cv_id: number;
  job_offer_id?: number;
  job_title?: string;
  candidate_name?: string;
  compatibility_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  created_at: string;
  updated_at?: string;
  summary?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  cv?: {
    id: number;
    file_name: string;
    file_path: string;
    uploaded_at: string;
  };
  job_offer?: {
    id: number;
    title: string;
    description: string;
    requirements: string[];
  };
}

export interface EmailTemplate {
  id: number;
  subject: string;
  content: string;
  created_at: string;
  recruiter_id: number;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Types pour les formulaires
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

// Pour les props des composants
export interface ProtectedRouteProps {
  role?: UserRole;
  children: React.ReactNode;
}

export interface AuthFormProps {
  isLogin?: boolean;
  onSuccess?: () => void;
}