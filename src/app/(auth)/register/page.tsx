"use client";

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Domain Validation Removed for Email Registration
    // const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'example-university.ac.jp';
    // if (!email.endsWith(`@${allowedDomain}`)) {
    //   setError(`大学のメールアドレス (@${allowedDomain}) のみ登録可能です。`);
    //   setLoading(false);
    //   return;
    // }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
        role: 'student',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Initial student profile
      await setDoc(doc(db, 'students', user.uid), {
        userId: user.uid,
        name: name,
        grade: '',
        bio: '',
        skills: [],
        links: [],
      });

      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています。');
      } else {
        setError('登録に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-[#1E3A5F] mb-6">学生アカウント登録</h1>

        {error && (
          <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="氏名"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="山田 太郎"
          />
          <Input
            label="大学メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="taro.yamada@example.com"
          />
          <Input
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            登録する
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          既にアカウントをお持ちですか？{' '}
          <Link href="/login" className="text-[#1E3A5F] font-medium hover:underline">
            ログインはこちら
          </Link>
        </p>
      </Card>
    </div>
  );
}
