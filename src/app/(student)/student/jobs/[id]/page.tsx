"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { JobPosting, Company, Application } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, MapPin, Building, Calendar, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

import { matchingService } from '@/services/matching';

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [pdfUrl, setPdfUrl] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
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

        // Fetch Company (doc ID = user UID)
        try {
          const companySnap = await getDoc(doc(db, 'companies', jobData.companyId));
          if (companySnap.exists()) {
            setCompany(companySnap.data() as Company);
          }
        } catch (e) {
          console.warn('Could not fetch company:', e);
        }



        // Check for existing application (active or rejected)
        if (user) {
          const appQ = query(
            collection(db, 'applications'),
            where('studentId', '==', user.id)
          );
          const appSnap = await getDocs(appQ);
          
          if (!appSnap.empty) {
             // Find application for THIS job
             const thisJobApp = appSnap.docs.find(d => d.data().jobId === id);
             // Find ANY active application (for concurrency limit)
             const activeApp = appSnap.docs.find(d => {
                const s = d.data().status;
                return ['pending_admin', 'pending_company', 'pending_student', 'matched'].includes(s);
             });

             if (thisJobApp) {
                setExistingApp(thisJobApp.data() as Application);
             } else if (activeApp) {
                // If not applied to this job, but has another active one, store it to block apply
                setExistingApp(activeApp.data() as Application);
             }
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
    if (existingApp) {
       const status = existingApp.status;
       // If rejected for THIS job
       if (existingApp.jobId === job.id && (status.includes('rejected'))) {
          alert('この求人は不採用となったため、再応募できません。');
          return;
       }
       // If active application exists (this or other)
       if (['pending_admin', 'pending_company', 'pending_student', 'matched'].includes(status)) {
          alert('既に応募中の求人があるか、この求人に応募済みです。');
          return;
       }
    }
    
    if (!confirm('この求人に応募しますか？\n※同時に応募できるのは1件のみです。')) return;

    setApplying(true);
    try {
      await matchingService.applyJob(user.id, job.id, job.companyId, message);
      router.push('/student/applications');
    } catch (error: any) {
      console.error("Error applying:", error);
      alert('応募に失敗しました: ' + error.message);
    } finally {
      setApplying(false);
    }
  };

  const handleViewPdf = async (fileId: string) => {
    if (!auth.currentUser) return;
    setPdfLoading(prev => ({ ...prev, [fileId]: true }));
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/pdf/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('PDF取得失敗');
      const blob = await res.blob();
      setPdfUrl(prev => ({ ...prev, [fileId]: URL.createObjectURL(blob) }));
    } catch (e) {
      console.error(e);
      alert('PDFを表示できませんでした');
    } finally {
      setPdfLoading(prev => ({ ...prev, [fileId]: false }));
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!job) return <div className="text-center p-12">求人が見つかりません</div>;

  const isOwnApplication = existingApp?.jobId === job.id;
  const isRejected = isOwnApplication && existingApp?.status.includes('rejected');
  const hasActiveApplication = !!existingApp && !isRejected; // Logic used for "Other application active" warning vs "This application status"

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
                <span>{job.companyName || company?.name || '企業名不明'}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{job.createdAt?.toDate ? format(job.createdAt.toDate(), 'yyyy/MM/dd') : '-'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {job.requirements.map((req, i) => (
                <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
              ))}
            </div>
          </div>

          <div className="md:text-right">
            {isOwnApplication ? (
               <div className="flex flex-col items-end gap-2 text-warning-600">
                  {isRejected ? (
                     <Badge variant="error" className="text-lg px-4 py-2 bg-red-100 text-red-600 border-red-200">不採用</Badge>
                  ) : (
                     <Badge variant="success" className="text-lg px-4 py-2">応募済み</Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {isRejected ? '※再応募はできません。' : '※ステータスは応募履歴で確認できます。'}
                  </span>
                  {!isRejected && (
                    <span className="text-xs text-gray-500 block">
                      間違って応募した場合は<a href="mailto:internship@kamiyama.ac.jp" className="underline">internship@kamiyama.ac.jp</a>に連絡をお願いします。
                    </span>
                  )}
               </div>
            ) : hasActiveApplication ? (
              <div className="flex flex-col items-end gap-2 text-warning-600">
                 <Badge variant="warning" className="text-lg px-4 py-2 opacity-50 cursor-not-allowed">他の求人に応募中</Badge>
                 <span className="text-xs text-gray-500">
                   ※同時に応募できるのは1件のみです
                 </span>
                 <span className="text-xs font-bold text-red-500 mt-2 block">
                   間違って応募した場合はinternship@xxxx.jpに連絡をお願いします
                 </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full max-w-sm">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 text-left">
                       企業へのメッセージ (任意)
                    </label>
                    <textarea
                       className="w-full h-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] resize-none"
                       placeholder="自己PRや志望動機などを入力..."
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                    />
                 </div>
                 <Button size="lg" onClick={handleApply} isLoading={applying} className="w-full">
                   この求人に応募する
                 </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">募集要項</h2>
            
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-sm font-bold text-[#1E3A5F] mb-3">基本情報</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                  <div><span className="text-gray-500 block text-xs">職種</span>{job.occupation || '-'}{job.occupationComment ? ` (${job.occupationComment})` : ''}</div>
                  <div><span className="text-gray-500 block text-xs">部署・チーム名</span>{job.department || '-'}</div>
                  <div><span className="text-gray-500 block text-xs">就業場所</span>{job.location || '-'}</div>
                  <div><span className="text-gray-500 block text-xs">最寄駅・アクセス</span>{job.nearestStation || '-'}</div>
                  <div><span className="text-gray-500 block text-xs">実施期間</span>{job.periodStart ? `${job.periodStart}〜${job.periodEnd || ''}` : '随時'}</div>
                  <div><span className="text-gray-500 block text-xs">想定日数・時間</span>{job.estimatedDaysTime || '-'}</div>
                  <div><span className="text-gray-500 block text-xs">受入人数 (目安)</span>{job.minCapacity ? `${job.minCapacity}名〜${job.maxCapacity ? job.maxCapacity + '名' : ''}` : '定員なし'}</div>
                  <div><span className="text-gray-500 block text-xs">実施形態</span>{job.workFormat || '-'}{job.workFormatComment ? ` (${job.workFormatComment})` : ''}</div>
                </div>
              </div>

              {/* 簡単な仕事内容 */}
              <div>
                <h3 className="text-sm font-bold text-[#1E3A5F] mb-3">仕事内容・期待すること</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                   {job.content || '詳細な記載はありません。'}
                </div>
                {job.expectedOutput && (
                   <p className="text-sm mt-3"><span className="font-semibold text-gray-700">期待する成果・想定アウトプット:</span> {job.expectedOutput}</p>
                )}
                {job.mentorSystem && (
                   <p className="text-sm mt-1"><span className="font-semibold text-gray-700">メンター体制:</span> {job.mentorSystem}</p>
                )}
              </div>

              {/* 応募要件 */}
              <div>
                <h3 className="text-sm font-bold text-[#1E3A5F] mb-3">応募要件・必須スキル</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {job.requirements && job.requirements.length > 0 ? (
                    job.requirements.map((req, i) => (
                      <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
                    ))
                  ) : <span className="text-sm text-gray-500">特になし</span>}
                </div>
                {job.tools && <p className="text-sm mt-3"><span className="font-semibold text-gray-700">使用ツール:</span> {job.tools}</p>}
                {job.niceToHave && <p className="text-sm mt-1"><span className="font-semibold text-gray-700">歓迎要件:</span> {job.niceToHave}</p>}
              </div>

              {/* 待遇・条件 */}
              <div>
                <h3 className="text-sm font-bold text-[#1E3A5F] mb-3">待遇・条件</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                  <div><span className="text-gray-500 block text-xs">報酬</span>{job.isPaid ? '有償' : '無償'} {job.salary && `(${job.salary})`}</div>
                  <div><span className="text-gray-500 block text-xs">交通費・宿泊費の有無</span>交通費({job.hasTransportation ? 'あり' : 'なし'}) / 宿泊費({job.hasAccommodation ? 'あり' : 'なし'})</div>
                  <div><span className="text-gray-500 block text-xs">服装</span>{job.dressCode || '-'}</div>
                  <div className="sm:col-span-2"><span className="text-gray-500 block text-xs">持参物</span>{job.belongings || '-'}</div>
                </div>
              </div>
              
              {/* その他 */}
              {job.otherNotes && (
                <div>
                   <h3 className="text-sm font-bold text-[#1E3A5F] mb-3">その他</h3>
                   <div className="p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                      {job.otherNotes}
                   </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">添付資料</h2>
             {(job.pdfFileIds && job.pdfFileIds.length > 0) ? (
                <div className="grid gap-4">
                   {job.pdfFileIds.map((fileId, idx) => (
                      <div key={fileId} className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <div className="mb-3 text-[#1E3A5F]">
                          <ExternalLink size={32} />
                        </div>
                        <p className="text-sm text-gray-600 mb-3 font-medium">添付資料 {idx + 1}</p>
                        
                        {pdfUrl[fileId] ? (
                          <a href={pdfUrl[fileId]} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#1E3A5F] font-bold text-sm hover:bg-gray-50 transition-colors">
                            <ExternalLink size={16} /> 添付資料を確認する
                          </a>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white hover:bg-gray-50 flex items-center gap-1"
                            onClick={() => handleViewPdf(fileId)}
                            isLoading={pdfLoading[fileId]}
                          >
                            {!pdfLoading[fileId] && <ExternalLink size={14} className="mr-1" />}
                            読み込む
                          </Button>
                        )}
                      </div>
                   ))}
                </div>
             ) : job.pdfFileId ? (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="mb-4 text-[#1E3A5F]">
                    <ExternalLink size={48} />
                  </div>
                  <p className="text-gray-600 mb-4 font-medium">PDFファイルが添付されています</p>
                  
                  {pdfUrl[job.pdfFileId] ? (
                    <a href={pdfUrl[job.pdfFileId]} target="_blank" className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 rounded-lg text-[#1E3A5F] font-bold hover:bg-gray-50 transition-colors">
                      <ExternalLink size={16} /> 添付資料を確認する
                    </a>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full max-w-xs flex items-center justify-center gap-2 bg-white hover:bg-gray-50" 
                      onClick={() => handleViewPdf(job.pdfFileId!)}
                      isLoading={pdfLoading[job.pdfFileId]}
                    >
                      {!pdfLoading[job.pdfFileId] && <ExternalLink size={16} />}
                      読み込む
                    </Button>
                  )}
                </div>
             ) : (
                <div className="bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-500 p-6 border border-gray-200">
                   <AlertCircle size={24} className="mb-2 text-gray-400" />
                   <p className="font-medium text-sm">添付資料はありません</p>
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
