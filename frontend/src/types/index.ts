// src/types/index.ts
export type UserRole = 'candidat' | 'recruteur';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  bio?: string;
}

// === CV ===
export interface CV {
  id: number;
  file_name: string;
  uploaded_at: string;
  parsed_data: {
    skills: string[];
    experience_years: number;
  };
  candidat_name: string;
  candidat_email: string;
  candidat_id: number;
}

// === Résultat d'analyse ===
export interface AnalysisResult {
  id: number;
  cv: number;
  job_offer_text: string;
  compatibility_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary: string;
  created_at: string;

  // Résolu côté frontend
  cv_file_name?: string;
  candidat_name?: string;
}

// === Analyse complète du CV ===
export interface CVAnalysisResult {
  cv_id: number;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  summary: string;
  advice: string;
  created_at: string;
  cv_file_name?: string;
  candidat_name?: string;
}

// === Classement ===
export interface RankedCV {
  cv_id: number;
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  candidat_name: string;
  candidat_email: string;
  candidat_id: number;
}

// === Réponses API ===
export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface CVUploadResponse {
  message: string;
  cv: CV;
}

export interface AnalysisResponse {
  // Retour de analyze_cv_vs_text
  compatibility_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary: string;
  cv_id: number;
  candidat_name: string;
}

export interface RankingResponse {
  rankings: RankedCV[];
}

// === Formulaires ===
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

export interface EmailData {
  candidate_id: number;
  subject: string;
  message: string;
}

export interface JobTextData {
  job_offer_text: string;
}