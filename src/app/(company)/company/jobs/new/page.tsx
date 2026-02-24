"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { notificationService } from '@/services/notification';

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyApproved, setCompanyApproved] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [checkingApproval, setCheckingApproval] = useState(true);
  
  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState(''); // Compatibility for existing list
  const [department, setDepartment] = useState('');
  const [nearestStation, setNearestStation] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [estimatedDaysTime, setEstimatedDaysTime] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [workFormat, setWorkFormat] = useState('対面');
  const [workFormatComment, setWorkFormatComment] = useState('');
  
  const [occupation, setOccupation] = useState('エンジニア');
  const [occupationComment, setOccupationComment] = useState('');
  const [content, setContent] = useState('');
  const [mentorSystem, setMentorSystem] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  
  const [requirements, setRequirements] = useState('');
  const [tools, setTools] = useState('');
  const [niceToHave, setNiceToHave] = useState('');
  
  const [isPaidStr, setIsPaidStr] = useState('無償');
  const [salary, setSalary] = useState('');
  const [hasTransportation, setHasTransportation] = useState(false);
  const [hasAccommodation, setHasAccommodation] = useState(false);
  const [belongings, setBelongings] = useState('');
  const [dressCode, setDressCode] = useState('');
  
  const [otherNotes, setOtherNotes] = useState('');
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);

  // Check if company is approved
  useEffect(() => {
    async function checkApproval() {
      if (!user) return;
      try {
        const companyDoc = await getDoc(doc(db, 'companies', user.id));
        if (companyDoc.exists()) {
          setCompanyApproved(companyDoc.data().isApproved === true);
          setCompanyName(companyDoc.data().name || '');
        } else {
          setCompanyApproved(false);
        }
      } catch (err) {
        console.error('Error checking company approval:', err);
        setCompanyApproved(false);
      } finally {
        setCheckingApproval(false);
      }
    }
    checkApproval();
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
         alert('PDFファイルのみアップロード可能です');
         return;
      }
      setFile(selectedFile);
      
      setUploading(true);
      setError('');
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await fetch('/api/pdf/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        
        if (data.error) {
           throw new Error(data.error);
        }
        
        if (data.fileId) {
            setFileId(data.fileId);
        } else {
            throw new Error('File ID not returned');
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        setError('PDFのアップロードに失敗しました: ' + err.message);
        setFile(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyApproved) return;
    if (!fileId && !confirm('添付資料なしで登録しますか？')) return;

    setLoading(true);
    try {
      const isPaid = isPaidStr === '有償';
      await addDoc(collection(db, 'jobPostings'), {
        companyId: user.id,
        companyName: companyName,
        title,
        location,
        department,
        nearestStation,
        periodStart,
        periodEnd,
        estimatedDaysTime,
        minCapacity,
        maxCapacity,
        workFormat,
        workFormatComment,
        occupation,
        occupationComment,
        content,
        mentorSystem,
        expectedOutput,
        requirements: requirements.split(',').map(s => s.trim()).filter(Boolean),
        tools,
        niceToHave,
        isPaid,
        salary,
        hasTransportation,
        hasAccommodation,
        belongings,
        dressCode,
        otherNotes,
        status: 'pending_approval',
        pdfFileId: fileId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify Admin
      await notificationService.createNotification(
        'admin',
        '新規求人投稿申請',
        `${companyName}から「${title}」の承認申請がありました。`,
        'system',
        '/admin/jobs'
      );

      router.push('/company/jobs');
    } catch (err) {
      console.error("Error creating job:", err);
      setError('求人の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (checkingApproval) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;
  }

  // Block unapproved companies
  if (!companyApproved) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="text-amber-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">企業承認が必要です</h1>
          <p className="text-gray-600 mb-2">
            求人を作成するには、管理者による企業アカウントの承認が必要です。
          </p>
          <p className="text-sm text-gray-400 mb-6">
            承認手続きは管理者が確認次第完了します。しばらくお待ちください。
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/company/profile">
              <Button variant="outline">企業プロフィールを確認</Button>
            </Link>
            <Link href="/company/dashboard">
              <Button variant="secondary">ダッシュボードへ</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">新規求人作成</h1>
        <p className="text-gray-500">インターンシップの募集要項を入力してください</p>
      </div>

      <Card className="p-8">
        {error && (
           <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
             <AlertCircle size={16} />
             {error}
           </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-sm text-[#1E3A5F]">
          💡 作成した求人は管理者の承認後に公開されます。
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F] border-b pb-2">基本情報</h2>
            <Input label="求人タイトル" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="2026年夏インターンシップ" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="部署・チーム名" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="開発部" />
              <Input label="就業場所 (都道府県・市区町村)" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="東京都渋谷区" />
            </div>
            <Input label="最寄駅・バス停" value={nearestStation} onChange={(e) => setNearestStation(e.target.value)} placeholder="渋谷駅 徒歩5分" />
            
            <div>
              <label className="block text-sm font-medium text-[#1A202C] mb-1.5">実施期間</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} placeholder="YYYY/MM/DD" />
                <span className="hidden sm:inline text-gray-500">〜</span>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} placeholder="YYYY/MM/DD" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="想定日数・時間" value={estimatedDaysTime} onChange={(e) => setEstimatedDaysTime(e.target.value)} placeholder="平日のうち3日以上、9時～17時など" />
              <div className="flex items-end gap-2">
                <Input label="受入人数（目安）" value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)} placeholder="1" />
                <span className="pb-3 text-sm text-gray-600 whitespace-nowrap">名 〜</span>
                <Input label="" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} placeholder="3" />
                <span className="pb-3 text-sm text-gray-600 whitespace-nowrap">名</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1.5">実施形態</label>
                <select 
                  className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
                  value={workFormat} onChange={(e) => setWorkFormat(e.target.value)}
                >
                  <option value="対面">対面</option>
                  <option value="ハイブリッド">ハイブリッド</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              {workFormat === 'その他' && (
                <Input label="実施形態（その他）" value={workFormatComment} onChange={(e) => setWorkFormatComment(e.target.value)} placeholder="詳細をご記入ください" />
              )}
            </div>
          </div>

          {/* 求人内容 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F] border-b pb-2">求人内容</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1.5">職種</label>
                <select 
                  className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
                  value={occupation} onChange={(e) => setOccupation(e.target.value)}
                >
                  <option value="エンジニア">エンジニア</option>
                  <option value="デザイナー">デザイナー</option>
                  <option value="事業企画">事業企画</option>
                  <option value="営業">営業</option>
                  <option value="マーケティング">マーケティング</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              {occupation === 'その他' && (
                <Input label="職種（その他）" value={occupationComment} onChange={(e) => setOccupationComment(e.target.value)} placeholder="詳細をご記入ください" />
              )}
            </div>
            
            <div>
               <label className="block text-sm font-medium text-[#1A202C] mb-1.5">仕事内容（概要）</label>
               <textarea
                 className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] min-h-[100px]"
                 value={content} onChange={(e) => setContent(e.target.value)} placeholder="主な業務内容..." required
               />
            </div>
            
            <Input label="受入・指導メンター体制" value={mentorSystem} onChange={(e) => setMentorSystem(e.target.value)} placeholder="例: 週1回の1on1、CTO直下" />
            <Input label="期待する成果・想定アウトプット" value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} placeholder="例: 新機能のリリース、企画書の作成" />
          </div>

          {/* 応募条件 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F] border-b pb-2">応募条件</h2>
            <Input label="必須要件（資格・スキル・知識など）(カンマ区切り)" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="React, TypeScript" />
            <Input label="使用ツール・技術" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="VSCode, Figma, Slack" />
            <Input label="歓迎要件" value={niceToHave} onChange={(e) => setNiceToHave(e.target.value)} placeholder="バックエンド開発の経験" />
          </div>

          {/* 待遇・条件 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F] border-b pb-2">待遇・条件</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1.5">報酬の有無</label>
                <select 
                  className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
                  value={isPaidStr} onChange={(e) => setIsPaidStr(e.target.value)}
                >
                  <option value="無償">無償</option>
                  <option value="有償">有償</option>
                </select>
              </div>
              {isPaidStr === '有償' && (
                <Input label="想定報酬" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="例: 時給1,500円" />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1.5">交通費の支給</label>
                <select 
                  className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
                  value={hasTransportation ? 'あり' : 'なし'} onChange={(e) => setHasTransportation(e.target.value === 'あり')}
                >
                  <option value="なし">なし</option>
                  <option value="あり">あり</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1.5">宿泊費の支給</label>
                <select 
                  className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]"
                  value={hasAccommodation ? 'あり' : 'なし'} onChange={(e) => setHasAccommodation(e.target.value === 'あり')}
                >
                  <option value="なし">なし</option>
                  <option value="あり">あり</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="持参物" value={belongings} onChange={(e) => setBelongings(e.target.value)} placeholder="PC（Mac推奨）、筆記用具" />
              <Input label="服装" value={dressCode} onChange={(e) => setDressCode(e.target.value)} placeholder="私服可" />
            </div>
          </div>

          {/* その他 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F] border-b pb-2">その他</h2>
            <div>
               <label className="block text-sm font-medium text-[#1A202C] mb-1.5">その他伝えたい事項</label>
               <textarea
                 className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] min-h-[80px]"
                 value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} placeholder="その他、学生に伝えたいことがあれば..."
               />
            </div>
          </div>

          {/* PDF Upload Section */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50">
             <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
               添付資料
             </label>
             
             {!file ? (
                <div className="flex flex-col items-center justify-center py-4">
                   <UploadCloud className="text-gray-400 mb-2" size={32} />
                   <p className="text-xs text-gray-500 mb-4">PDFファイルをドラッグ＆ドロップまたは選択</p>
                   <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                   />
                   <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('pdf-upload')?.click()}>
                     ファイルを選択
                   </Button>
                </div>
             ) : (
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                   <div className="flex items-center gap-3">
                      <FileText className="text-[#1E3A5F]" />
                      <div className="text-sm">
                         <p className="font-medium truncate max-w-[200px]">{file.name}</p>
                         <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                   </div>
                   {uploading ? (
                      <Loader2 className="animate-spin text-[#1E3A5F]" />
                   ) : fileId ? (
                      <div className="flex items-center text-[#48BB78] gap-1 text-sm font-medium">
                         <CheckCircle size={16} />
                         アップロード完了
                      </div>
                   ) : (
                      <span className="text-xs text-red-500">未完了</span>
                   )}
                </div>
             )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              キャンセル
            </Button>
            <Button type="submit" isLoading={loading || uploading} disabled={uploading}>
              求人を作成する
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
