"use client";

import { useState, useEffect, useCallback } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Mail, CheckCircle, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();
  const { refreshUser } = useAuth();

  // Wait for auth state to settle
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        if (user.emailVerified) {
          setVerified(true);
        }
      }
      setInitialLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check verification status periodically
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || verified) return;

    const interval = setInterval(async () => {
      try {
        await user.reload();
        if (user.emailVerified) {
          setVerified(true);
          clearInterval(interval);
          // Update AuthContext
          await refreshUser();
        }
      } catch {
        // Silently ignore reload errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [verified, refreshUser]);

  const handleResend = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setResending(true);
    setError('');
    setResent(false);

    try {
      await sendEmailVerification(user);
      setResent(true);
      // Auto-hide success message after 5 seconds
      setTimeout(() => setResent(false), 5000);
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError('送信回数の上限に達しました。しばらく待ってから再送してください。');
      } else {
        setError('メールの再送に失敗しました。時間をおいて再度お試しください。');
      }
      setTimeout(() => setError(''), 5000);
    } finally {
      setResending(false);
    }
  }, []);

  const handleCheckStatus = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setChecking(true);
    setError('');

    try {
      await user.reload();
      if (user.emailVerified) {
        setVerified(true);
        await refreshUser();
      } else {
        setError('まだメールの確認が完了していません。受信箱（迷惑メールフォルダ含む）をご確認ください。');
        setTimeout(() => setError(''), 5000);
      }
    } catch {
      setError('確認状況の取得に失敗しました。');
      setTimeout(() => setError(''), 5000);
    } finally {
      setChecking(false);
    }
  }, [refreshUser]);

  // Loading state - waiting for auth
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="animate-spin mx-auto text-gray-400 mb-4" size={32} />
          <p className="text-gray-500">読み込み中...</p>
        </Card>
      </div>
    );
  }

  // Not logged in - show appropriate message
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-gray-400" size={32} />
          </div>
          <h1 className="text-xl font-bold text-[#1E3A5F] mb-2">セッションが切れました</h1>
          <p className="text-gray-600 mb-6">
            再度ログインして、メールアドレスの確認を完了してください。
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            ログインページへ
          </Button>
        </Card>
      </div>
    );
  }

  // Already verified
  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">メール確認完了！</h1>
          <p className="text-gray-600 mb-6">
            メールアドレスの確認が完了しました。<br />
            企業プロフィールの設定に進みましょう。
          </p>
          <Button className="w-full gap-2" onClick={() => router.push('/')}>
            ダッシュボードへ <ArrowRight size={16} />
          </Button>
        </Card>
      </div>
    );
  }

  // Waiting for verification
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-[#1E3A5F]" size={32} />
          </div>

          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">メールアドレスの確認</h1>
          <p className="text-gray-600 mb-2">
            以下のアドレスに確認メールを送信しました。
          </p>
          <p className="font-medium text-[#1E3A5F] mb-6 break-all">
            {currentUser.email}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
            <p className="text-sm text-gray-600">
              📧 メール内の確認リンクをクリックしてください。
            </p>
            <p className="text-sm text-gray-600">
              🔄 確認後、このページは自動的に更新されます。
            </p>
            <p className="text-xs text-gray-400 mt-2">
              ※ メールが届かない場合は、迷惑メールフォルダもご確認ください。
            </p>
          </div>

          {error && (
            <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {resent && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
              ✅ 確認メールを再送しました。
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full gap-2"
              onClick={handleCheckStatus}
              isLoading={checking}
            >
              <RefreshCw size={16} />
              確認状況をチェック
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              isLoading={resending}
            >
              確認メールを再送する
            </Button>
          </div>

          <p className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
            別のアカウントでログインする場合は、
            <button
              onClick={() => router.push('/login')}
              className="text-[#1E3A5F] hover:underline"
            >
              こちら
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
