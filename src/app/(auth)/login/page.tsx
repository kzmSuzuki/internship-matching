"use client";

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { GraduationCap, Building2, ChevronDown } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCompanyLogin, setShowCompanyLogin] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'example-university.ac.jp';
      
      if (user.email && !user.email.endsWith(`@${allowedDomain}`)) {
         await signOut(auth);
         setError(`学生ログインは @${allowedDomain} のアカウントのみ使用可能です。`);
         setLoading(false);
         return;
      }

      // Check if user exists in Firestore, create if not
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName || '名無し',
          role: 'student',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'students', user.uid), {
          userId: user.uid,
          name: user.displayName || '名無し',
          grade: '',
          bio: '',
          skills: [],
          links: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError('Googleログインに失敗しました。');
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified for company accounts
      if (!result.user.emailVerified) {
        router.push('/verify-email');
        return;
      }
      
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('メールアドレスまたはパスワードが正しくありません。');
      } else if (err.code === 'auth/too-many-requests') {
        setError('ログイン試行回数が上限に達しました。しばらく待ってから再度お試しください。');
      } else {
        setError('ログインに失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Student Login (Primary) */}
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GraduationCap className="text-[#1E3A5F]" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E3A5F]">学生ログイン</h1>
              <p className="text-xs text-gray-500">学校のGoogleアカウントでログイン</p>
            </div>
          </div>

          {error && !showCompanyLogin && (
            <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="w-full h-12 text-base gap-3"
            onClick={handleGoogleLogin}
            isLoading={loading && !showCompanyLogin}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </Button>

          <p className="mt-4 text-center text-xs text-gray-400">
            学校指定のGoogleアカウント (@{process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'example-university.ac.jp'}) でログインしてください
          </p>
        </Card>

        {/* Company Login (Secondary) */}
        <Card className="p-6">
          <button
            onClick={() => setShowCompanyLogin(!showCompanyLogin)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="text-indigo-700" size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-700">企業の方はこちら</h2>
                <p className="text-xs text-gray-400">メールアドレスでログイン</p>
              </div>
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${showCompanyLogin ? 'rotate-180' : ''}`}
            />
          </button>

          {showCompanyLogin && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {error && showCompanyLogin && (
                <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleCompanyLogin} className="space-y-4">
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
                />
                <Button type="submit" className="w-full" isLoading={loading && showCompanyLogin}>
                  ログイン
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-600">
                企業アカウントをお持ちでないですか？{' '}
                <Link href="/register/company" className="text-indigo-600 font-medium hover:underline">
                  企業登録はこちら
                </Link>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
