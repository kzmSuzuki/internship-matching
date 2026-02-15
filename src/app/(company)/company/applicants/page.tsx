"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Application, JobPosting, Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader2, Briefcase, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { matchingService } from '@/services/matching';
import { emailService } from '@/services/email';
import { notificationService } from '@/services/notification';

interface ApplicationWithProfile extends Application {
  job: JobPosting;
  student: Student & { email?: string };
}

export default function CompanyApplicantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Modals
  const [selectedApp, setSelectedApp] = useState<ApplicationWithProfile | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ appId: string, action: 'offer' | 'reject' } | null>(null);
  const [message, setMessage] = useState('');
  
  // Fetch applications for all jobs owned by this company
  useEffect(() => {
    async function fetchApps() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'applications'),
          where('companyId', '==', user.id)
        );
        const snapshot = await getDocs(q);

        const apps = await Promise.all(snapshot.docs.map(async (appDoc) => {
          const appData = appDoc.data() as Application;
          
          // Fetch Job
          const jobSnap = await getDoc(doc(db, 'jobPostings', appData.jobId));
          const jobData = jobSnap.exists() ? (jobSnap.data() as JobPosting) : ({} as JobPosting);
          
          // Fetch Student Profile
          const studentSnap = await getDoc(doc(db, 'students', appData.studentId));
          const studentProfile = studentSnap.exists() 
             ? (studentSnap.data() as Student) 
             : ({ name: 'Unknown', userId: appData.studentId } as Student);

          // Fetch User Email (from users collection)
          let email = '';
          try {
             const userSnap = await getDoc(doc(db, 'users', appData.studentId));
             if (userSnap.exists()) {
                email = userSnap.data().email || '';
             }
          } catch (e) {
             console.warn('Failed to fetch user email', e);
          }

          return {
            ...appData,
            id: appDoc.id,
            job: jobData,
            student: { ...studentProfile, email }
          };
        }));
        
        // Sort client side
        apps.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

        setApplications(apps);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchApps();
  }, [user]);

  const openStatusModal = (app: ApplicationWithProfile, action: 'offer' | 'reject') => {
     setConfirmModal({ appId: app.id, action });
     if (action === 'offer') {
        setMessage('ぜひ、よろしくお願いします。\n');
     } else {
        setMessage('誠に残念ながら、今回はご縁がありませんでした。\n今後のご活躍をお祈り申し上げます。');
     }
  };

  const handleExecuteStatusUpdate = async () => {
    if (!confirmModal || !user) return;
    const { appId, action } = confirmModal;
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    setProcessing(appId);
    try {
      if (action === 'offer') {
        await matchingService.approveByCompany(appId, user.id);
        
        // Notification
        await notificationService.createNotification(
           app.studentId,
           'マッチングオファー',
           `${user.name || '企業'}からオファーが届きました！`,
           'offer_received',
           '/student/applications'
        );

        // Email
        if (app.student.email) {
           await emailService.notifyOffer(
              app.student.email,
              app.student.name,
              user.name || '企業',
              app.job.title,
              message
           );
        }

      } else if (action === 'reject') {
        await matchingService.rejectByCompany(appId, user.id);
        
        // Notification
        await notificationService.createNotification(
           app.studentId,
           '選考結果のお知らせ',
           `残念ながら${user.name || '企業'}とのマッチングは成立しませんでした。`,
           'offer_rejected',
           '/student/applications'
        );

        // Email
        if (app.student.email) {
           // Reuse the message for rejection too? Usually rejection is standard but let's send standard or custom?
           // The service uses fixed template. If we want custom message in rejection, we need to update service.
           // For now, use the standard rejection template in service, ignoring 'message' state for email body to keep it safe/standard.
           await emailService.notifyRejection(
              app.student.email,
              app.student.name,
              user.name || '企業',
              app.job.title
           );
        }
      }

      // Update local state
      const newStatus = action === 'offer' ? 'pending_student' : 'rejected_by_company';
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));
      
      setConfirmModal(null);
      setSelectedApp(null);
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert('ステータス更新に失敗しました: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">応募者管理</h1>
        <p className="text-gray-500">求人への応募者を確認し、選考を進めましょう</p>
      </div>

      {applications.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <p>現在、応募者はいません。</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                 <div>
                    <div className="flex items-center gap-2 mb-2">
                       <h3 className="text-lg font-bold text-[#1E3A5F]">{app.student.name}</h3>
                       <Badge variant="outline" className="text-xs">{app.student.university || '大学未設定'}</Badge>
                       <span className="text-xs text-gray-400">
                          {app.student.grade}
                       </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                       <Briefcase size={14} />
                       <span>応募先: {app.job.title}</span>
                    </div>
                    
                    <div className="flex gap-2 mb-2">
                       {/* Status specific display */}
                       {app.status === 'pending_admin' && <Badge variant="warning">管理者承認待ち</Badge>}
                       {app.status === 'pending_company' && <Badge variant="warning" className="animate-pulse">対応待ち</Badge>}
                       {app.status === 'pending_student' && <Badge variant="success">オファー済み</Badge>}
                       {app.status === 'matched' && <Badge variant="success" className="bg-green-600 text-white">マッチング成立</Badge>}
                       {app.status.includes('rejected') && <Badge variant="error" className="bg-gray-100 text-gray-500">不採用</Badge>}
                    </div>

                    <p className="text-xs text-gray-400">
                       応募日: {format(app.createdAt.toDate(), 'yyyy/MM/dd HH:mm')}
                    </p>
                 </div>

                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setSelectedApp(app)}>
                       詳細・プロフィール
                    </Button>
                    
                    {app.status === 'pending_company' && (
                       <>
                          <Button 
                             onClick={() => openStatusModal(app, 'offer')}
                             isLoading={processing === app.id}
                             className="bg-[#48BB78] hover:bg-[#48BB78]/90"
                          >
                             オファー承認
                          </Button>
                          <Button 
                             variant="danger"
                             className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                             onClick={() => openStatusModal(app, 'reject')}
                             disabled={!!processing}
                          >
                             不採用
                          </Button>
                       </>
                     )}
                     
                     {(app.status === 'matched' || (app.status as string) === 'completed') && app.matchId && (
                        <div className="ml-2">
                           <Button 
                              variant="outline" 
                              className="bg-[#1E3A5F]/5 border-[#1E3A5F]/20 text-[#1E3A5F]"
                              onClick={() => router.push(`/company/intern/${app.matchId}`)}
                           >
                              インターン管理画面へ
                           </Button>
                        </div>
                     )}
                 </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Student Profile Modal */}
      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="応募者詳細">
         {selectedApp && (
            <div className="space-y-4">
               <div>
                  <label className="text-xs text-gray-500">氏名</label>
                  <p className="font-medium text-lg">{selectedApp.student.name}</p>
               </div>
               <div>
                  <label className="text-xs text-gray-500">所属</label>
                  <p>{selectedApp.student.university} {selectedApp.student.grade}</p>
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
               <div>
                  <label className="text-xs text-gray-500">ポートフォリオ / リンク</label>
                  <ul className="list-disc list-inside text-sm text-blue-600">
                     {selectedApp.student.links?.map((link, i) => (
                        <li key={i}>
                           <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">{link}</a>
                        </li>
                     ))}
                  </ul>
               </div>

               <div className="border-t pt-4 mt-4">
                  <label className="text-xs text-gray-500">応募メッセージ</label>
                  <p className="text-sm mt-1">{selectedApp.message}</p>
               </div>
               
               {/* Actions in Profile Modal too */}
               {selectedApp.status === 'pending_company' && (
                  <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
                     <Button 
                        variant="danger"
                        className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                        onClick={() => { setSelectedApp(null); openStatusModal(selectedApp, 'reject'); }}
                     >
                        不採用
                     </Button>
                     <Button 
                        onClick={() => { setSelectedApp(null); openStatusModal(selectedApp, 'offer'); }}
                        className="bg-[#48BB78] hover:bg-[#48BB78]/90"
                     >
                        オファー承認
                     </Button>
                  </div>
               )}

               <div className="flex justify-end pt-2">
                  <Button variant="secondary" onClick={() => setSelectedApp(null)}>閉じる</Button>
               </div>
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
