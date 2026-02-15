"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { internshipService } from '@/services/internship';
import { Match, DailyReport, Evaluation, Student } from '@/types';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Calendar as CalendarIcon, CheckCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { InternshipEvaluation } from '@/components/internship/InternshipEvaluation';

export default function CompanyInternshipPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Evaluation State
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evalScore, setEvalScore] = useState(0);
  const [evalComment, setEvalComment] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // Comment State
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const matchData = await internshipService.getMatch(matchId);
        if (!matchData || matchData.companyId !== user.id) {
          throw new Error('Match not found or unauthorized');
        }
        setMatch(matchData);

        // Fetch Student
        const studentSnap = await getDoc(doc(db, 'students', matchData.studentId));
        if (studentSnap.exists()) {
           setStudent(studentSnap.data() as Student);
        } else {
           setStudent({ name: 'Unknown', userId: matchData.studentId } as Student);
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

  const handleCompleteInternship = async () => {
     if (!match) return;
     if (!confirm('このインターンシップを終了しますか？\n終了すると、学生への評価が可能になります。')) return;
     
     try {
        await internshipService.completeInternship(match.id);
        const updatedMatch = await internshipService.getMatch(match.id);
        setMatch(updatedMatch);
     } catch (error) {
        console.error(error);
        alert('ステータス更新に失敗しました');
     }
  };

  const handleAddComment = async (reportId: string) => {
     if (!commentText) return;
     
     setSubmittingComment(true);
     try {
        await internshipService.addCompanyComment(reportId, commentText);
        
        // Refresh reports
        if (match) {
           const updatedReports = await internshipService.getReports(match.id);
           setReports(updatedReports);
        }
        
        setCommentingId(null);
        setCommentText('');
     } catch (error) {
        console.error(error);
        alert('コメントの送信に失敗しました');
     } finally {
        setSubmittingComment(false);
     }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !match || !student) return;
     
     if (!confirm('評価を送信しますか？送信後は変更できません。')) return;

     setSubmittingEval(true);
     try {
        await internshipService.submitEvaluation(match.id, user.id, student.userId, evalScore, evalComment);
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
             <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{student?.name}</h1>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{student?.university}</span>
             </div>
             <p className="text-sm opacity-90">
                期間: {match.startDate ? format(match.startDate.toDate(), 'yyyy/MM/dd') : '-'}
                {match.endDate ? ` ~ ${format(match.endDate.toDate(), 'yyyy/MM/dd')}` : ' ~ 進行中'}
             </p>
          </div>
          <div>
            {match.status === 'active' ? (
               <div className="flex items-center gap-4">
                  <Badge variant="success" className="bg-[#48BB78] text-white border-none">進行中</Badge>
                  <Button 
                     size="sm" 
                     className="bg-white text-[#1E3A5F] hover:bg-white/90"
                     onClick={handleCompleteInternship}
                  >
                     <CheckCircle size={16} className="mr-1" />
                     インターンを終了する
                  </Button>
               </div>
            ) : (
               <Badge variant="outline" className="text-white border-white">完了</Badge>
            )}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content: Reports */}
          <div className="md:col-span-2 space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1E3A5F]">日報一覧</h2>
             </div>

             {reports.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                   まだ日報が提出されていません。
                </Card>
             ) : (
                <div className="space-y-4">
                   {reports.map((report) => (
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

                            {/* Comment Section */}
                            <div className="bg-gray-50 p-3 rounded-lg mt-2 border border-gray-100">
                               {report.companyComment ? (
                                  <>
                                    <div className="flex items-center gap-1 text-blue-800 font-bold mb-1 text-xs">
                                       <MessageSquare size={12} />
                                       フィードバック済み
                                    </div>
                                    <p className="text-sm text-blue-900">{report.companyComment}</p>
                                  </>
                               ) : (
                                  commentingId === report.id ? (
                                     <div className="space-y-2">
                                        <textarea 
                                           className="w-full text-sm border rounded p-2"
                                           value={commentText}
                                           onChange={e => setCommentText(e.target.value)}
                                           placeholder="フィードバックを入力..."
                                        />
                                        <div className="flex justify-end gap-2">
                                           <Button size="sm" variant="secondary" onClick={() => setCommentingId(null)}>キャンセル</Button>
                                           <Button size="sm" onClick={() => handleAddComment(report.id)} isLoading={submittingComment}>送信</Button>
                                        </div>
                                     </div>
                                  ) : (
                                     <Button 
                                       size="sm" 
                                       variant="outline" 
                                       className="w-full text-xs text-gray-500 hover:text-[#1E3A5F]"
                                       onClick={() => { setCommentingId(report.id); setCommentText(''); }}
                                     >
                                        + フィードバックを書く
                                     </Button>
                                  )
                               )}
                            </div>
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
                    if (!user || !match || !student) return;
                    if (!confirm('評価を送信しますか？送信後は変更できません。')) return;

                    setSubmittingEval(true);
                    try {
                       await internshipService.submitEvaluation(match.id, user.id, student.userId, score, comment);
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
                  userRole="company"
                  targetName={student?.name || '学生'}
                />
             )}
          </div>
       </div>
    </div>
  );
}
