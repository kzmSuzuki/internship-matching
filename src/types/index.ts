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
  
  // 新規追加: 基本情報
  department?: string; // 部署・チーム名
  nearestStation?: string; // 最寄駅・バス停
  periodStart?: string; // 実施期間 (開始 YYYY/MM/DD)
  periodEnd?: string; // 実施期間 (終了 YYYY/MM/DD)
  estimatedDaysTime?: string; // 想定日数・時間
  minCapacity?: string; // 受入人数目安 (最小)
  maxCapacity?: string; // 受入人数目安 (最大)
  workFormat?: '対面' | 'ハイブリッド' | 'その他'; // 実施形態
  workFormatComment?: string; // 実施形態のその他コメント
  
  // 新規追加/変更: 求人内容
  occupation?: 'エンジニア' | 'デザイナー' | '事業企画' | '営業' | 'マーケティング' | 'その他'; // 職種
  occupationComment?: string; // 職種のその他コメント
  content: string; // 概要
  mentorSystem?: string; // 受入・指導メンター体制
  expectedOutput?: string; // 期待する成果・想定アウトプット
  
  // 新規追加/変更: 応募条件
  requirements: string[]; // 必須要件 (スキル等)
  tools?: string; // 使用ツール・技術
  niceToHave?: string; // 歓迎要件
  
  // 新規追加/変更: 待遇・条件
  isPaid?: boolean; // 報酬の有無(無償/有償)
  salary?: string; // 想定報酬 (有償の場合)
  hasTransportation?: boolean; // 交通費の有無
  hasAccommodation?: boolean; // 宿泊費の有無
  belongings?: string; // 持参物
  dressCode?: string; // 服装
  
  // 新規追加: その他
  otherNotes?: string; // その他伝えたい事項

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
  interviewDate?: string; // 企業が入力する面談日 (YYYY/MM/DD HH:mm など)
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
