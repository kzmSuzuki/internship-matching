"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, MapPin, Calendar, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';

export default function CompanyJobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const router = useRouter();

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


      } catch (error) {
        console.error("Error fetching job:", error);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchData();
  }, [id, user, router]);

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/company/jobs')}>
          <ArrowLeft size={16} className="mr-1" />
          求人一覧
        </Button>
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
            <h3 className="text-sm font-bold text-gray-600 mb-2">応募要件 / スキル</h3>
            <div className="flex flex-wrap gap-2">
              {requirements.map((req, i) => (
                <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {job.content && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">仕事内容</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {job.content}
            </div>
          </div>
        )}

        {/* PDF */}
        {job.pdfFileId && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">募集要項PDF</h3>
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
    </div>
  );
}
