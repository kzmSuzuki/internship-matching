"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // Simple text for now
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [requirements, setRequirements] = useState(''); // Comma separated
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
         alert('PDFファイルのみアップロード可能です');
         return;
      }
      setFile(selectedFile);
      
      // Auto upload
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

    setLoading(true);
    try {
      await addDoc(collection(db, 'jobPostings'), {
        companyId: user.id,
        title,
        content,
        location,
        salary,
        requirements: requirements.split(',').map(s => s.trim()).filter(Boolean),
        status: 'pending_approval', // Default status waiting for Admin
        pdfFileId: fileId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push('/company/jobs');
    } catch (err) {
      console.error("Error creating job:", err);
      setError('求人の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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
