"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Star, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Evaluation } from '@/types';

interface InternshipEvaluationProps {
  evaluation: Evaluation | null;
  onSubmit: (score: number, comment: string) => Promise<void>;
  isSubmitting: boolean;
  userRole: 'student' | 'company';
  targetName: string; // The name of who is being evaluated (Company or Student)
}

export function InternshipEvaluation({ 
  evaluation, 
  onSubmit, 
  isSubmitting, 
  userRole, 
  targetName 
}: InternshipEvaluationProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [hoverScore, setHoverScore] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(score, comment);
  };

  // Completed View
  if (evaluation) {
    return (
      <Card className="overflow-hidden border-none shadow-lg rounded-2xl p-0">
        <div className="bg-[#1E3A5F] text-white p-5 text-center">
          <h3 className="font-bold text-lg mb-1">評価完了</h3>
          <p className="text-xs opacity-80">Thank you for your feedback!</p>
        </div>
        <div className="p-6 space-y-6 bg-white">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-bold text-xl text-gray-800">送信済み</h4>
            <p className="text-sm text-gray-500">
              {targetName} への評価を送信しました。<br/>
              ご協力ありがとうございました。
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Score</span>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={cn(
                      "w-6 h-6 fill-current transition-colors",
                      star <= evaluation.score ? "text-amber-400" : "text-gray-200"
                    )} 
                  />
                ))}
                <span className="ml-2 font-bold text-lg text-gray-700">{evaluation.score}.0</span>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comment</span>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">
                {evaluation.comment}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Input View
  return (
    <Card className="overflow-hidden border-none shadow-lg rounded-2xl p-0">
      <div className="bg-[#1E3A5F] text-white p-5 text-center">
        <h3 className="font-bold text-lg mb-1">インターンシップ評価</h3>
        <p className="text-xs opacity-80">
          {userRole === 'student' ? '企業へのフィードバックをお願いします' : '学生への最終評価を入力してください'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
        <div className="space-y-4">
          <div className="text-center">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              総合評価 (Score)
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  onMouseEnter={() => setHoverScore(star)}
                  onMouseLeave={() => setHoverScore(0)}
                  onClick={() => setScore(star)}
                >
                  <Star 
                    className={cn(
                      "w-6 h-6 fill-current transition-colors duration-200",
                      star <= (hoverScore || score) ? "text-amber-400" : "text-gray-200"
                    )} 
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-amber-600 font-medium h-5 mt-2 transition-opacity duration-200">
              {hoverScore === 5 || score === 5 ? '非常に素晴らしい' :
               hoverScore === 4 || score === 4 ? '満足している' :
               hoverScore === 3 || score === 3 ? '普通' :
               hoverScore === 2 || score === 2 ? '改善の余地あり' :
               hoverScore === 1 || score === 1 ? '不満がある' : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              コメント・フィードバック
            </label>
            <textarea
              className="w-full border-2 border-gray-100 rounded-xl p-4 min-h-[120px] focus:border-[#1E3A5F] focus:ring-0 transition-colors text-sm resize-none bg-gray-50 focus:bg-white"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              placeholder={userRole === 'student' ? 
                "学んだこと、良かった点、改善点など..." : 
                "学生の成果、取り組み姿勢へのメッセージ..."
              }
            />
          </div>
        </div>

        <div className="pt-2">
          {score === 0 ? (
            <div className="flex items-center justify-center gap-2 text-amber-600 text-xs bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
              <AlertCircle size={14} />
              <span>評価スコアを選択してください</span>
            </div>
          ) : null}
          
          <Button 
            type="submit" 
            className="w-full py-6 font-bold text-lg shadow-md hover:shadow-lg transition-all" 
            isLoading={isSubmitting} 
            disabled={score === 0 || !comment.trim()}
          >
            評価を送信する
          </Button>
          <p className="text-xs text-center text-gray-400 mt-3">
            ※ 送信後の変更はできません
          </p>
        </div>
      </form>
    </Card>
  );
}
