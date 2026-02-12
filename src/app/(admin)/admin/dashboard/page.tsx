"use client";

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { Card } from '@/components/ui/Card';
import { Loader2, Users, Building, Briefcase, FileText, CheckCircle } from 'lucide-react';
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
       <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<Building />} label="登録企業数" value={stats?.totalCompanies} color="bg-blue-500" />
          <StatCard icon={<Users />} label="登録学生数" value={stats?.totalUsers} color="bg-indigo-500" />
          <StatCard icon={<CheckCircle />} label="マッチング成立数" value={stats?.totalMatches} color="bg-green-500" />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2">
                   <Briefcase size={20} className="text-orange-500" />
                   求人の状況
                </h3>
                <Link href="/admin/jobs" className="text-sm text-blue-600 hover:underline">すべて見る</Link>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                   <span className="block text-2xl font-bold text-orange-600">{stats?.pendingJobs}</span>
                   <span className="text-xs text-orange-800 font-bold">承認待ち</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                   <span className="block text-2xl font-bold text-gray-600">{stats?.activeJobs}</span>
                   <span className="text-xs text-gray-500">公開中</span>
                </div>
             </div>
          </Card>

          <Card className="p-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2">
                   <FileText size={20} className="text-purple-500" />
                   応募の状況
                </h3>
                <Link href="/admin/applications" className="text-sm text-blue-600 hover:underline">すべて見る</Link>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                   <span className="block text-2xl font-bold text-purple-600">{stats?.pendingApplications}</span>
                   <span className="text-xs text-purple-800 font-bold">管理者承認待ち</span>
                </div>
             </div>
          </Card>
       </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
   return (
      <Card className="p-6 flex items-center gap-4">
         <div className={`p-3 rounded-lg text-white ${color}`}>
            {icon}
         </div>
         <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
         </div>
      </Card>
   );
}
