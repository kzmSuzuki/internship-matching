"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { adminService } from '@/services/admin';
import { JobPosting } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, MapPin, ExternalLink, Calendar as CalendarIcon, Building, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';

interface JobWithCompanyName extends JobPosting {
  resolvedCompanyName?: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobWithCompanyName[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithCompanyName | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'published' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllJobs();
      
      // Resolve company names for jobs that don't have companyName
      const jobsWithNames = await Promise.all(data.map(async (job) => {
        if (job.companyName) {
          return { ...job, resolvedCompanyName: job.companyName };
        }
        // Fallback: fetch from companies collection
        try {
          const companySnap = await getDoc(doc(db, 'companies', job.companyId));
          const name = companySnap.exists() ? companySnap.data().name : job.companyId;
          return { ...job, resolvedCompanyName: name };
        } catch {
          return { ...job, resolvedCompanyName: job.companyId };
        }
      }));
      
      setJobs(jobsWithNames);
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
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'published' } : j));
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
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'draft' } : j));
        setSelectedJob(null);
     } catch (error) {
        console.error(error);
        alert('差し戻しに失敗しました');
     } finally {
        setProcessing(null);
     }
  };

  const handleViewPdf = async (fileId: string) => {
    // Open window immediately to bypass popup blocker
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.write('<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">Loading PDF...</div>');
    }

    setProcessing(`pdf-${fileId}`);
    try {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      
      const res = await fetch(`/api/pdf/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'PDFの取得に失敗しました');
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      if (newWindow) {
          newWindow.location.href = url;
      } else {
          window.open(url, '_blank');
      }
    } catch (e: any) {
      console.error(e);
      if (newWindow) newWindow.close();
      alert('PDFを表示できませんでした: ' + e.message);
    } finally {
       setProcessing(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('この求人を削除してもよろしいですか？取り消せません。')) return;
    try {
      await deleteDoc(doc(db, 'jobPostings', jobId));
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (error) {
       console.error("Delete error:", error);
       alert('削除に失敗しました');
    }
  };


  const filteredJobs = jobs.filter(job => {
    // @ts-ignore
    const isDeleted = job.isDeleted === true;

    // Status filter
    if (filter === 'pending') {
      if (isDeleted) return false;
      if (job.status !== 'pending_approval') return false;
    } else if (filter === 'published') {
      if (isDeleted) return false;
      if (job.status !== 'published') return false;
    }
    
    // Search term filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      const matchesTitle = job.title.toLowerCase().includes(lowerTerm);
      const matchesCompany = job.resolvedCompanyName?.toLowerCase().includes(lowerTerm) || false;
      const matchesLocation = job.location.toLowerCase().includes(lowerTerm);
      return matchesTitle || matchesCompany || matchesLocation;
    }
    
    return true;
  });

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">求人管理</h1>
            <p className="text-gray-500">全ての求人を管理・承認できます</p>
         </div>
         <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <input
               type="text"
               placeholder="求人名・企業名・場所で検索..."
               className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex bg-gray-100 p-1 rounded-lg self-start">
               <button 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFilter('pending')}
               >
                  承認待ち
               </button>
               <button 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'published' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFilter('published')}
               >
                  公開中
               </button>
               <button 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFilter('all')}
               >
                  すべて
               </button>
            </div>
         </div>
       </div>

       {filteredJobs.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
             該当する求人はありません。
          </Card>
       ) : (
          <div className="grid gap-4">
             {filteredJobs.map(job => {
                 // @ts-ignore
                 const isDeleted = job.isDeleted === true;
                 return (
                    <Card key={job.id} className={`p-6 ${isDeleted ? '!bg-gray-300 !border-gray-400 !shadow-none !backdrop-blur-none' : ''}`}>
                       <div className="flex justify-between items-start">
                          <div>
                             <div className="flex items-center gap-2 mb-2">
                                 {job.status === 'pending_approval' && <Badge variant="warning">承認待ち</Badge>}
                                 {job.status === 'published' && <Badge variant="success">公開中</Badge>}
                                 {job.status === 'draft' && <Badge variant="outline">下書き</Badge>}
                                 {job.status === 'closed' && <Badge variant="error" className="bg-gray-100 text-gray-500">終了</Badge>}
                             </div>
                             <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                               {job.title}
                               {/* @ts-ignore */}
                               {isDeleted && <Badge variant="danger" className="text-xs">削除済み</Badge>}
                             </h3>
                         <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                            <span className="flex items-center gap-1">
                              <Building size={14} className="text-[#1E3A5F]" /> {job.resolvedCompanyName}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={14} /> {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon size={14} /> {job.createdAt?.toDate ? format(job.createdAt.toDate(), 'yyyy/MM/dd HH:mm') : '-'}
                            </span>
                         </div>
                         <div className="flex gap-2 mb-2">
                            {job.requirements.map((req, i) => (
                               <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
                            ))}
                         </div>
                      </div>
                      <div className="flex gap-2">
                          <Link href={`/company/jobs/${job.id}/edit`}><Button variant="secondary" size="sm" className="px-3"><Edit size={16} /></Button></Link> <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 px-3" onClick={() => handleDelete(job.id)}><Trash2 size={16} /></Button>
                         <Button variant="outline" onClick={() => setSelectedJob(job)}>
                            詳細確認
                         </Button>
                         {job.status === 'pending_approval' && (
                            <Button 
                                className="bg-[#1E3A5F] hover:bg-[#16304F]"
                                isLoading={processing === job.id} 
                                onClick={() => handleApprove(job.id)}
                            >
                                承認
                            </Button>
                         )}
                      </div>
                   </div>
                </Card>
             ); })}
          </div>
       )}
       
       <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title="求人詳細">
          {selectedJob && (
             <div className="space-y-6">
                <div>
                   <h2 className="text-xl font-bold mb-2">{selectedJob.title}</h2>
                   <div className="flex gap-2 mb-4 items-center">
                      {selectedJob.status === 'pending_approval' && <Badge variant="warning">承認待ち</Badge>}
                      {selectedJob.status === 'published' && <Badge variant="success">公開中</Badge>}
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Building size={14} className="text-[#1E3A5F]" />
                        {selectedJob.resolvedCompanyName}
                      </span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                   <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-xs text-gray-400 block mb-1">勤務地</label>
                      <p className="flex items-center gap-1"><MapPin size={14} /> {selectedJob.location}</p>
                   </div>
                   {selectedJob.salary && (
                     <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs text-gray-400 block mb-1">給与/待遇</label>
                        <p>{selectedJob.salary}</p>
                     </div>
                   )}
                </div>

                {selectedJob.requirements.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">応募要件</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.requirements.map((req, i) => (
                        <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                   <label className="text-xs text-gray-500 block mb-1">募集内容</label>
                   <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                      {selectedJob.content || '（テキスト説明なし）'}
                   </div>

                   {selectedJob.pdfFileId && (
                      <div className="mt-4 border-t pt-4">
                          <Button 
                             onClick={() => handleViewPdf(selectedJob.pdfFileId!)}
                             variant="secondary"
                             className="w-full flex justify-center items-center gap-2"
                             isLoading={processing === `pdf-${selectedJob.pdfFileId}`}
                          >
                             <ExternalLink size={16} /> 募集要項PDFを確認する
                          </Button>
                      </div>
                   )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                   {selectedJob.status === 'pending_approval' && (
                     <>
                       <Button variant="outline" className="text-[#F56565] border-[#F56565] hover:bg-[#F56565]/10" onClick={() => handleReject(selectedJob.id)} isLoading={processing === selectedJob.id}>
                          差し戻し
                       </Button>
                       <Button className="bg-[#1E3A5F] hover:bg-[#16304F]" onClick={() => handleApprove(selectedJob.id)} isLoading={processing === selectedJob.id}>
                          承認して公開
                       </Button>
                     </>
                   )}
                   {selectedJob.status === 'published' && (
                      <Button variant="outline" onClick={() => setSelectedJob(null)}>
                         閉じる
                      </Button>
                   )}
                   {/* Handle other statuses if needed */}
                </div>
             </div>
          )}
       </Modal>
    </div>
  );
}
