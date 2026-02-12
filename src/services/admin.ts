import { db } from '@/lib/firebase';
import { 
  collection, doc, getDocs, getDoc, updateDoc, query, where, orderBy, getCountFromServer, serverTimestamp 
} from 'firebase/firestore';
import { JobPosting, Application, User, Company } from '@/types';

class AdminService {
  
  // --- Stats ---
  async getStats() {
    try {
      const usersColl = collection(db, 'users');
      const companiesColl = collection(db, 'companies');
      const jobsColl = collection(db, 'jobPostings');
      const appsColl = collection(db, 'applications');
      const matchesColl = collection(db, 'matches');

      // Note: aggregation queries are cost-effective
      const usersSnap = await getCountFromServer(usersColl);
      const companiesSnap = await getCountFromServer(companiesColl);
      
      const jobsPendingSnap = await getCountFromServer(query(jobsColl, where('status', '==', 'pending_approval')));
      const jobsActiveSnap = await getCountFromServer(query(jobsColl, where('status', '==', 'published')));
      
      const appsPendingSnap = await getCountFromServer(query(appsColl, where('status', '==', 'pending_admin')));
      const matchesSnap = await getCountFromServer(matchesColl);

      return {
        totalUsers: usersSnap.data().count,
        totalCompanies: companiesSnap.data().count,
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
    const q = query(collection(db, 'jobPostings'), where('status', '==', 'pending_approval'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting));
  }

  async approveJob(jobId: string) {
    await updateDoc(doc(db, 'jobPostings', jobId), {
      status: 'published',
      updatedAt: serverTimestamp()
    });
  }

  async rejectJob(jobId: string) {
    // Or 'draft' to let them edit? 'closed'? Let's use 'draft' so they can fix.
    await updateDoc(doc(db, 'jobPostings', jobId), {
      status: 'draft',
      updatedAt: serverTimestamp()
    });
  }

  // --- Applications ---
  async getPendingApplications(): Promise<Application[]> {
    const q = query(collection(db, 'applications'), where('status', '==', 'pending_admin'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
  }
  
  // Helper to fetch details for apps
  async getApplicationDetails(app: Application) {
    const jobSnap = await getDoc(doc(db, 'jobPostings', app.jobId));
    const studentSnap = await getDoc(doc(db, 'students', app.studentId));
    const companySnap = await getDoc(doc(db, 'companies', app.companyId));
    
    return {
       job: jobSnap.exists() ? (jobSnap.data() as JobPosting) : null,
       student: studentSnap.exists() ? (studentSnap.data() as any) : null, // typed as any for simplicitly accessing name
       company: companySnap.exists() ? (companySnap.data() as Company) : null,
    };
  }

  async approveApplication(appId: string) {
    // Uses MatchingService ideally to keep logic in one place, but for simple status update admin acts directly or calls matching service.
    // Let's call matchingService methods if available or update directly here for simplicity if matchingService is client-side only (which it is).
    // It's better to update DB directly here or import matchingService logic if strictly needed.
    // But `matchingService` has `approveByAdmin`. Let's use that in the UI component, or replicate logic here.
    // For AdminService, let's just do the DB update to avoid circular deps or complex imports if any.
    // Actually, `matchingService` has the notification logic. We SHOULD use it. 
    // BUT `matchingService` is in `src/services/matching.ts`. We can import it.
    // However, we are defining AdminService. Let's just expose basic DB ops and let UI decide, OR wrap it.
    // We will wrap matchingService in the UI for consistency.
  }


  // --- Users/Companies ---
  async getAllCompanies(): Promise<Company[]> {
    const snap = await getDocs(collection(db, 'companies'));
    return snap.docs.map(d => ({ ...d.data() } as Company));
  }
}

export const adminService = new AdminService();
