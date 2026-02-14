import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'company' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  userId: string;
  name: string;
  grade: string;
  bio: string;
  skills: string[];
  links: string[];
  avatarUrl?: string;
  university?: string;
}

export interface Company {
  userId: string;
  name: string;
  website: string;
  industry: string;
  address: string;
  description: string;
  avatarUrl?: string;
  isApproved: boolean; // Admin approval status
}

export type JobStatus = 'draft' | 'pending_approval' | 'published' | 'closed';

export interface JobPosting {
  id: string;
  companyId: string;
  companyName?: string; // Denormalized for display
  title: string;
  content: string;
  requirements: string[]; // List of skills or requirements
  salary?: string;
  location: string;
  status: JobStatus;
  pdfFileId?: string; // Google Drive File ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ApplicationStatus = 
  | 'pending_admin'     // Waiting for admin check
  | 'pending_company'   // Waiting for company approval
  | 'pending_student'   // Waiting for student acceptance (Match offer)
  | 'matched'           // Matched!
  | 'rejected_by_admin'
  | 'rejected_by_company'
  | 'declined_by_student'
  | 'cancelled';

export interface Application {
  id: string;
  jobId: string;
  studentId: string;
  companyId: string;
  status: ApplicationStatus;
  message: string;
  matchId?: string; // Set when matched
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Match {
  id: string;
  applicationId: string;
  jobId: string;
  studentId: string;
  companyId: string;
  status: 'active' | 'completed' | 'cancelled';
  startDate: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
}

export interface DailyReport {
  id: string;
  matchId: string;
  studentId: string;
  date: Timestamp;
  content: string; // What executed
  learning: string; // What learned
  nextGoals: string;
  companyComment?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Evaluation {
  id: string;
  matchId: string;
  fromId: string; // Evaluator (Student or Company)
  toId: string;   // Evaluated
  score: number;  // 1-5
  comment: string;
  createdAt: Timestamp;
}

export type NotificationType = 
  | 'job_applied' 
  | 'job_approved_admin'
  | 'application_approved_admin' 
  | 'offer_received'
  | 'offer_accepted' // Matched
  | 'offer_rejected'
  | 'system';

export interface Notification {
  id: string;
  userId: string; // Recipient
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}
