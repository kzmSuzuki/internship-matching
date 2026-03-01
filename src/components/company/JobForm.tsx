"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UploadCloud, FileText, CheckCircle, Loader2, Eye, ExternalLink } from 'lucide-react';
import { auth } from '@/lib/firebase';

export interface JobFormData {
  title: string;
  location: string;
  department: string;
  nearestStation: string;
  periodStart: string;
  periodEnd: string;
  estimatedDaysTime: string;
  minCapacity: string;
  maxCapacity: string;
  workFormat: string;
  workFormatComment: string;
  occupation: string;
  occupationComment: string;
  content: string;
  mentorSystem: string;
  expectedOutput: string;
  requirements: string[];
  tools: string;
  niceToHave: string;
  isPaid: boolean;
  salary: string;
  hasTransportation: boolean;
  hasAccommodation: boolean;
  belongings: string;
  dressCode: string;
  otherNotes: string;
  pdfFileIds: string[];
}

interface JobFormProps {
  initialData?: Partial<JobFormData>;
  initialFiles?: {name: string, id: string}[]; // To show existing files
  onSubmit: (data: JobFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
  allowPublishChoice?: boolean; // If true, determines status
}

export function JobForm({ initialData, initialFiles = [], onSubmit, onCancel, loading = false, submitLabel = "保存する" }: JobFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [nearestStation, setNearestStation] = useState(initialData?.nearestStation || '');
  const [periodStart, setPeriodStart] = useState(initialData?.periodStart || '');
  const [periodEnd, setPeriodEnd] = useState(initialData?.periodEnd || '');
  const [estimatedDaysTime, setEstimatedDaysTime] = useState(initialData?.estimatedDaysTime || '');
  const [minCapacity, setMinCapacity] = useState(initialData?.minCapacity || '');
  const [maxCapacity, setMaxCapacity] = useState(initialData?.maxCapacity || '');
  const [workFormat, setWorkFormat] = useState(initialData?.workFormat || '対面');
  const [workFormatComment, setWorkFormatComment] = useState(initialData?.workFormatComment || '');
  
  const [occupation, setOccupation] = useState(initialData?.occupation || 'エンジニア');
  const [occupationComment, setOccupationComment] = useState(initialData?.occupationComment || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [mentorSystem, setMentorSystem] = useState(initialData?.mentorSystem || '');
  const [expectedOutput, setExpectedOutput] = useState(initialData?.expectedOutput || '');
  
  const [requirements, setRequirements] = useState(initialData?.requirements?.join(', ') || '');
  const [tools, setTools] = useState(initialData?.tools || '');
  const [niceToHave, setNiceToHave] = useState(initialData?.niceToHave || '');
  
  const [isPaidStr, setIsPaidStr] = useState(initialData?.isPaid ? '有償' : '無償');
  const [salary, setSalary] = useState(initialData?.salary || '');
  const [hasTransportation, setHasTransportation] = useState(initialData?.hasTransportation || false);
  const [hasAccommodation, setHasAccommodation] = useState(initialData?.hasAccommodation || false);
  const [belongings, setBelongings] = useState(initialData?.belongings || '');
  const [dressCode, setDressCode] = useState(initialData?.dressCode || '');
  
  const [otherNotes, setOtherNotes] = useState(initialData?.otherNotes || '');
  
  const [files, setFiles] = useState<{file: File | null, id: string | null, name: string}[]>(
    initialFiles.map(f => ({ file: null, id: f.id, name: f.name }))
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [pdfUrl, setPdfUrl] = useState<Record<string, string>>({});

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(f => {
         if (f.type !== 'application/pdf') {
            alert(`${f.name}はPDFファイルではありません`);
            return false;
         }
         return true;
      });

      if (validFiles.length === 0) return;

      const newFileObjs = validFiles.map(f => ({ file: f, id: null, name: f.name }));
      setFiles(prev => [...prev, ...newFileObjs]);
      
      setUploading(true);
      setError('');

      for (const obj of newFileObjs) {
        try {
          const formData = new FormData();
          formData.append('file', obj.file!);

          const res = await fetch('/api/pdf/upload', {
            method: 'POST',
            body: formData,
          });
          
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          
          if (data.fileId) {
             setFiles(prev => prev.map(f => f.file === obj.file ? { ...f, id: data.fileId } : f));
          } else {
             throw new Error('File ID not returned');
          }
        } catch (err: any) {
          console.error('Upload error:', err);
          setError(`PDFのアップロードに失敗しました(${obj.name}): ` + err.message);
        }
      }
      setUploading(false);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 && !confirm('添付資料なしで登録しますか？')) return;

    const data: JobFormData = {
      title, location, department, nearestStation, periodStart, periodEnd,
      estimatedDaysTime, minCapacity, maxCapacity, workFormat, workFormatComment,
      occupation, occupationComment, content, mentorSystem, expectedOutput,
      requirements: requirements.split(',').map(s => s.trim()).filter(Boolean),
      tools, niceToHave, isPaid: isPaidStr === '有償', salary,
      hasTransportation, hasAccommodation, belongings, dressCode,
      otherNotes,
      pdfFileIds: files.filter(f => f.id).map(f => f.id as string)
    };
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
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

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#1E3A5F] border-b pb-2">応募条件</h2>
        <Input label="必須要件（資格・スキル・知識など）(カンマ区切り)" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="React, TypeScript" />
        <Input label="使用ツール・技術" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="VSCode, Figma, Slack" />
        <Input label="歓迎要件" value={niceToHave} onChange={(e) => setNiceToHave(e.target.value)} placeholder="バックエンド開発の経験" />
      </div>

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

      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50">
         <label className="block text-sm font-medium text-[#1E3A5F] mb-2">添付資料 (複数可)</label>
         <div className="flex flex-col items-center justify-center py-4 mb-4">
            <UploadCloud className="text-gray-400 mb-2" size={32} />
            <input 
               type="file" 
               accept="application/pdf"
               onChange={handleFileChange}
               className="hidden"
               id="pdf-upload"
               multiple
            />
            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('pdf-upload')?.click()}>
              ファイルを追加する
            </Button>
         </div>

         {files.length > 0 && (
            <div className="space-y-2 mt-4">
               {files.map((fileObj, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                     <div className="flex items-center gap-3">
                        <FileText className="text-[#1E3A5F]" />
                        <div className="text-sm">
                           <p className="font-medium truncate max-w-[200px]">{fileObj.name}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                       {fileObj.id && (
                          pdfUrl[fileObj.id] ? (
                             <a href={pdfUrl[fileObj.id]} target="_blank" className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1 border-r pr-3 border-gray-200">
                                <ExternalLink size={14} /> ファイルを開く
                             </a>
                          ) : (
                             <button 
                                type="button" 
                                className="text-sm text-[#1E3A5F] font-medium hover:underline flex items-center gap-1 border-r pr-3 border-gray-200 disabled:opacity-50"
                                onClick={() => handleViewPdf(fileObj.id!)}
                                disabled={pdfLoading[fileObj.id]}
                             >
                                {pdfLoading[fileObj.id] ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                                内容を確認
                             </button>
                          )
                       )}
                       {fileObj.id ? (
                          <div className="flex items-center text-[#48BB78] gap-1 text-sm font-medium">
                             <CheckCircle size={16} />完了
                          </div>
                       ) : uploading ? (
                          <Loader2 className="animate-spin text-[#1E3A5F]" />
                       ) : (
                          <span className="text-xs text-red-500">失敗</span>
                       )}
                       <button type="button" className="text-red-500 text-xs hover:underline ml-2" onClick={() => removeFile(idx)}>削除</button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" isLoading={loading || uploading} disabled={uploading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
