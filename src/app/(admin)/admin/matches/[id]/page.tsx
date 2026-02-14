"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminService } from '@/services/admin';
import { internshipService } from '@/services/internship';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, ArrowLeft, Calendar, User, Building, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { DailyReport } from '@/types';

export default function AdminMatchDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        // Fetch match details via adminService (reusing getMatchDetails logic if exists or constructing manually)
        // Actually adminService might not have getMatchDetails exposed, so I'll create a dedicated fetcher or reuse logic 
        // Wait, adminService.getAllMatches gets resolved details.
        // It's inefficient to fetch ALL matches to find one.
        // I should fetch doc directly.
        // But for admin, I want company/student names.
        // I'll mimic the resolution logic.
        
        // Fetch match doc
        const matchData = await adminService.getAllMatches().then(all => all.find(m => m.id === id));
        // This is inefficient but reuses existing logic. 
        // Better: implement getMatchDetails inside this component or service.
        // Since I already updated adminService to add getMatchEvaluations, let's just fetch here for now.
        
        if (matchData) {
            setMatchDetails(matchData);
        } else {
            // Fallback: fetch directly if not found (e.g. direct link)
            // But adminService.getAllMatches fetches everything. If not there, it doesn't exist.
            // (Assuming getAllMatches works correctly).
        }

        // Fetch reports
        const reportData = await internshipService.getReports(id);
        setReports(reportData);

        // Fetch evaluations
        const evalData = await adminService.getMatchEvaluations(id);
        setEvaluations(evalData);

      } catch (error) {
        console.error("Error fetching match detail:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;
  if (!matchDetails) return <div className="p-12 text-center">マッチングが見つかりません</div>;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 hover:bg-transparent hover:text-[#1E3A5F]">
           <ArrowLeft size={16} className="mr-2" /> 一覧に戻る
        </Button>
        <div className="flex items-center gap-4 mb-2">
           <Badge variant={matchDetails.status === 'active' ? 'success' : 'outline'}>
              {matchDetails.status === 'active' ? '進行中' : matchDetails.status}
           </Badge>
           <span className="text-gray-500 text-sm">ID: {matchDetails.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-[#1E3A5F]">{matchDetails.jobTitle}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Info */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Reports Section */}
            <Card className="p-6">
               <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-[#1E3A5F]" />
                  <h2 className="text-xl font-bold text-[#1E3A5F]">日報一覧</h2>
               </div>
               
               {reports.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">日報はまだ提出されていません。</p>
               ) : (
                  <div className="space-y-4">
                     {reports.map(report => (
                        <div key={report.id} className="border-b last:border-0 pb-6 last:pb-0 space-y-3">
                           <div className="flex justify-between items-start">
                              <span className="font-bold text-lg text-[#1E3A5F]">
                                 {report.date && format(report.date.toDate(), 'yyyy/MM/dd')}
                              </span>
                           </div>
                           
                           <div className="grid gap-3">
                              {/* 業務内容 */}
                              <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                 <p className="font-bold text-sm text-gray-700 mb-1">業務内容</p>
                                 <p className="text-sm whitespace-pre-wrap">{report.content}</p>
                              </div>

                              {/* 学び・気付き */}
                              {report.learning && (
                                 <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                    <p className="font-bold text-sm text-blue-700 mb-1">学び・気付き</p>
                                    <p className="text-sm whitespace-pre-wrap">{report.learning}</p>
                                 </div>
                              )}

                              {/* 明日の目標 */}
                              {report.nextGoals && (
                                 <div className="bg-green-50 p-3 rounded border border-green-100">
                                    <p className="font-bold text-sm text-green-700 mb-1">明日の目標</p>
                                    <p className="text-sm whitespace-pre-wrap">{report.nextGoals}</p>
                                 </div>
                              )}

                              {/* 企業からのフィードバック */}
                              {report.companyComment && (
                                 <div className="bg-amber-50 p-3 rounded border border-amber-100">
                                    <p className="font-bold text-sm text-amber-700 mb-1">企業からのフィードバック</p>
                                    <p className="text-sm whitespace-pre-wrap">{report.companyComment}</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </Card>

            {/* Evaluations Section */}
            <Card className="p-6">
               <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-[#1E3A5F]" />
                  <h2 className="text-xl font-bold text-[#1E3A5F]">評価</h2>
               </div>

               {evaluations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">評価はまだ行われていません。</p>
               ) : (
                  <div className="space-y-4">
                     {evaluations.map(ev => (
                        <div key={ev.id} className="bg-gray-50 p-4 rounded-lg">
                           <div className="flex justify-between mb-2">
                              <span className="font-bold text-sm text-gray-500">
                                 {ev.fromId === matchDetails.companyId ? '企業から学生へ' : (ev.fromId === matchDetails.studentId ? '学生から企業へ' : 'その他')}
                              </span>
                              <div className="flex items-center gap-1 text-amber-500 font-bold">
                                 <span>★</span>
                                 <span>{ev.score}</span>
                              </div>
                           </div>
                           <p className="text-sm bg-white p-3 rounded border whitespace-pre-wrap">{ev.comment}</p>
                        </div>
                     ))}
                  </div>
               )}
            </Card>
         </div>

         {/* Sidebar Info */}
         <div className="space-y-6">
            <Card className="p-6">
               <h3 className="font-bold text-lg mb-4 text-[#1E3A5F]">基本情報</h3>
               <div className="space-y-4 text-sm">
                  <div>
                     <label className="text-gray-500 text-xs block">学生</label>
                     <p className="font-bold flex items-center gap-2">
                        <User size={14} /> {matchDetails.studentName}
                     </p>
                  </div>
                  <div>
                     <label className="text-gray-500 text-xs block">企業</label>
                     <p className="font-bold flex items-center gap-2">
                        <Building size={14} /> {matchDetails.companyName}
                     </p>
                  </div>
                  <div>
                     <label className="text-gray-500 text-xs block">期間</label>
                     <p className="font-bold flex items-center gap-2">
                        <Calendar size={14} /> 
                        {format(matchDetails.startDate.toDate(), 'yyyy/MM/dd')} 〜 {matchDetails.endDate ? format(matchDetails.endDate.toDate(), 'yyyy/MM/dd') : '未定'}
                     </p>
                  </div>
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
}
