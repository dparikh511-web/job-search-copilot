export interface Job {
  id: number;
  external_id: string;
  title: string;
  company: string;
  company_normalized: string;
  location: string;
  description: string;
  url: string;
  posted_date: string | null;
  scraped_at: string;
  stack_match_score: number | null;
  h1b_match: boolean;
  h1b_match_confidence: number | null;
  status: 'new' | 'matched' | 'generated' | 'digested' | 'applied' | 'rejected';
}

export interface ResumeSkillCategory {
  category: string;
  items: string[];
}

export interface ResumeSection {
  label: string | null;
  bullets: string[];
}

export interface ResumeExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  sections: ResumeSection[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  date: string;
  gpa?: string;
}

export interface ResumeProject {
  name: string;
  bullets: string[];
}

export interface StructuredResume {
  name: string;
  contact: string;
  summary: string;
  skills: ResumeSkillCategory[];
  experience: ResumeExperience[];
  projects?: ResumeProject[];
  education: ResumeEducation[];
}

export interface Application {
  id: number;
  job_id: number;
  profile_id: number;
  resume: StructuredResume;
  digest_date: string;
  generated_at: string;
}

export interface Profile {
  id: number;
  profile_label: string;
  name: string;
  email: string;
  skills: string[];
  target_stack: string[];
  target_locations: string[];
  master_resume_text: string;
}

export interface DigestRunSummary {
  scraped: number;
  alreadyProcessed: number;
  rejected: number;
  matched: number;
  failed: number;
}
