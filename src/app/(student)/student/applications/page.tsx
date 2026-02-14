"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Application, JobPosting, Company } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader2, Calendar, MapPin, Building } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { matchingService } from '@/services/matching';

interface ApplicationWithDetails extends Application {
  job: JobPosting;
  company: Company;
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchApplications() {
      if (!user) return;

      try {
        const q = query(
          collection(db, 'applications'),
          where('studentId', '==', user.id)
        );
        const snapshot = await getDocs(q);

        const appsWithDetails = await Promise.all(snapshot.docs.map(async (appDoc) => {
          const appData = appDoc.data() as Application;
          
          // Fetch Job Details
          const jobSnap = await getDoc(doc(db, 'jobPostings', appData.jobId));
          const jobData = jobSnap.exists() ? (jobSnap.data() as JobPosting) : ({} as JobPosting);

          // Fetch Company Details
          const companySnap = await getDoc(doc(db, 'companies', appData.companyId));
          const companyData = companySnap.exists() ? (companySnap.data() as Company) : ({} as Company);

          return {
            ...appData,
            id: appDoc.id, // Ensure ID comes from doc ID and overwrites if necessary
            job: jobData,
            company: companyData
          };
        }));

        // Sort by createdAt desc (client-side)
        appsWithDetails.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setApplications(appsWithDetails);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_admin':
        return <Badge variant="warning">管理者承認待ち</Badge>;
      case 'pending_company':
        return <Badge variant="warning">企業選考中</Badge>;
      case 'pending_student':
        return <Badge variant="success">マッチングオファー届いています！</Badge>;
      case 'matched':
        return <Badge variant="success" className="bg-green-500 text-white">マッチング成立</Badge>;
      case 'rejected_by_admin':
      case 'rejected_by_company':
        return <Badge variant="error">不採用</Badge>;
      case 'cancelled':
        return <Badge variant="outline">辞退/キャンセル</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAcceptMatch = async (appId: string) => {
    if (!user) return;
    if (!confirm('マッチングを承認しますか？\nこれでインターンシップが確定します。')) return;
    
    // Optimistic UI or loading state would be better here
    try {
      await matchingService.acceptMatchByStudent(appId, user.id);
      alert('マッチングが成立しました！');
      // Reload applications
      setLoading(true); // Trigger re-fetch mostly via Effect dependency if we changed it, but simple reload for now
      window.location.reload(); 
    } catch (error: any) {
      console.error("Error accepting match:", error);
      alert('承認に失敗しました: ' + error.message);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">応募履歴</h1>
        <p className="text-gray-500">あなたの応募状況を確認できます</p>
      </div>

      {applications.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <p>まだ応募した求人はありません。</p>
          <Button className="mt-4" onClick={() => router.push('/student/jobs')}>
            求人を探す
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            // Calculate progress for stepper
            const steps = [
               { id: 'pending_admin', label: '承認待ち' },
               { id: 'pending_company', label: '企業選考' },
               { id: 'pending_student', label: 'オファー' },
               { id: 'matched', label: '成立' }
            ];
            
            let currentStepIndex = -1;
            if (app.status === 'pending_admin') currentStepIndex = 0;
            if (app.status === 'pending_company') currentStepIndex = 1;
            if (app.status === 'pending_student') currentStepIndex = 2;
            if (app.status === 'matched' || (app.status as string) === 'completed') currentStepIndex = 3;
            if (app.status.includes('rejected') || app.status === 'cancelled') currentStepIndex = -1; // Special case

            return (
            <Card key={app.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">応募日: {app.createdAt ? format(app.createdAt.toDate(), 'yyyy/MM/dd HH:mm') : '-'}</span>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <div>
                     <h3 className="text-xl font-bold text-[#1E3A5F] mb-1">
                        {app.job.title || '求人削除済み'}
                     </h3>
                     <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                           <Building size={14} />
                           <span>{app.company.name || '企業名不明'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <MapPin size={14} />
                           <span>{app.job.location}</span>
                        </div>
                     </div>
                  </div>

                     {/* Status Stepper */}
                  {currentStepIndex >= 0 && (
                     <div className="pt-2 pb-6 px-4">
                        <div className="relative w-full">
                           {/* Background Line: Starts at 12.5% (center of first col) and ends at 87.5% (center of last col) -> Width 75%, Left 12.5% */}
                           <div className="absolute top-4 left-[12.5%] w-[75%] h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
                           {/* Active Line */}
                           <div 
                              className="absolute top-4 left-[12.5%] h-1 bg-indigo-600 -translate-y-1/2 rounded-full transition-all duration-500" 
                              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 75}%` }}
                           />

                           <div className="grid grid-cols-4 w-full">
                              {steps.map((step, index) => {
                                 const isCompleted = index <= currentStepIndex;
                                 const isCurrent = index === currentStepIndex;
                                 
                                 return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                                          isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-400'
                                       }`}>
                                          {index + 1}
                                       </div>
                                       <span className={`absolute top-10 text-[10px] whitespace-nowrap font-medium ${isCurrent ? 'text-indigo-700' : 'text-gray-400'}`}>
                                          {step.label}
                                       </span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Rejection Message */}
                  {app.status.includes('rejected') && (
                     <div className="bg-red-50 p-3 rounded-lg text-sm text-red-600 flex items-start gap-2">
                        <div className="mt-0.5">⚠️</div>
                        <div>
                           <p className="font-bold">不採用となりました</p>
                           <p className="text-xs opacity-80 mt-1">
                              残念ながら今回はご縁がありませんでした。他の求人も探してみましょう。
                           </p>
                        </div>
                     </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                  <Link href={`/student/jobs/${app.jobId}`}>
                    <Button variant="outline" size="sm" className="w-full">
                       求人詳細
                    </Button>
                  </Link>

                  {app.status === 'pending_student' && (
                     <Button 
                        variant="primary" 
                        className="bg-[#48BB78] hover:bg-[#48BB78]/90 w-full shadow-lg shadow-green-200"
                        onClick={() => handleAcceptMatch(app.id)}
                     >
                        オファーを承諾
                     </Button>
                  )}
               
                  {(app.status === 'matched' || (app.status as string) === 'completed') && app.matchId && (
                     <Link href={`/student/intern/${app.matchId}`} className="w-full"> 
                        <Button className="bg-[#1E3A5F] w-full">
                           インターン画面へ
                        </Button>
                     </Link>
                  )}
                </div>
              </div>
            </Card>
          );
          })}
        </div>
      )}
    </div>
  );
}
