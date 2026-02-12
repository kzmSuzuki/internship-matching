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
          where('studentId', '==', user.id),
          orderBy('createdAt', 'desc')
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
          {applications.map((app) => (
            <Card key={app.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">応募日: {app.createdAt ? format(app.createdAt.toDate(), 'yyyy/MM/dd HH:mm') : '-'}</span>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#1E3A5F]">
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

                <div className="flex items-center">
                  <Link href={`/student/jobs/${app.jobId}`}>
                    <Button variant="outline" size="sm">
                       求人詳細を見る
                    </Button>
                  </Link>
                </div>
              </div>

              {app.status === 'pending_student' && (
                 <div className="mt-4 bg-[#48BB78]/10 p-4 rounded-lg flex justify-between items-center">
                    <p className="text-[#2F855A] font-medium text-sm">
                       企業からマッチングのオファーが届いています！承認してインターンを開始しましょう。
                    </p>
                     <Button 
                       variant="primary" 
                       className="bg-[#48BB78] hover:bg-[#48BB78]/90"
                       onClick={() => handleAcceptMatch(app.id)}
                    >
                       マッチングを承認する
                    </Button>
                 </div>
              )}
              
              {(app.status === 'matched' || ((app.status as string) === 'completed')) && app.matchId && (
                 <div className="mt-4 bg-[#1E3A5F]/5 p-4 rounded-lg flex justify-between items-center">
                    <p className="text-[#1E3A5F] font-medium text-sm">
                       インターンシップが進行中(または完了)です。日報や評価を確認しましょう。
                    </p>
                    <Link href={`/student/intern/${app.matchId}`}> 
                       <Button className="bg-[#1E3A5F]">
                          インターンシップ画面へ
                       </Button>
                    </Link>
                 </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
