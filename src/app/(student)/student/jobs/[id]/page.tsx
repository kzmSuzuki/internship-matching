"use client";

import { use, useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting, Company, Application } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, MapPin, Building, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

import { matchingService } from '@/services/matching';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Job
        const jobSnap = await getDoc(doc(db, 'jobPostings', id));
        if (!jobSnap.exists()) {
          setLoading(false);
          return;
        }
        const jobData = jobSnap.data() as JobPosting;
        setJob({ ...jobData, id: jobSnap.id });

        // Fetch Company
        const companyQ = query(collection(db, 'companies'), where('userId', '==', jobData.companyId));
        const companySnap = await getDocs(companyQ);
        if (!companySnap.empty) {
          setCompany(companySnap.docs[0].data() as Company);
        }

        // Fetch PDF URL if fileId exists (Using GAS API)
        if (jobData.pdfFileId) {
           // TODO: Implement actual GAS API call via Next.js API Route for security or direct
           // For prototype, we use the GAS Web App URL directly or via a proxy route
           // Ideally: /api/pdf/[fileId] -> fetches base64 -> renders
           // Here we construct the URL to our internal API Route
           setPdfUrl(`/api/pdf/${jobData.pdfFileId}`);
        }

        // Check for existing application
        if (user) {
          const appQ = query(
            collection(db, 'applications'),
            where('studentId', '==', user.id),
            where('status', 'in', ['pending_admin', 'pending_company', 'pending_student', 'matched'])
          );
          const appSnap = await getDocs(appQ);
          if (!appSnap.empty) {
             setExistingApp(appSnap.docs[0].data() as Application);
          }
        }

      } catch (error) {
        console.error("Error fetching job details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, user]);

  const handleApply = async () => {
    if (!user || !job) return;
    // Check for existing active applications (Client side pre-check)
    if (existingApp && ['pending_admin', 'pending_company', 'pending_student', 'matched'].includes(existingApp.status)) {
         alert('既に応募中の求人があります。新たな応募はできません。');
         return;
    }
    
    if (!confirm('この求人に応募しますか？\n※同時に応募できるのは1件のみです。')) return;

    setApplying(true);
    try {
      await matchingService.applyJob(user.id, job.id, job.companyId, '応募しました');
      router.push('/student/applications');
    } catch (error: any) {
      console.error("Error applying:", error);
      alert('応募に失敗しました: ' + error.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!job) return <div className="text-center p-12">求人が見つかりません</div>;

  const isOwnApplication = existingApp?.jobId === job.id;
  const hasActiveApplication = !!existingApp;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <Card className="p-8">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">{job.title}</h1>
            <div className="flex items-center gap-4 text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Building size={16} />
                <span>{company?.name || '企業名不明'}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{job.createdAt ? format(job.createdAt.toDate(), 'yyyy/MM/dd') : '-'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {job.requirements.map((req, i) => (
                <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
              ))}
            </div>
          </div>

          <div className="md:text-right">
            {hasActiveApplication ? (
              <div className="flex flex-col items-end gap-2 text-warning-600">
                {isOwnApplication ? (
                   <Badge variant="success" className="text-lg px-4 py-2">応募済み</Badge>
                ) : (
                   <Badge variant="warning" className="text-lg px-4 py-2 opacity-50 cursor-not-allowed">他の求人に応募中</Badge>
                )}
                <span className="text-xs text-gray-500">
                  ※同時に応募できるのは1件のみです
                </span>
              </div>
            ) : (
              <Button size="lg" onClick={handleApply} isLoading={applying}>
                この求人に応募する
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* PDF / Content Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">募集要項 (PDF)</h2>
             {pdfUrl ? (
                <div className="aspect-[1/1.4] w-full bg-gray-100 rounded-lg flex items-center justify-center border">
                  <iframe 
                    src={pdfUrl} 
                    className="w-full h-full rounded-lg"
                    title="Job PDF"
                  />
                </div>
             ) : (
                <div className="aspect-[1/1.4] w-full bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-400">
                   <AlertCircle size={48} className="mb-2" />
                   <p>PDFファイルがありません</p>
                </div>
             )}
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">企業情報</h2>
              <div className="space-y-3 text-sm">
                 <div>
                   <label className="text-gray-500 text-xs block">業界</label>
                   <p>{company?.industry || '-'}</p>
                 </div>
                 <div>
                   <label className="text-gray-500 text-xs block">住所</label>
                   <p>{company?.address || '-'}</p>
                 </div>
                 <div>
                   <label className="text-gray-500 text-xs block">Webサイト</label>
                   <a href={company?.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                     {company?.website || '-'}
                   </a>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
