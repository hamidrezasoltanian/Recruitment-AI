
export type StageId = string;

export interface KanbanStage {
  id: StageId;
  title: string;
  isCore?: boolean; // Core stages cannot be deleted
}

export interface HistoryEntry {
  user: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface TestLibraryItem {
  id: string;
  name: string;
  url: string;
}

export interface TestResult {
  testId: string; // From TestLibraryItem.id
  status: 'not_sent' | 'pending' | 'passed' | 'failed' | 'review';
  score?: number;
  notes?: string;
  sentDate?: string;
  deadlineHours?: number;
  file?: {           // Uploaded result file (optional)
    name: string;
    type: string;
  };
  aiSummary?: string; // New field for AI-generated summary
}


export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string; // New field for the job position
  stage: StageId;
  source: string;
  rating: number; // 0-5
  createdAt: string;
  interviewDate?: string; // Format: YYYY/MM/DD
  interviewTime?: string; // Format: HH:MM
  interviewTimeChanged?: boolean; // New field
  history: HistoryEntry[];
  comments: Comment[];
  hasResume?: boolean;
  testResults?: TestResult[]; // Comprehensive test results
}

export interface StageChangeInfo {
  candidate: Candidate;
  newStage: KanbanStage;
}

export interface User {
  username: string;
  name: string;
  isAdmin: boolean;
}

export interface UserWithPassword extends User {
    password?: string;
}

export type View = 'dashboard' | 'calendar' | 'archive' | 'tests';

export interface Template {
  id: string;
  name: string;
  content: string;
  type: 'email' | 'whatsapp';
  stageId?: StageId; // For stage change notifications
}

export interface JobPosition {
  id: string;
  title: string;
}

export interface CompanyProfile {
  name: string;
  website: string;
  address: string;
  jobPositions: JobPosition[];
}