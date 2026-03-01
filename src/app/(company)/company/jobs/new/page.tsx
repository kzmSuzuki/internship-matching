"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { notificationService } from '@/services/notification';
import { JobForm, JobFormData } from '@/components/company/JobForm';

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyApproved, setCompanyApproved] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [checkingApproval, setCheckingApproval] = useState(true);

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

  const handleSubmit = async (data: JobFormData) => {
    if (!user || !companyApproved) return;
    
    // confirmPublish could be added to JobForm, but for simplicity assuming 'pending_approval'
    setLoading(true);
    try {
      await addDoc(collection(db, 'jobPostings'), {
        companyId: user.id,
        companyName: companyName,
        ...data,
        status: 'pending_approval',
        pdfFileId: data.pdfFileIds[0] || null, // legacy fallback
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify Admin
      await notificationService.createNotification(
        'admin',
        '新規求人投稿申請',
        `${companyName}から「${data.title}」の承認申請がありました。`,
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
            <Link href="/">
              <Button variant="secondary">ホームへ</Button>
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
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-sm text-[#1E3A5F]">
          💡 作成した求人は管理者の承認後に公開されます。
        </div>

        <JobForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          loading={loading}
          submitLabel="求人を作成する"
        />
      </Card>
    </div>
  );
}
