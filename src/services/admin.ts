import { db } from '@/lib/firebase';
import { 
  collection, doc, getDocs, getDoc, updateDoc, query, where, orderBy, getCountFromServer, serverTimestamp 
} from 'firebase/firestore';
import { JobPosting, Application, User, Company } from '@/types';
import { notificationService } from './notification';

class AdminService {
  
  // --- Stats ---
  async getStats() {
    try {
      const usersColl = collection(db, 'users');
      const companiesColl = collection(db, 'companies');
      const jobsColl = collection(db, 'jobPostings');
      const appsColl = collection(db, 'applications');
      const matchesColl = collection(db, 'matches');

      const usersSnap = await getCountFromServer(query(usersColl, where('role', '==', 'student')));
      const companiesSnap = await getCountFromServer(companiesColl);
      
      const jobsPendingSnap = await getCountFromServer(query(jobsColl, where('status', '==', 'pending_approval')));
      const jobsActiveSnap = await getCountFromServer(query(jobsColl, where('status', '==', 'published')));
      
      const appsPendingSnap = await getCountFromServer(query(appsColl, where('status', '==', 'pending_admin')));
      const matchesSnap = await getCountFromServer(matchesColl);

      // Count pending companies
      const companiesPendingSnap = await getCountFromServer(query(companiesColl, where('isApproved', '==', false)));

      return {
        totalUsers: usersSnap.data().count,
        totalCompanies: companiesSnap.data().count,
        pendingCompanies: companiesPendingSnap.data().count,
        pendingJobs: jobsPendingSnap.data().count,
        activeJobs: jobsActiveSnap.data().count,
        pendingApplications: appsPendingSnap.data().count,
        totalMatches: matchesSnap.data().count,
      };
    } catch (error) {
      console.error("AdminService.getStats error:", error);
      throw error;
    }
  }

  // --- Jobs ---
  async getPendingJobs(): Promise<JobPosting[]> {
    try {
      // Try with ordering first (requires composite index)
      const q = query(
        collection(db, 'jobPostings'), 
        where('status', '==', 'pending_approval'), 
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting));
    } catch (error: any) {
      // If index is missing, fall back to unordered query
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Composite index missing for getPendingJobs, falling back to unordered query. Create the index in Firebase Console.');
        const q = query(
          collection(db, 'jobPostings'), 
          where('status', '==', 'pending_approval')
        );
        const snap = await getDocs(q);
        const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting));
        // Sort client-side
        return jobs.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return aTime - bTime;
        });
      }
      throw error;
    }
  }

  async getAllJobs(): Promise<JobPosting[]> {
    const q = query(collection(db, 'jobPostings'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting));
  }



  async approveJob(jobId: string) {
    const jobRef = doc(db, 'jobPostings', jobId);
    
    // Get job to find companyId
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) return;
    const jobData = jobSnap.data();

    await updateDoc(jobRef, {
      status: 'published',
      updatedAt: serverTimestamp()
    });
    
    // Notify company
    if (jobData?.companyId) {
      await notificationService.createNotification(
        jobData.companyId,
        '求人が承認されました',
        `求人「${jobData.title}」が公開されました。`,
        'job_approved_admin',
        `/company/jobs/${jobId}`
      );
    }
  }

  async rejectJob(jobId: string) {
    const jobRef = doc(db, 'jobPostings', jobId);
    
    // Get job to find companyId
    const jobSnap = await getDoc(jobRef);
    const jobData = jobSnap.exists() ? jobSnap.data() : null;

    await updateDoc(jobRef, {
      status: 'draft',
      updatedAt: serverTimestamp()
    });
    
    // Notify company
    if (jobData?.companyId) {
      await notificationService.createNotification(
        jobData.companyId,
        '求人が差し戻されました',
        `求人「${jobData.title}」の内容を確認してください。`,
        'system',
        `/company/jobs/${jobId}`
      );
    }
  }

  // --- Companies ---
  async getAllCompanies(): Promise<Company[]> {
    const snap = await getDocs(collection(db, 'companies'));
    return snap.docs.map(d => ({ userId: d.id, ...d.data() } as Company));
  }

  async approveCompany(userId: string) {
    await updateDoc(doc(db, 'companies', userId), {
      isApproved: true,
      updatedAt: serverTimestamp()
    });
    
    // Notify company
    await notificationService.createNotification(
      userId,
      '企業アカウントが承認されました',
      'アカウント審査が完了しました。求人の作成が可能です。',
      'system',
      '/company/dashboard'
    );
  }

  async revokeCompany(userId: string) {
    await updateDoc(doc(db, 'companies', userId), {
      isApproved: false,
      updatedAt: serverTimestamp()
    });
  }

  // --- Applications ---
  async getPendingApplications(): Promise<Application[]> {
    try {
      const q = query(
        collection(db, 'applications'), 
        where('status', '==', 'pending_admin'), 
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
    } catch (error: any) {
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Composite index missing for getPendingApplications, falling back.');
        const q = query(
          collection(db, 'applications'), 
          where('status', '==', 'pending_admin')
        );
        const snap = await getDocs(q);
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
        return apps.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return aTime - bTime;
        });
      }
      throw error;
    }
  }
  
  // Helper to fetch details for apps
  async getApplicationDetails(app: Application) {
    const jobSnap = await getDoc(doc(db, 'jobPostings', app.jobId));
    const studentSnap = await getDoc(doc(db, 'students', app.studentId));
    const companySnap = await getDoc(doc(db, 'companies', app.companyId));
    
    return {
       job: jobSnap.exists() ? (jobSnap.data() as JobPosting) : null,
       student: studentSnap.exists() ? (studentSnap.data() as any) : null,
       company: companySnap.exists() ? (companySnap.data() as Company) : null,
    };
  }

  async approveApplication(appId: string) {
    // Status update only - notification logic handled in UI or matching service
  }
  // --- Matches ---
  async getAllMatches() {
    try {
      const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const matches = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Resolve references
      const resolvedMatches = await Promise.all(matches.map(async (match) => {
        const studentSnap = await getDoc(doc(db, 'students', match.studentId));
        const companySnap = await getDoc(doc(db, 'companies', match.companyId));
        const jobSnap = await getDoc(doc(db, 'jobPostings', match.jobId));
        
        return {
          ...match,
          studentName: studentSnap.exists() ? studentSnap.data().name : '退会済みユーザー',
          companyName: companySnap.exists() ? companySnap.data().name : '不明な企業',
          jobTitle: jobSnap.exists() ? jobSnap.data().title : '削除された求人',
        };
      }));

      return resolvedMatches;
    } catch (error) {
      console.error("getAllMatches error:", error);
      throw error;
    }
  }
  async getMatchEvaluations(matchId: string) {
    try {
      const q = query(collection(db, 'evaluations'), where('matchId', '==', matchId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    } catch (e) {
      console.error(e);
      return [];
    }
  }
}

export const adminService = new AdminService();
