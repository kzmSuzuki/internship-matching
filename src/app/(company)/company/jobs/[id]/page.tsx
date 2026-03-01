"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting, Application, Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Loader2, MapPin, Calendar, ArrowLeft, FileText, ExternalLink, Briefcase, Users, Laptop, Banknote, StopCircle, Clock, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { matchingService } from '@/services/matching';
import { emailService } from '@/services/email';
import { notificationService } from '@/services/notification';
import { JobForm, JobFormData } from '@/components/company/JobForm';
import { serverTimestamp } from 'firebase/firestore';

interface ApplicationWithProfile extends Application {
  student: Student & { email?: string };
}

export default function CompanyJobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const router = useRouter();

  // Actions state
  const [closingJob, setClosingJob] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationWithProfile | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [savingInterview, setSavingInterview] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ appId: string, action: 'offer' | 'reject' } | null>(null);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const jobSnap = await getDoc(doc(db, 'jobPostings', id));
        if (!jobSnap.exists()) {
          setLoading(false);
          return;
        }
        const rawData = jobSnap.data();
        const jobData = { 
          ...rawData, 
          id: jobSnap.id,
          // Ensure arrays are always arrays
          requirements: Array.isArray(rawData.requirements) ? rawData.requirements : [],
        } as JobPosting;
        
        // Only allow viewing own jobs
        if (user && jobData.companyId !== user.id) {
          router.push('/company/jobs');
          return;
        }
        
        setJob(jobData);

        // Fetch applications for this job
        const appsQuery = query(collection(db, 'applications'), where('jobId', '==', id));
        const appsSnap = await getDocs(appsQuery);
        const apps = await Promise.all(appsSnap.docs.map(async (appDoc) => {
          const appData = appDoc.data() as Application;
          const studentSnap = await getDoc(doc(db, 'students', appData.studentId));
          const studentProfile = studentSnap.exists() ? (studentSnap.data() as Student) : ({ name: 'Unknown', userId: appData.studentId } as Student);
          let email = '';
          try {
             const userSnap = await getDoc(doc(db, 'users', appData.studentId));
             if (userSnap.exists()) email = userSnap.data().email || '';
          } catch (e) { console.warn('Failed to fetch email', e); }
          return { ...appData, id: appDoc.id, student: { ...studentProfile, email } };
        }));
        
        apps.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        setApplications(apps);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchData();
  }, [id, user, router]);

  const handleCloseJob = async () => {
    if (!confirm('この求人の応募受付を終了しますか？\n（学生側の一覧から表示されなくなります）')) return;
    setClosingJob(true);
    try {
       await updateDoc(doc(db, 'jobPostings', id), {
          status: 'closed',
          updatedAt: new Date()
       });
       setJob(prev => prev ? { ...prev, status: 'closed' } : null);
       alert('求人を終了しました。');
    } catch (e) {
       console.error(e);
       alert('エラーが発生しました');
    } finally {
       setClosingJob(false);
    }
  };

  const handleOpenJob = async () => {
    if (!confirm('この求人の募集を再開しますか？\n（学生側の一覧に再度表示されるようになります）')) return;
    setClosingJob(true);
    try {
       await updateDoc(doc(db, 'jobPostings', id), {
          status: 'published',
          updatedAt: new Date()
       });
       setJob(prev => prev ? { ...prev, status: 'published' } : null);
       alert('募集を再開しました。');
    } catch (e) {
       console.error(e);
       alert('エラーが発生しました');
    } finally {
       setClosingJob(false);
    }
  };

  const handleSaveInterviewDate = async () => {
    if (!selectedApp) return;
    setSavingInterview(true);
    try {
       await updateDoc(doc(db, 'applications', selectedApp.id), {
          interviewDate: interviewDate,
          updatedAt: new Date()
       });
       setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, interviewDate } : a));
       setSelectedApp({ ...selectedApp, interviewDate });
       alert('面談日を保存しました。');
    } catch (e) {
       console.error(e);
       alert('保存エラー');
    } finally {
       setSavingInterview(false);
    }
  };

  const openStatusModal = (app: ApplicationWithProfile, action: 'offer' | 'reject') => {
     setConfirmModal({ appId: app.id, action });
     if (action === 'offer') setMessage('ぜひ、よろしくお願いします。\n');
     else setMessage('誠に残念ながら、今回はご縁がありませんでした。\n今後のご活躍をお祈り申し上げます。');
  };

  const handleExecuteStatusUpdate = async () => {
    if (!confirmModal || !user || !job) return;
    const { appId, action } = confirmModal;
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    setProcessing(appId);
    try {
      if (action === 'offer') {
        await matchingService.approveByCompany(appId, user.id);
        await notificationService.createNotification(app.studentId, 'マッチングオファー', `${user.name || '企業'}からオファーが届きました！`, 'offer_received', '/student/applications');
        if (app.student.email) await emailService.notifyOffer(app.student.email, app.student.name, user.name || '企業', job.title, message);
      } else if (action === 'reject') {
        await matchingService.rejectByCompany(appId, user.id);
        await notificationService.createNotification(app.studentId, '選考結果のお知らせ', `残念ながら${user.name || '企業'}とのマッチングは成立しませんでした。`, 'offer_rejected', '/student/applications');
        if (app.student.email) await emailService.notifyRejection(app.student.email, app.student.name, user.name || '企業', job.title);
      }

      const newStatus = action === 'offer' ? 'pending_student' : 'rejected_by_company';
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      
      setConfirmModal(null);
      setSelectedApp(null);
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert('ステータス更新に失敗しました: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge variant="success">公開中</Badge>;
      case 'pending_approval': return <Badge variant="warning">承認待ち</Badge>;
      case 'draft': return <Badge variant="outline">下書き</Badge>;
      case 'closed': return <Badge variant="error" className="bg-gray-100 text-gray-500">終了</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;
  
  if (!job) {
    return (
      <div className="text-center p-12">
        <p className="text-gray-500 mb-4">求人が見つかりません</p>
        <Link href="/company/jobs">
          <Button variant="outline">求人一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  const requirements = job.requirements || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/company/jobs')}>
          <ArrowLeft size={16} className="mr-1" />
          求人一覧
        </Button>
        <div className="flex items-center gap-2">
          {job.status === 'published' && (
             <Button 
                variant="danger" 
                size="sm" 
                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                onClick={handleCloseJob} 
                isLoading={closingJob}
             >
                <StopCircle size={16} className="mr-1" /> 応募受付を終了
             </Button>
          )}
          {job.status === 'closed' && (
             <Button 
                variant="outline" 
                size="sm" 
                className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                onClick={handleOpenJob} 
                isLoading={closingJob}
             >
                <PlayCircle size={16} className="mr-1" /> 募集を再開する
             </Button>
          )}
        </div>
      </div>

      <Card className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#1E3A5F]">求人詳細・編集</h1>
              {getStatusBadge(job.status)}
             </div>
             <p className="text-sm text-gray-500">この画面から詳細の確認および編集が行えます。</p>
           </div>
         </div>

         {job.status === 'pending_approval' && (
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
             ⏳ 管理者による承認を待っています。承認後に学生へ公開されます。
           </div>
         )}
         {job.status === 'draft' && (
           <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 text-sm text-gray-600">
             📝 この求人は下書き状態です。管理者からの差し戻しによる可能性があります。
           </div>
         )}

         <JobForm
            initialData={job as any}
            initialFiles={
               job.pdfFileIds 
                 ? job.pdfFileIds.map((id, index) => ({ name: `添付ファイル${index + 1}`, id })) 
                 : (job.pdfFileId ? [{ name: '添付ファイル1', id: job.pdfFileId }] : [])
            }
            onSubmit={async (data) => {
               setSaving(true);
               try {
                  await updateDoc(doc(db, 'jobPostings', id), {
                     ...data,
                     pdfFileIds: data.pdfFileIds,
                     pdfFileId: data.pdfFileIds[0] || null, // legacy
                     updatedAt: serverTimestamp()
                  });
                  setJob(prev => prev ? { ...prev, ...data } as any : null);
                  alert('求人情報を更新しました');
               } catch(e) { 
                  console.error(e);
                  alert('更新エラー');
               } finally { 
                  setSaving(false); 
               }
            }}
            onCancel={() => router.push('/company/jobs')}
            loading={saving}
            submitLabel="更新する"
         />
      </Card>
    </div>
  );
}
