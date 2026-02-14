"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader2, Briefcase, FileText, CheckCircle, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingJobs: 0,
    newApplicants: 0,
    activeInterns: 0
  });
  const [loading, setLoading] = useState(true);
  const [companyApproved, setCompanyApproved] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      try {
        // Check company approval status
        const companyDoc = await getDoc(doc(db, 'companies', user.id));
        if (companyDoc.exists()) {
          setCompanyApproved(companyDoc.data().isApproved === true);
        }

        const jobsColl = collection(db, 'jobPostings');
        const appsColl = collection(db, 'applications');
        const matchesColl = collection(db, 'matches');

        const activeJobsSnap = await getCountFromServer(query(
            jobsColl, 
            where('companyId', '==', user.id),
            where('status', '==', 'published')
        ));
        const pendingJobsSnap = await getCountFromServer(query(
            jobsColl, 
            where('companyId', '==', user.id),
            where('status', '==', 'pending_approval')
        ));

        const appsSnap = await getCountFromServer(query(
            appsColl, 
            where('companyId', '==', user.id),
            where('status', '==', 'pending_company')
        ));

        const matchesSnap = await getCountFromServer(query(
            matchesColl, 
            where('companyId', '==', user.id),
            where('status', '==', 'active')
        ));

        setStats({
          activeJobs: activeJobsSnap.data().count,
          pendingJobs: pendingJobsSnap.data().count,
          newApplicants: appsSnap.data().count,
          activeInterns: matchesSnap.data().count,
        });

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchStats();
  }, [user]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">企業ダッシュボード</h1>
            <p className="text-gray-500">ようこそ、{user?.name} 様</p>
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

       {/* Company approval status banner */}
       {companyApproved === false && (
         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
           <ShieldAlert className="text-amber-600 flex-shrink-0" size={20} />
           <div>
             <p className="text-sm font-medium text-amber-800">
               企業アカウントが承認待ちです
             </p>
             <p className="text-xs text-amber-600">
               管理者による承認が完了すると、求人の作成が可能になります。プロフィールを充実させておくと承認がスムーズです。
             </p>
           </div>
         </div>
       )}
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={companyApproved ? <ShieldCheck /> : <ShieldAlert />} 
            label="企業アカウント" 
            value={companyApproved ? "承認済み" : "承認待ち"} 
            isStatus
            approved={companyApproved}
            link="/company/profile"
          />
          <StatCard 
            icon={<Briefcase />} 
            label="公開中の求人" 
            value={stats.activeJobs} 
            subValue={stats.pendingJobs > 0 ? `${stats.pendingJobs}件が承認待ち` : undefined}
            link="/company/jobs"
          />
          <StatCard 
            icon={<FileText />} 
            label="新規応募" 
            value={stats.newApplicants} 
            link="/company/applicants"
          />
          <StatCard 
            icon={<CheckCircle />} 
            label="実施中のインターン" 
            value={stats.activeInterns} 
            link="/company/applicants"
          />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
             <h3 className="font-bold mb-4">最近の応募</h3>
             {stats.newApplicants > 0 ? (
                <div className="text-center py-8">
                   <p className="text-2xl font-bold text-[#1E3A5F] mb-2">{stats.newApplicants}件</p>
                   <p className="text-gray-500 mb-4">の新しい応募があります</p>
                   <Link href="/company/applicants">
                      <Button variant="outline">応募を確認する</Button>
                   </Link>
                </div>
             ) : (
                <div className="text-center py-8 text-gray-400">
                   新しい応募はありません
                </div>
             )}
          </Card>

          <Card className="p-6">
             <h3 className="font-bold mb-4">ステータス</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                   <span className="text-sm font-medium">企業承認</span>
                   {companyApproved ? (
                     <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">承認済み</span>
                   ) : (
                     <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">承認待ち</span>
                   )}
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                   <span className="text-sm font-medium">企業プロフィール</span>
                   <Link href="/company/profile" className="text-xs text-[#1E3A5F] hover:underline">編集</Link>
                </div>
             </div>
          </Card>
       </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, link, isStatus, approved }: any) {
    const Content = (
      <Card className={`p-6 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer h-full ${isStatus && !approved ? 'border-amber-300 bg-amber-50/50' : ''}`}>
         <div className={`p-3 rounded-lg ${isStatus && !approved ? 'bg-amber-100 text-amber-600' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'}`}>
            {icon}
         </div>
         <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${isStatus && !approved ? 'text-amber-700 text-lg' : ''}`}>{value}</p>
            {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
         </div>
      </Card>
    );

    return link ? <Link href={link}>{Content}</Link> : Content;
}
