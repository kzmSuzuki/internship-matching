"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Application, JobPosting, Student, Match } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader2, MapPin, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { matchingService } from '@/services/matching';

interface ApplicationWithProfile extends Application {
  job: JobPosting;
  student: Student;
}

export default function CompanyApplicantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationWithProfile | null>(null);
  
  // Fetch applications for all jobs owned by this company
  useEffect(() => {
    async function fetchApps() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'applications'),
          where('companyId', '==', user.id),
          // order by logic needs composite index if mixing fields, so client-side sort often easier for prototype
          // orderBy('createdAt', 'desc') 
        );
        const snapshot = await getDocs(q);

        const apps = await Promise.all(snapshot.docs.map(async (appDoc) => {
          const appData = appDoc.data() as Application;
          
          // Fetch Job
          const jobSnap = await getDoc(doc(db, 'jobPostings', appData.jobId));
          const jobData = jobSnap.exists() ? (jobSnap.data() as JobPosting) : ({} as JobPosting);
          
          // Fetch Student
          const studentSnap = await getDoc(doc(db, 'students', appData.studentId));
          // Provide fallback if student profile missing
          const studentData = studentSnap.exists() 
             ? (studentSnap.data() as Student) 
             : ({ name: 'Unknown', userId: appData.studentId } as Student);

          return {
            ...appData,
            id: appDoc.id,
            job: jobData,
            student: studentData
          };
        }));
        
        // Sort client side for now
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

  const handleStatusUpdate = async (appId: string, newStatus: Application['status']) => {
    if (!user) return;
    if (!confirm(newStatus === 'pending_student' ? 'この学生にマッチングオファーを出しますか？' : '本当に不採用にしますか？')) return;
    
    setProcessing(appId);
    try {
      if (newStatus === 'pending_student') {
        await matchingService.approveByCompany(appId, user.id);
      } else if (newStatus === 'rejected_by_company') {
        await matchingService.rejectByCompany(appId, user.id);
      }

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));
      
      setSelectedApp(null);
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert('ステータス更新に失敗しました: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

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
                             onClick={() => handleStatusUpdate(app.id, 'pending_student')}
                             isLoading={processing === app.id}
                             className="bg-[#48BB78] hover:bg-[#48BB78]/90"
                          >
                             オファー承認
                          </Button>
                          <Button 
                             variant="danger" // Assuming danger variant exists or similar
                             className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                             onClick={() => handleStatusUpdate(app.id, 'rejected_by_company')}
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

               <div className="flex justify-end pt-2">
                  <Button variant="secondary" onClick={() => setSelectedApp(null)}>閉じる</Button>
               </div>
            </div>
         )}
      </Modal>
    </div>
  );
}
