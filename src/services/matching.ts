import { db } from '@/lib/firebase';
import { 
  collection, doc, runTransaction, serverTimestamp, 
  Timestamp, addDoc, updateDoc, getDoc, query, where, getDocs 
} from 'firebase/firestore';
import { Application, JobPosting, Match, NotificationType, Student, Company } from '@/types';
import { sendEmail } from '@/lib/sendEmail';

class MatchingService {
  
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        return userSnap.data().email;
      }
    } catch (e) {
      console.error('Error fetching user email:', e);
    }
    return null;
  }

  // --- Student Actions ---

  /**
   * Student applies to a job.
   * Creates an Application (pending_admin) and notifies Admin.
   */
  async applyJob(studentId: string, jobId: string, companyId: string, message: string = ''): Promise<string> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Validation: Verify no active applications
        const appsRef = collection(db, 'applications');
        const q = query(
            appsRef, 
            where('studentId', '==', studentId),
            where('status', 'in', ['pending_admin', 'pending_company', 'pending_student', 'matched'])
        );
        const activeApps = await getDocs(q); 
        
        if (!activeApps.empty) {
           throw new Error('Already have an active application');
        }

        // Create Application Document Ref
        const newAppRef = doc(collection(db, 'applications'));
        
        // Prepare Application Data
        const appData = {
          jobId,
          studentId,
          companyId,
          status: 'pending_admin',
          message,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Create Notification for Admin
        const notifRef = doc(collection(db, 'notifications'));
        const notifData = {
          userId: 'admin', // Placeholder for admin group
          type: 'job_applied' as NotificationType,
          title: '新規応募がありました',
          message: `求人ID: ${jobId} に新しい応募があります。`,
          link: `/admin/applications/${newAppRef.id}`,
          read: false,
          createdAt: serverTimestamp(),
        };

        transaction.set(newAppRef, appData);
        transaction.set(notifRef, notifData);

        return newAppRef.id;
      });

      // Send Email to Student
      const studentEmail = await this.getUserEmail(studentId);
      if (studentEmail) {
        await sendEmail(
          studentEmail,
          '【Internship Match】応募完了のお知らせ',
          `求人への応募が完了しました。\n\n管理者の確認をお待ちください。\n求人ID: ${jobId}`
        );
      }

      return result;
    } catch (error) {
      console.error("MatchingService.applyJob error:", error);
      throw error;
    }
  }

  /**
   * Student accepts a matching offer.
   * Updates Application (matched) -> Creates Match -> Notifies Company & Admin.
   */
  async acceptMatchByStudent(applicationId: string, studentId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await transaction.get(appRef);
      
      if (!appSnap.exists()) throw new Error('Application not found');
      const appData = appSnap.data() as Application;

      if (appData.studentId !== studentId) throw new Error('Unauthorized');
      if (appData.status !== 'pending_student') throw new Error('Invalid status');

      // Update Application
      transaction.update(appRef, {
        status: 'matched',
        updatedAt: serverTimestamp(),
      });

      // Create Match
      const matchRef = doc(collection(db, 'matches'));
      const matchData = {
        applicationId,
        jobId: appData.jobId,
        studentId: appData.studentId,
        companyId: appData.companyId,
        status: 'active',
        startDate: serverTimestamp(), // Placeholder start date
        createdAt: serverTimestamp(),
      };
      transaction.set(matchRef, matchData);
      
      // Update Application with Match ID for easier lookup
      transaction.update(appRef, { matchId: matchRef.id });

      // Notify Company
      const companyNotifRef = doc(collection(db, 'notifications'));
      transaction.set(companyNotifRef, {
        userId: appData.companyId,
        type: 'offer_accepted',
        title: 'マッチング成立！',
        message: '学生がオファーを承諾しました。インターンシップの準備を始めましょう。',
        link: `/company/intern/${matchRef.id}`,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    // Send Email to Company
    // Only get appData here after transaction if we need it, but we can't easily extract it from transaction block.
    // So we fetch it again or accept slight overhead.
    // For simplicity, we fetch just enough to simulate.
    try {
        const appSnap = await getDoc(doc(db, 'applications', applicationId));
        if (appSnap.exists()) {
            const data = appSnap.data() as Application;
            const companyEmail = await this.getUserEmail(data.companyId);
            if (companyEmail) {
                await sendEmail(
                    companyEmail,
                    '【Internship Match】マッチング成立のお知らせ',
                    `学生がオファーを承諾しました！\n\nマイページから詳細を確認してください。`
                );
            }
        }
    } catch (e) {
        console.error('Email send failed:', e);
    }
  }

  // --- Company Actions ---

  /**
   * Company offers a match (approves student).
   * Updates Application (pending_student) -> Notifies Student.
   */
  async approveByCompany(applicationId: string, companyId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await transaction.get(appRef);

      if (!appSnap.exists()) throw new Error('Application not found');
      const appData = appSnap.data() as Application;

      if (appData.companyId !== companyId) throw new Error('Unauthorized');
      if (appData.status !== 'pending_company') throw new Error('Invalid status (Must be pending_company)');

      // Update Application
      transaction.update(appRef, {
        status: 'pending_student',
        updatedAt: serverTimestamp(),
      });

      // Notify Student
      const studentNotifRef = doc(collection(db, 'notifications'));
      transaction.set(studentNotifRef, {
        userId: appData.studentId,
        type: 'offer_received',
        title: 'マッチングオファーが届きました！',
        message: '企業があなたの応募に関心を持っています。オファーを確認してください。',
        link: `/student/applications`,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    // Send Email to Student
    try {
        const appSnap = await getDoc(doc(db, 'applications', applicationId));
        if (appSnap.exists()) {
            const data = appSnap.data() as Application;
            const studentEmail = await this.getUserEmail(data.studentId);
            if (studentEmail) {
                await sendEmail(
                    studentEmail,
                    '【Internship Match】オファー受信のお知らせ',
                    `企業からオファーが届きました！\n\nマイページから確認・承諾を行ってください。`
                );
            }
        }
    } catch (e) {
        console.error('Email send failed:', e);
    }
  }

  /**
   * Company rejects an application.
   */
  async rejectByCompany(applicationId: string, companyId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await transaction.get(appRef);

      if (!appSnap.exists()) throw new Error('Application not found');
      const appData = appSnap.data() as Application;

      if (appData.companyId !== companyId) throw new Error('Unauthorized');

      // Update Application
      transaction.update(appRef, {
        status: 'rejected_by_company',
        updatedAt: serverTimestamp(),
      });

      // Notify Student
      const studentNotifRef = doc(collection(db, 'notifications'));
      transaction.set(studentNotifRef, {
        userId: appData.studentId,
        type: 'offer_rejected',
        title: '選考結果のお知らせ',
        message: '残念ながら今回の応募は見送られました。',
        link: `/student/applications`,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    // Send Email to Student
    try {
        const appSnap = await getDoc(doc(db, 'applications', applicationId));
        if (appSnap.exists()) {
            const data = appSnap.data() as Application;
            const studentEmail = await this.getUserEmail(data.studentId);
            if (studentEmail) {
                await sendEmail(
                    studentEmail,
                    '【Internship Match】選考結果のお知らせ',
                    `残念ながら、今回の応募は見送られました。\nまたの応募をお待ちしております。`
                );
            }
        }
    } catch (e) {
        console.error('Email send failed:', e);
    }
  }


  // --- Admin Actions (Placeholder / Utility) ---
  
  /**
   * Admin approves application to proceed to company.
   */
  async approveByAdmin(applicationId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await transaction.get(appRef);
      if (!appSnap.exists()) throw new Error('Application not found');
      const appData = appSnap.data() as Application;

      if (appData.status !== 'pending_admin') throw new Error('Invalid status');

      // Update Application
      transaction.update(appRef, {
        status: 'pending_company',
        updatedAt: serverTimestamp(),
      });

      // Notify Company
      const companyNotifRef = doc(collection(db, 'notifications'));
      transaction.set(companyNotifRef, {
        userId: appData.companyId,
        type: 'application_approved_admin',
        title: '新しい応募が届きました',
        message: '管理者承認済みの応募があります。内容を確認してください。',
        link: `/company/applicants`,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    // Send Email to Company
    try {
        const appSnap = await getDoc(doc(db, 'applications', applicationId));
        if (appSnap.exists()) {
            const data = appSnap.data() as Application;
            const companyEmail = await this.getUserEmail(data.companyId);
            if (companyEmail) {
                await sendEmail(
                    companyEmail,
                    '【Internship Match】新規応募のお知らせ',
                    `新しい応募が届きました（管理者承認済み）。\n\nマイページから応募者を確認してください。`
                );
            }
        }
    } catch (e) {
        console.error('Email send failed:', e);
    }
  }
}

export const matchingService = new MatchingService();
