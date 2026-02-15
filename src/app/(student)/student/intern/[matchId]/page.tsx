"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { internshipService } from '@/services/internship';
import { Match, DailyReport, Evaluation, Company } from '@/types';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader2, Plus, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { InternshipEvaluation } from '@/components/internship/InternshipEvaluation';

export default function StudentInternshipPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Evaluation State
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evalScore, setEvalScore] = useState(0);
  const [evalComment, setEvalComment] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // New Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportContent, setReportContent] = useState('');
  const [reportLearning, setReportLearning] = useState('');
  const [reportGoals, setReportGoals] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const matchData = await internshipService.getMatch(matchId);
        if (!matchData || matchData.studentId !== user.id) {
          throw new Error('Match not found or unauthorized');
        }
        setMatch(matchData);

        // Fetch Company
        const companySnap = await getDoc(doc(db, 'companies', matchData.companyId)); // Assuming companyId is document ID for 'companies' collection in previous phases setup
        // Actually companyId matches userId. Our 'companies' collection keys are userIds.
        if (companySnap.exists()) {
             setCompany(companySnap.data() as Company);
        }

        // Fetch Reports
        const reportsData = await internshipService.getReports(matchId);
        setReports(reportsData);

        // Fetch Evaluation if completed
        if (matchData.status === 'completed') {
           const evalData = await internshipService.getEvaluation(matchId, user.id);
           setEvaluation(evalData);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [matchId, user]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !match) return;

    setSubmittingReport(true);
    try {
       await internshipService.createReport(
          user.id, 
          match.id, 
          reportContent, 
          reportLearning, 
          reportGoals, 
          new Date(reportDate)
       );
       setIsReportModalOpen(false);
       
       // Refresh reports
       const updatedReports = await internshipService.getReports(match.id);
       setReports(updatedReports);
       
       // Reset form
       setReportContent('');
       setReportLearning('');
       setReportGoals('');
    } catch (error: any) {
       console.error("Failed to create report:", error);
       
       let errorMsg = '日報の作成に失敗しました';
       if (error.code === 'permission-denied') {
          errorMsg = '権限がありません。管理者にお問い合わせください。';
          // Additional logging for debugging permission issues
          console.error("Permission context:", { 
             uid: user.id, 
             role: user.role, 
             matchStudentId: match.studentId,
             reportDate: reportDate 
          });
       } else if (error.message) {
          errorMsg += `: ${error.message}`;
       }
       
       alert(errorMsg);
    } finally {
       setSubmittingReport(false);
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !match || !company) return;
     
     if (!confirm('評価を送信しますか？送信後は変更できません。')) return;

     setSubmittingEval(true);
     try {
        await internshipService.submitEvaluation(match.id, user.id, company.userId, evalScore, evalComment);
        const evalData = await internshipService.getEvaluation(match.id, user.id);
        setEvaluation(evalData);
     } catch (error) {
        console.error(error);
        alert('評価の送信に失敗しました');
     } finally {
        setSubmittingEval(false);
     }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!match) return <div className="p-12 text-center">データが見つかりません</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex justify-between items-center bg-[#1E3A5F] text-white p-6 rounded-xl shadow-lg">
          <div>
             <h1 className="text-xl font-bold mb-1">{company?.name} インターンシップ</h1>
             <p className="text-sm opacity-90">
                期間: {match.startDate ? format(match.startDate.toDate(), 'yyyy/MM/dd') : '-'}
                {match.endDate ? ` ~ ${format(match.endDate.toDate(), 'yyyy/MM/dd')}` : ' ~ 進行中'}
             </p>
          </div>
          {match.status === 'active' ? (
             <Badge variant="success" className="bg-[#48BB78] text-white border-none">進行中</Badge> 
          ) : (
             <Badge variant="outline" className="text-white border-white">完了</Badge>
          )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content: Reports */}
          <div className="md:col-span-2 space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1E3A5F]">日報一覧</h2>
                {match.status === 'active' && (
                  <Button size="sm" onClick={() => setIsReportModalOpen(true)}>
                     <Plus size={16} className="mr-1" />
                     日報を書く
                  </Button>
                )}
             </div>

             {reports.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                   まだ日報がありません。
                </Card>
             ) : (
                <div className="space-y-4">
                   {reports.map(report => (
                      <Card key={report.id} className="p-5">
                         <div className="flex items-center gap-2 mb-3 border-b pb-2">
                            <CalendarIcon size={16} className="text-gray-400" />
                            <span className="font-bold text-[#1E3A5F]">
                               {format(report.date.toDate(), 'yyyy/MM/dd')}
                            </span>
                         </div>
                         <div className="space-y-3">
                            <div>
                               <label className="text-xs text-gray-400 block">業務内容</label>
                               <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.content}</p>
                            </div>
                            <div>
                               <label className="text-xs text-gray-400 block">学んだこと</label>
                               <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.learning}</p>
                            </div>
                            <div>
                               <label className="text-xs text-gray-400 block">明日の目標</label>
                               <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.nextGoals}</p>
                            </div>
                            
                            {report.companyComment && (
                               <div className="bg-blue-50 p-3 rounded-lg mt-2 text-sm">
                                  <div className="flex items-center gap-1 text-blue-800 font-bold mb-1">
                                     <MessageSquare size={14} />
                                     企業からのコメント
                                  </div>
                                  <p className="text-blue-900">{report.companyComment}</p>
                               </div>
                            )}
                         </div>
                      </Card>
                   ))}
                </div>
             )}
          </div>
          
          {/* Sidebar: Evaluation or Status */}
          <div className="space-y-6">
             {match.status === 'completed' && (
                <InternshipEvaluation
                  evaluation={evaluation}
                  onSubmit={async (score, comment) => {
                    if (!user || !match || !company) return;
                    if (!confirm('評価を送信しますか？送信後は変更できません。')) return;

                    setSubmittingEval(true);
                    try {
                       await internshipService.submitEvaluation(match.id, user.id, company.userId, score, comment);
                       const evalData = await internshipService.getEvaluation(match.id, user.id);
                       setEvaluation(evalData);
                    } catch (error) {
                       console.error(error);
                       alert('評価の送信に失敗しました');
                    } finally {
                       setSubmittingEval(false);
                    }
                  }}
                  isSubmitting={submittingEval}
                  userRole="student"
                  targetName={company?.name || '企業'}
                />
             )}
          </div>
       </div>

       {/* Report Modal */}
       <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="日報の作成">
          <form onSubmit={handleCreateReport} className="space-y-4">
             <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <Input 
                   type="date" 
                   value={reportDate} 
                   onChange={e => setReportDate(e.target.value)} 
                   required
                />
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">業務内容</label>
                <textarea
                   className="w-full border rounded p-2 min-h-[80px]"
                   value={reportContent}
                   onChange={e => setReportContent(e.target.value)}
                   required
                   placeholder="今日行ったタスク..."
                />
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">学んだこと</label>
                <textarea
                   className="w-full border rounded p-2 min-h-[80px]"
                   value={reportLearning}
                   onChange={e => setReportLearning(e.target.value)}
                   required
                   placeholder="気づきや学び..."
                />
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">明日の目標</label>
                <textarea
                   className="w-full border rounded p-2 min-h-[60px]"
                   value={reportGoals}
                   onChange={e => setReportGoals(e.target.value)}
                   required
                   placeholder="次にやること..."
                />
             </div>
             <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsReportModalOpen(false)}>キャンセル</Button>
                <Button type="submit" isLoading={submittingReport}>保存する</Button>
             </div>
          </form>
       </Modal>
    </div>
  );
}
