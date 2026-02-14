import { db } from '@/lib/firebase';
import { 
  collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, runTransaction 
} from 'firebase/firestore';
import { DailyReport, Evaluation, Match } from '@/types';

class InternshipService {
  
  // --- Daily Reports ---

  async createReport(studentId: string, matchId: string, content: string, learning: string, nextGoals: string, date: Date): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'dailyReports'), {
        matchId,
        studentId,
        date: Timestamp.fromDate(date),
        content,
        learning,
        nextGoals,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("createReport error:", error);
      throw error;
    }
  }

  async getReports(matchId: string) {
    try {
      try {
        const q = query(
          collection(db, 'dailyReports'),
          where('matchId', '==', matchId),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport));
      } catch (e: any) {
        // Fallback for missing index
        if (e.code === 'failed-precondition' || e.message?.includes('index')) {
           console.warn('Index missing for getReports, falling back to client-side sort');
           const q = query(
             collection(db, 'dailyReports'),
             where('matchId', '==', matchId)
           );
           const snapshot = await getDocs(q);
           const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport));
           // Sort descending
           return (reports as any[]).sort((a, b) => {
              const dateA = a.date?.toMillis ? a.date.toMillis() : (a.date instanceof Date ? a.date.getTime() : 0);
              const dateB = b.date?.toMillis ? b.date.toMillis() : (b.date instanceof Date ? b.date.getTime() : 0);
              return dateB - dateA;
           });
        }
        throw e;
      }
    } catch (error) {
       console.error("getReports error:", error);
       throw error;
    }
  }

  async addCompanyComment(reportId: string, comment: string) {
    try {
      const reportRef = doc(db, 'dailyReports', reportId);
      await updateDoc(reportRef, {
        companyComment: comment,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
       console.error("addCompanyComment error:", error);
       throw error;
    }
  }

  // --- Match Management ---

  async getMatch(matchId: string): Promise<Match | null> {
    try {
      const docSnap = await getDoc(doc(db, 'matches', matchId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Match;
      }
      return null;
    } catch (error) {
      console.error("getMatch error:", error);
      throw error;
    }
  }

  async completeInternship(matchId: string) {
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        status: 'completed',
        endDate: serverTimestamp(),
      });
    } catch (error) {
      console.error("completeInternship error:", error);
      throw error;
    }
  }

  // --- Evaluation ---
  
  async submitEvaluation(matchId: string, fromId: string, toId: string, score: number, comment: string) {
    try {
      await addDoc(collection(db, 'evaluations'), {
        matchId,
        fromId,
        toId,
        score,
        comment,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("submitEvaluation error:", error);
      throw error;
    }
  }

  async getEvaluation(matchId: string, fromId: string): Promise<Evaluation | null> {
    try {
      const q = query(
        collection(db, 'evaluations'),
        where('matchId', '==', matchId),
        where('fromId', '==', fromId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Evaluation;
      }
      return null;
    } catch (error) {
      console.error("getEvaluation error:", error);
      throw error;
    }
  }
}

export const internshipService = new InternshipService();
