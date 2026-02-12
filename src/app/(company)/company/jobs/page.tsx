"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CompanyJobListPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'jobPostings'),
          where('companyId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobPosting)));
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">公開中</Badge>;
      case 'pending_approval':
        return <Badge variant="warning">承認待ち for Admin</Badge>;
      case 'draft':
        return <Badge variant="outline">下書き</Badge>;
      case 'closed':
        return <Badge variant="error" className="bg-gray-100 text-gray-500">終了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">求人管理</h1>
          <p className="text-gray-500">作成した求人の確認と編集ができます</p>
        </div>
        <Link href="/company/jobs/new">
          <Button>
            <Plus size={18} className="mr-2" />
            新規求人作成
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <p>まだ求人がありません。</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-6 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <h3 className="text-lg font-bold text-[#1E3A5F]">{job.title}</h3>
                   {getStatusBadge(job.status)}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                   {format(job.createdAt.toDate(), 'yyyy/MM/dd')} 作成
                </p>
                <div className="flex gap-2">
                  {job.requirements.slice(0, 3).map((req, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-gray-50">{req}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Edit functionality would go here (Phase X) */}
                <Button variant="outline" size="sm" disabled>詳細・編集</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
