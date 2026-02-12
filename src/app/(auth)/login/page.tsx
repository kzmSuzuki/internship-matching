"use client";

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError('メールアドレスまたはパスワードが正しくありません。');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (err: any) {
      setError('Googleログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-[#1E3A5F] mb-6">ログイン</h1>

        {error && (
          <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="taro.yamada@example-university.ac.jp"
          />
          <Input
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            ログイン
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">または</span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            className="w-full mt-4"
            onClick={handleGoogleLogin}
            isLoading={loading}
          >
            Googleでログイン
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          アカウントをお持ちでないですか？{' '}
          <Link href="/register" className="text-[#1E3A5F] font-medium hover:underline">
            学生登録はこちら
          </Link>
        </p>
      </Card>
    </div>
  );
}
