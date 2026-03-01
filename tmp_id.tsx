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
              <h1 className="text-2xl font-bold text-[#1E3A5F]">{job.title}</h1>
              {getStatusBadge(job.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {job.location || '未設定'}
              </span>
              {job.salary && <span>💰 {job.salary}</span>}
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {job.createdAt?.toDate ? format(job.createdAt.toDate(), 'yyyy/MM/dd') : '-'} 作成
              </span>
            </div>
          </div>
        </div>

        {/* Status Info */}
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

        {/* Requirements */}
        {requirements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#1E3A5F] mb-2 border-b pb-1">応募要件 / スキル</h3>
            <div className="flex flex-wrap gap-2">
              {requirements.map((req, i) => (
                <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
              ))}
            </div>
            {job.tools && <p className="text-sm mt-3"><span className="font-semibold text-gray-700">使用ツール:</span> {job.tools}</p>}
            {job.niceToHave && <p className="text-sm mt-1"><span className="font-semibold text-gray-700">歓迎要件:</span> {job.niceToHave}</p>}
          </div>
        )}

        {/* Content */}
        {job.content && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#1E3A5F] mb-2 border-b pb-1">仕事内容</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {job.content}
            </div>
            {job.mentorSystem && <p className="text-sm mt-3"><span className="font-semibold text-gray-700">メンター体制:</span> {job.mentorSystem}</p>}
            {job.expectedOutput && <p className="text-sm mt-1"><span className="font-semibold text-gray-700">期待する成果・想定アウトプット:</span> {job.expectedOutput}</p>}
          </div>
        )}

        {/* Conditions */}
        <div className="mb-6">
           <h3 className="text-sm font-bold text-[#1E3A5F] mb-2 border-b pb-1">待遇・条件・その他</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><span className="font-semibold text-gray-700">報酬:</span> {job.isPaid ? '有償' : '無償'} {job.salary && `(${job.salary})`}</p>
              <p><span className="font-semibold text-gray-700">交通費・宿泊費の有無:</span> 交通費({job.hasTransportation ? 'あり' : 'なし'}) / 宿泊費({job.hasAccommodation ? 'あり' : 'なし'})</p>
              {job.belongings && <p><span className="font-semibold text-gray-700">持参物:</span> {job.belongings}</p>}
              {job.dressCode && <p><span className="font-semibold text-gray-700">服装:</span> {job.dressCode}</p>}
           </div>
           {job.otherNotes && (
              <div className="mt-4">
                 <span className="font-semibold text-sm text-gray-700">その他:</span>
                 <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{job.otherNotes}</p>
              </div>
           )}
        </div>

        {/* PDF */}
        {job.pdfFileId && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#1E3A5F] mb-2 border-b pb-1">添付資料</h3>
            {job.pdfFileId && (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div className="mb-4 text-[#1E3A5F]">
                   <ExternalLink size={48} />
                </div>
                <p className="text-gray-600 mb-4 font-medium">PDFファイルが添付されています</p>
                
                {pdfUrl ? (
                  <a href={pdfUrl} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#1E3A5F] text-sm hover:bg-gray-50 transition-colors">
                    <ExternalLink size={16} /> 別タブで開く
                  </a>
                ) : (
                   <Button variant="outline" isLoading={pdfLoading} onClick={async () => {
                      if (!job.pdfFileId) return;
                      setPdfLoading(true);
                      try {
                        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                        if (token) {
                          const res = await fetch(`/api/pdf/${job.pdfFileId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            setPdfUrl(URL.createObjectURL(blob));
                          }
                        }
                      } catch(e) { console.error(e); alert('PDF取得エラー'); } finally { setPdfLoading(false); }
                   }}>
                     PDFを読み込む
                   </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Applications Section */}
      <div className="pt-6">
         <h2 className="text-xl font-bold text-[#1E3A5F] mb-4 border-b pb-2">応募者一覧 ({applications.length}名)</h2>
         
         {applications.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
               <p>現在、この求人への応募者はいません。</p>
            </Card>
         ) : (
            <div className="grid gap-4">
               {applications.map(app => (
                  <Card key={app.id} className="p-5">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-[#1E3A5F]">{app.student.name}</h3>
                              <Badge variant="outline" className="text-xs">{app.student.university || '大学未設定'}</Badge>
                           </div>
                           <div className="flex gap-2 mb-2 text-xs">
                              {app.status === 'pending_admin' && <Badge variant="warning">管理者承認待ち</Badge>}
                              {app.status === 'pending_company' && <Badge variant="warning" className="animate-pulse">対応待ち</Badge>}
                              {app.status === 'pending_student' && <Badge variant="success">オファー済み</Badge>}
                              {app.status === 'matched' && <Badge variant="success" className="bg-green-600 text-white">マッチング成立</Badge>}
                              {app.status.includes('rejected') && <Badge variant="error" className="bg-gray-100 text-gray-500">不採用</Badge>}
                           </div>
                           <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              応募日: {format(app.createdAt.toDate(), 'yyyy/MM/dd HH:mm')}
                           </div>
                           {app.interviewDate && (
                              <div className="text-xs text-[#2B6CB0] font-medium mt-1">
                                 面談予定: {app.interviewDate}
                              </div>
                           )}
                        </div>
                        <div className="flex gap-2">
                           {app.status === 'matched' && (
                             <Link href={`/company/interns/${app.matchId || app.id}`}>
                               <Button size="sm" className="bg-[#1E3A5F] hover:bg-[#16304F]">インターン管理</Button>
                             </Link>
                           )}
                           <Button 
                              variant="outline" size="sm" 
                              onClick={() => {
                                 setSelectedApp(app);
                                 setInterviewDate(app.interviewDate || '');
                              }}
                           >
                              詳細・面談日設定
                           </Button>
                        </div>
                     </div>
                  </Card>
               ))}
            </div>
         )}
      </div>

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
               
               <div className="border-t pt-4">
                  <label className="text-sm font-bold text-[#1E3A5F]">面談日の設定</label>
                  <p className="text-xs text-gray-500 mb-2">承認/否認を行う前に、面談日（予定や実施済み日時）を登録してください。</p>
                  <div className="flex gap-2">
                     <Input 
                        type="datetime-local"
                        value={interviewDate} 
                        onChange={(e) => setInterviewDate(e.target.value)} 
                        disabled={selectedApp.status !== 'pending_company'}
                     />
                     {selectedApp.status === 'pending_company' && (
                        <Button 
                           onClick={handleSaveInterviewDate} 
                           isLoading={savingInterview}
                           disabled={!interviewDate.trim()}
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
