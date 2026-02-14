"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, updateDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useRouter, useParams } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { notificationService } from '@/services/notification';

export default function EditJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [requirements, setRequirements] = useState('');
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string>('');

  useEffect(() => {
    async function fetchJob() {
      if (!user || !id) return;
      try {
        const docSnap = await getDoc(doc(db, 'jobPostings', id));
        if (!docSnap.exists()) {
          setError('求人が見つかりません');
          return;
        }
        const data = docSnap.data();
        if (data.companyId !== user.id && user.role !== 'admin') {
           setError('権限がありません');
           return;
        }

        setTitle(data.title || '');
        setContent(data.content || '');
        setLocation(data.location || '');
        setSalary(data.salary || '');
        setRequirements(data.requirements?.join(', ') || '');
        setFileId(data.pdfFileId || null);
        
        // existingFileName? We don't store filename in jobPosting usually, but mostly just ID.
        // We can't easily get filename from Google Drive API here without extra call.
        // We'll just show "Uploaded File" if ID exists.
        if (data.pdfFileId) {
             setExistingFileName('既存のファイル（変更しない場合はそのまま）');
        }

      } catch (err) {
        console.error("Error fetching job:", err);
        setError('読み込みエラー');
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [user, id]);

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
    if (!fileId && !confirm('PDF募集要項なしで登録しますか？')) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'jobPostings', id), {
        title,
        content,
        location,
        salary,
        requirements: requirements.split(',').map(s => s.trim()).filter(Boolean),
        pdfFileId: fileId,
        updatedAt: serverTimestamp(),
      });

      if (user.role === 'admin') {
        router.push('/admin/jobs');
      } else {
        router.push('/company/jobs');
      }
    } catch (err) {
      console.error("Error updating job:", err);
      setError('求人の更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;
  if (error) return <div className="p-12 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">求人情報の編集</h1>
        <p className="text-gray-500">求人の内容を修正します</p>
      </div>

      <Card className="p-8">
        {error && (
           <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
             <AlertCircle size={16} />
             {error}
           </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="求人タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="2026年夏インターンシップ (エンジニア職)"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input
                label="勤務地"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="東京 / リモート"
              />
              <Input
                label="給与/待遇"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="時給 1,500円 ~"
              />
          </div>

          <div>
             <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
               応募要件 / スキル (カンマ区切り)
             </label>
             <Input
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="React, TypeScript, AWS"
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
               仕事内容 (簡易版)
             </label>
             <textarea
               className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] min-h-[100px]"
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="主な業務内容..."
             />
          </div>

          {/* PDF Upload Section */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50">
             <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
               募集要項PDF (詳細)
             </label>
             
             {!file ? (
                <div className="flex flex-col items-center justify-center py-4">
                   {fileId ? (
                       <div className="flex items-center gap-2 mb-3 text-green-600">
                          <CheckCircle size={16} />
                          <span className="text-sm font-medium">登録済みPDFあり</span>
                       </div>
                   ) : null}
                   <UploadCloud className="text-gray-400 mb-2" size={32} />
                   <p className="text-xs text-gray-500 mb-4">新しいファイルをアップロードして差し替え</p>
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
            <Button type="submit" isLoading={submitting || uploading} disabled={uploading}>
              更新する
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
