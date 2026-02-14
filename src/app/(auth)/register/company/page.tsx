"use client";

import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { notificationService } from '@/services/notification';

export default function CompanyRegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください。');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Wait for the auth token to propagate to Firestore
      await user.getIdToken(true);

      // Create user document (role: company)
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: companyName,
        role: 'company',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create company profile
      await setDoc(doc(db, 'companies', user.uid), {
        userId: user.uid,
        name: companyName,
        contactName: contactName,
        website: website,
        industry: industry,
        address: '',
        description: '',
        isApproved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send verification email (non-blocking - redirect even if this fails)
      try {
        await sendEmailVerification(user);
      } catch (emailErr) {
        console.warn('Verification email send failed (user can retry on verify page):', emailErr);
      }

      // Notify Admin
      await notificationService.createNotification(
        'admin',
        '新規企業登録申請',
        `${companyName} から新規登録申請がありました。`,
        'system',
        '/admin/companies'
      );

      router.push('/verify-email');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています。');
      } else if (err.code === 'auth/weak-password') {
        setError('パスワードが弱すぎます。より強いパスワードを設定してください。');
      } else if (err.message?.includes('permission') || err.code === 'permission-denied') {
        setError('アカウントの作成中にエラーが発生しました。もう一度お試しください。');
      } else {
        setError('登録に失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Building2 className="text-indigo-700" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E3A5F]">企業アカウント登録</h1>
            <p className="text-xs text-gray-500">インターンシップの募集を始めましょう</p>
          </div>
        </div>

        {error && (
          <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm mb-6 text-amber-800">
          ※ 企業アカウントは管理者の承認後に求人を掲載できるようになります。
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">企業情報</h3>
            <Input
              label="企業名"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="株式会社〇〇"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="担当者名"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                placeholder="山田 太郎"
              />
              <Input
                label="業界"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="IT・通信"
              />
            </div>
            <Input
              label="Webサイト URL"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.co.jp"
            />
          </div>

          {/* Account Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">アカウント情報</h3>
            <Input
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="info@company.co.jp"
            />
            <Input
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="8文字以上"
            />
            <Input
              label="パスワード（確認）"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base" isLoading={loading}>
            企業アカウントを作成
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-center text-sm text-gray-600">
            既にアカウントをお持ちですか？{' '}
            <Link href="/login" className="text-[#1E3A5F] font-medium hover:underline">
              ログインはこちら
            </Link>
          </p>
          <p className="text-center text-sm text-gray-400 mt-2">
            学生の方は{' '}
            <Link href="/login" className="text-[#1E3A5F] font-medium hover:underline">
              Googleログイン
            </Link>
            {' '}をご利用ください
          </p>
        </div>
      </Card>
    </div>
  );
}
