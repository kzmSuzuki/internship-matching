"use client";

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { Card } from '@/components/ui/Card';
import { Loader2, Users, Building, Briefcase, FileText, CheckCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
       try {
          const data = await adminService.getStats();
          setStats(data);
       } catch (error) {
          console.error(error);
       } finally {
          setLoading(false);
       }
    }
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-8">
       <h1 className="text-2xl font-bold text-[#1E3A5F]">ダッシュボード</h1>
       
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={<Building />} label="登録企業数" value={stats?.totalCompanies} link="/admin/companies" />
          <StatCard icon={<Users />} label="登録学生数" value={stats?.totalUsers} link="/admin/users" />
          <StatCard icon={<CheckCircle />} label="マッチング成立数" value={stats?.totalMatches} link="/admin/matches" />
          <StatCard icon={<ShieldAlert />} label="企業承認待ち" value={stats?.pendingCompanies} highlight link="/admin/companies" />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2">
                   <Briefcase size={20} className="text-[#1E3A5F]" />
                   求人の状況
                </h3>
                <Link href="/admin/jobs" className="text-sm text-[#1E3A5F] hover:underline">すべて見る</Link>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <Link href="/admin/jobs" className="block">
                  <div className="bg-amber-50 p-4 rounded-lg text-center hover:bg-amber-100 transition-colors cursor-pointer">
                     <span className="block text-2xl font-bold text-amber-700">{stats?.pendingJobs}</span>
                     <span className="text-xs text-amber-800 font-bold">承認待ち</span>
                  </div>
                </Link>
                <Link href="/admin/jobs" className="block">
                  <div className="bg-gray-50 p-4 rounded-lg text-center hover:bg-gray-100 transition-colors cursor-pointer">
                     <span className="block text-2xl font-bold text-gray-600">{stats?.activeJobs}</span>
                     <span className="text-xs text-gray-500">公開中</span>
                  </div>
                </Link>
             </div>
          </Card>

          <Card className="p-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2">
                   <FileText size={20} className="text-[#1E3A5F]" />
                   応募の状況
                </h3>
                <Link href="/admin/applications" className="text-sm text-[#1E3A5F] hover:underline">すべて見る</Link>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <Link href="/admin/applications" className="block">
                  <div className="bg-amber-50 p-4 rounded-lg text-center hover:bg-amber-100 transition-colors cursor-pointer">
                     <span className="block text-2xl font-bold text-amber-700">{stats?.pendingApplications}</span>
                     <span className="text-xs text-amber-800 font-bold">管理者承認待ち</span>
                  </div>
                </Link>
             </div>
          </Card>
       </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight, link }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean; link?: string }) {
   const Content = (
      <Card className={`p-6 flex items-center gap-4 ${highlight && value > 0 ? 'border-amber-300 bg-amber-50/50' : ''} ${link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
         <div className="p-3 rounded-lg bg-[#1E3A5F]/10 text-[#1E3A5F]">
            {icon}
         </div>
         <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${highlight && value > 0 ? 'text-amber-700' : ''}`}>{value}</p>
         </div>
      </Card>
   );
   
   return link ? <Link href={link}>{Content}</Link> : Content;
}
