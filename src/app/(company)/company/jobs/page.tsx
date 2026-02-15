"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Plus, ShieldAlert, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CompanyJobListPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyApproved, setCompanyApproved] = useState<boolean | null>(null);

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
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-6 flex flex-col sm:flex-row justify-between gap-4">
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
                  <Button variant="outline" size="sm">詳細</Button>
                </Link>
                <Link href={`/company/jobs/${job.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    <Edit size={16} />
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
