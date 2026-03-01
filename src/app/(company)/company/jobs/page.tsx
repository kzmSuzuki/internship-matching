"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Loader2, Plus, ShieldAlert, Trash2, Edit, Users, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Application, Student } from '@/types';
import { matchingService } from '@/services/matching';
import { emailService } from '@/services/email';
import { notificationService } from '@/services/notification';

interface ApplicationWithProfile extends Application {
  student: Student & { email?: string };
}

export default function CompanyJobListPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyApproved, setCompanyApproved] = useState<boolean | null>(null);
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);

  // Modal actions
  const [selectedApp, setSelectedApp] = useState<ApplicationWithProfile | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [savingInterview, setSavingInterview] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ appId: string, action: 'offer' | 'reject' } | null>(null);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Check company approval status
        const companyDoc = await getDoc(doc(db, 'companies', user.id));
        if (companyDoc.exists()) {
          setCompanyApproved(companyDoc.data().isApproved === true);
        }

        // Fetch jobs
        try {
          const q = query(
            collection(db, 'jobPostings'),
            where('companyId', '==', user.id),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          const rawJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobPosting & { isDeleted?: boolean }));
          setJobs(rawJobs.filter(j => !j.isDeleted));
        } catch (indexError: any) {
             // ... fallback logic same as before ...
            console.warn('Composite index missing for company jobs, falling back.');
            const q = query(
              collection(db, 'jobPostings'),
              where('companyId', '==', user.id)
            );
            const snapshot = await getDocs(q);
            // Filter client-side for isDeleted
            const rawJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobPosting & { isDeleted?: boolean }));
            const jobsData = rawJobs.filter(j => !j.isDeleted);
            jobsData.sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() ?? 0;
              const bTime = b.createdAt?.toMillis?.() ?? 0;
              return bTime - aTime;
            });
            setJobs(jobsData);
        }

        // Fetch applications
        try {
           const appQ = query(collection(db, 'applications'), where('companyId', '==', user.id));
           const appSnap = await getDocs(appQ);
           const apps = await Promise.all(appSnap.docs.map(async (appDoc) => {
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
        } catch (appErr) {
           console.error("Error fetching applications:", appErr);
        }
        
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('この求人を削除してもよろしいですか？取り消せません。')) return;
    try {
      await deleteDoc(doc(db, 'jobPostings', jobId));
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (error: any) {
      console.error("Delete error:", error);
      
      // Fallback to soft delete if permission denied (or other error)
      try {
         await updateDoc(doc(db, 'jobPostings', jobId), { isDeleted: true });
         setJobs(prev => prev.filter(job => job.id !== jobId));
         return;
      } catch (softError) {
         console.error("Soft delete error:", softError);
      }
      
      alert('削除に失敗しました: ' + (error.message || '不明なエラー'));
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
    if (!confirmModal || !user) return;
    const { appId, action } = confirmModal;
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    const job = jobs.find(j => j.id === app.jobId);
    if (!job) return;
    
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
      case 'published':
        return <Badge variant="success">公開中</Badge>;
      case 'pending_approval':
        return <Badge variant="warning">承認待ち</Badge>;
      case 'draft':
        return <Badge variant="outline">下書き</Badge>;
      case 'closed':
        return <Badge variant="error" className="bg-gray-100 text-gray-500">終了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">求人管理</h1>
          <p className="text-gray-500">作成した求人の確認と編集ができます</p>
        </div>
        {companyApproved ? (
          <Link href="/company/jobs/new">
            <Button>
              <Plus size={18} className="mr-2" />
              新規求人作成
            </Button>
          </Link>
        ) : (
          <Button disabled className="opacity-50 cursor-not-allowed">
            <Plus size={18} className="mr-2" />
            新規求人作成
          </Button>
        )}
      </div>

      {/* Company approval warning */}
      {companyApproved === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <ShieldAlert className="text-amber-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-800">
              企業アカウントが承認されていないため、新規求人は作成できません。
            </p>
            <p className="text-xs text-amber-600">
              管理者による承認をお待ちください。プロフィールを充実させておくと承認がスムーズです。
            </p>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <p>まだ求人がありません。</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {jobs.map((job) => {
            const jobApps = applications.filter(a => a.jobId === job.id);
            return (
              <Card key={job.id} className="p-0 overflow-hidden flex flex-col border border-gray-200">
                <div className="p-6 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <h3 className="text-lg font-bold text-[#1E3A5F]">{job.title}</h3>
                       {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                       {job.createdAt?.toDate ? format(job.createdAt.toDate(), 'yyyy/MM/dd') : '-'} 作成
                    </p>
                    <div className="flex gap-2">
                      {job.requirements.slice(0, 3).map((req, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-gray-50">{req}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link href={`/company/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1 font-bold text-[#1E3A5F]">
                        求人詳細・編集
                      </Button>
                    </Link>
                    <Button 
                       type="button"
                       variant="ghost" 
                       size="sm" 
                       className="text-red-500 hover:bg-red-50 hover:text-red-600"
                       onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                {jobApps.length > 0 && (
                   <div className="bg-gray-50/80 p-5 border-t border-gray-100 flex flex-col gap-3">
                      <span className="text-sm font-bold text-[#1E3A5F] flex items-center gap-1"><Users size={16}/>現在の応募者 ({jobApps.length}名)</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                         {jobApps.map(app => (
                           <div key={app.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2 relative group hover:border-[#1E3A5F] transition-colors">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <span className="font-bold text-sm text-[#1E3A5F] block">{app.student.name}</span>
                                    <span className="text-xs text-gray-500 block truncate max-w-[150px]">{app.student.university}</span>
                                 </div>
                                 <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => { setSelectedApp(app); setInterviewDate(app.interviewDate || ''); }}>詳細確認</Button>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                 <div className="flex flex-col gap-1">
                                    {app.status === 'pending_admin' && <Badge variant="warning" className="text-[10px] w-max py-0">管理者承認待ち</Badge>}
                                    {app.status === 'pending_company' && <Badge variant="warning" className="text-[10px] w-max py-0 animate-pulse bg-amber-100 text-amber-800">対応待ち</Badge>}
                                    {app.status === 'pending_student' && <Badge variant="success" className="text-[10px] w-max py-0">オファー済み</Badge>}
                                    {app.status === 'matched' && <Badge variant="success" className="bg-green-600 text-white text-[10px] w-max py-0">マッチング成立</Badge>}
                                    {app.status.includes('rejected') && <Badge variant="error" className="bg-gray-100 text-gray-500 text-[10px] w-max py-0">不採用</Badge>}
                                 </div>
                                 <div className="text-[10px] text-gray-400 font-medium">
                                    {app.createdAt.toDate ? format(app.createdAt.toDate(), 'MM/dd HH:mm') : ''}
                                 </div>
                              </div>
                              {app.interviewDate && (
                                 <div className="text-[10px] text-[#2B6CB0] bg-blue-50 px-2 py-1 rounded w-max mt-1 border border-blue-100 font-medium">
                                    📅 面談予定: {app.interviewDate.replace('T', ' ')}
                                 </div>
                              )}
                              {app.status === 'matched' && (
                                 <div className="mt-2 text-center border-t border-gray-100 pt-2">
                                    <Link href={`/company/intern/${app.matchId || app.id}`}>
                                       <Button size="sm" className="w-full h-8 text-xs bg-[#1E3A5F] hover:bg-[#16304F]">インターン管理へ</Button>
                                    </Link>
                                 </div>
                              )}
                           </div>
                         ))}
                      </div>
                   </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Student Profile Modal */}
      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="応募者詳細">
         {selectedApp && (
            <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs text-gray-500">氏名</label>
                    <p className="font-medium text-lg">{selectedApp.student.name}</p>
                 </div>
                 <div>
                    <label className="text-xs text-gray-500">所属</label>
                    <p className="font-medium">{selectedApp.student.university} {selectedApp.student.grade}</p>
                 </div>
               </div>
               
               <div>
                  <label className="text-xs text-gray-500">自己PR / BIO</label>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-wrap">
                     {selectedApp.student.bio || '未入力'}
                  </div>
               </div>
               
               <div>
                  <label className="text-xs text-gray-500">スキル</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                     {selectedApp.student.skills?.map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                     ))}
                  </div>
               </div>

               {selectedApp.student.links && selectedApp.student.links.length > 0 && selectedApp.student.links[0] !== "" && (
               <div>
                  <label className="text-xs text-gray-500">ポートフォリオ / リンク</label>
                  <div className="flex flex-col gap-1 mt-1">
                     {selectedApp.student.links.map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                           <ExternalLink size={14} />
                           {link}
                        </a>
                     ))}
                  </div>
               </div>
               )}
               
               <div className="border-t pt-4">
                  <label className="text-sm font-bold text-[#1E3A5F]">面談日の設定</label>
                  <p className="text-xs text-gray-500 mb-2">承認/否認を行う前に、面談日（予定や実施済み日時）を登録してください。</p>
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                     <div className="flex-1 w-full">
                        <Input 
                           type="datetime-local"
                           value={interviewDate} 
                           onChange={(e) => setInterviewDate(e.target.value)} 
                           disabled={selectedApp.status !== 'pending_company'}
                           className="w-full text-sm"
                        />
                     </div>
                     {selectedApp.status === 'pending_company' && (
                        <Button 
                           onClick={handleSaveInterviewDate} 
                           isLoading={savingInterview}
                           disabled={!interviewDate.trim()}
                           className="w-full sm:w-auto h-10 whitespace-nowrap"
                        >
                           保存
                        </Button>
                     )}
                  </div>
               </div>
               
               {/* Actions in Profile Modal */}
               {selectedApp.status === 'pending_company' && (
                  <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
                     <Button 
                        variant="danger"
                        className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                        onClick={() => { setSelectedApp(null); openStatusModal(selectedApp, 'reject'); }}
                        disabled={!selectedApp.interviewDate}
                     >
                        不採用
                     </Button>
                     <Button 
                        onClick={() => { setSelectedApp(null); openStatusModal(selectedApp, 'offer'); }}
                        className="bg-[#48BB78] hover:bg-[#48BB78]/90"
                        disabled={!selectedApp.interviewDate}
                     >
                        オファー承認
                     </Button>
                  </div>
               )}
            </div>
         )}
      </Modal>

      {/* Confirmation / Message Modal */}
      <Modal 
         isOpen={!!confirmModal} 
         onClose={() => setConfirmModal(null)} 
         title={confirmModal?.action === 'offer' ? 'オファー承認・メッセージ送信' : '不採用通知'}
      >
         <div className="space-y-4">
            <p className="text-sm text-gray-600">
               {confirmModal?.action === 'offer' 
                  ? '学生にマッチングオファーを送ります。以下のメッセージがメールで送信されます。'
                  : 'この学生を不採用にします。この操作は取り消せません。'
               }
            </p>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                  メッセージ
               </label>
               <textarea
                  className="w-full h-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="メッセージを入力してください..."
               />
               <p className="text-xs text-gray-400 mt-1">
                  ※ このメッセージはメール通知に含まれます。
               </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
               <Button variant="secondary" onClick={() => setConfirmModal(null)}>
                  キャンセル
               </Button>
               <Button 
                  onClick={handleExecuteStatusUpdate}
                  isLoading={!!processing}
                  className={confirmModal?.action === 'offer' ? "bg-[#48BB78]" : "bg-red-600 hover:bg-red-700 text-white"}
               >
                  {confirmModal?.action === 'offer' ? 'オファーを送る' : '不採用にする'}
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
