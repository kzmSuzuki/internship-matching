"use client";

import { auth } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { JobPosting } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, MapPin, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getPendingJobs();
      setJobs(data);
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleApprove = async (jobId: string) => {
     if (!confirm('この求人を承認して公開しますか？')) return;
     setProcessing(jobId);
     try {
        await adminService.approveJob(jobId);
        // Remove from list or refresh
        setJobs(prev => prev.filter(j => j.id !== jobId));
        setSelectedJob(null);
     } catch (error) {
        console.error(error);
        alert('承認に失敗しました');
     } finally {
        setProcessing(null);
     }
  };

  const handleReject = async (jobId: string) => {
     if (!confirm('この求人を差し戻しますか？（下書き状態に戻ります）')) return;
     setProcessing(jobId);
     try {
        await adminService.rejectJob(jobId);
        setJobs(prev => prev.filter(j => j.id !== jobId));
        setSelectedJob(null);
     } catch (error) {
        console.error(error);
        alert('差し戻しに失敗しました');
     } finally {
        setProcessing(null);
     }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold text-gray-800">求人承認</h1>
         <p className="text-gray-500">承認待ちの求人が {jobs.length} 件あります</p>
       </div>

       {jobs.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
             承認待ちの求人はありません。
          </Card>
       ) : (
          <div className="grid gap-4">
             {jobs.map(job => (
                <Card key={job.id} className="p-6">
                   <div className="flex justify-between items-start">
                      <div>
                         <div className="flex items-center gap-2 mb-2">
                             <Badge variant="warning">承認待ち</Badge>
                             <span className="text-sm text-gray-500">ID: {job.id}</span>
                         </div>
                         <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                         <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                            <span className="flex items-center gap-1"><CalendarIcon size={14} /> Created: {format(job.createdAt.toDate(), 'yyyy/MM/dd HH:mm')}</span>
                         </div>
                         <div className="flex gap-2 mb-2">
                            {job.requirements.map((req, i) => (
                               <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
                            ))}
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" onClick={() => setSelectedJob(job)}>
                            詳細確認
                         </Button>
                         <Button 
                            className="bg-green-600 hover:bg-green-700"
                            isLoading={processing === job.id} 
                            onClick={() => handleApprove(job.id)}
                         >
                            承認
                         </Button>
                      </div>
                   </div>
                </Card>
             ))}
          </div>
       )}
       
       <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title="求人詳細">
          {selectedJob && (
             <div className="space-y-6">
                <div>
                   <h2 className="text-xl font-bold mb-2">{selectedJob.title}</h2>
                   <div className="flex gap-2 mb-4">
                      <Badge variant="warning">承認待ち</Badge>
                      <span className="text-xs text-gray-400 self-center">Company ID: {selectedJob.companyId}</span>
                   </div>
                </div>

                <div className="space-y-4">
                   <div>
                      <label className="text-xs text-gray-500 block mb-1">募集内容</label>
                      <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                         {selectedJob.content}
                      </div>

                      {selectedJob.pdfFileId && (
                         <div className="mt-2">
                             <a 
                                href={`/api/pdf/${selectedJob.pdfFileId}`} 
                                target="_blank" 
                                className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                             >
                                <ExternalLink size={14} /> PDFを確認する
                             </a>
                         </div>
                      )}
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                   <Button variant="danger" onClick={() => handleReject(selectedJob.id)} isLoading={processing === selectedJob.id}>
                      差し戻し
                   </Button>
                   <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(selectedJob.id)} isLoading={processing === selectedJob.id}>
                      承認して公開
                   </Button>
                </div>
             </div>
          )}
       </Modal>
    </div>
  );
}
