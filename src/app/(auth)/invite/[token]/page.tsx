"use client";

import { useState, use } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Note: In a real app, you would validate the 'token' against Firestore before rendering the form.
  // For this phase, we assume the token is valid if the user has the link.

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user profile
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
        role: 'company',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Save company profile
      await setDoc(doc(db, 'companies', user.uid), {
        userId: user.uid,
        name: companyName,
        website: '',
        industry: '',
        address: '',
        description: '',
        isApproved: false, // Default to not approved
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
        <h1 className="text-2xl font-bold text-center text-[#1E3A5F] mb-6">企業担当者アカウント登録</h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          招待トークン: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{token}</span>
        </p>

        {error && (
          <div className="bg-[#F56565]/10 text-[#F56565] p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="企業名"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            placeholder="株式会社〇〇"
          />
          <Input
            label="担当者氏名"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="山田 太郎"
          />
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="taro@company.co.jp"
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
            アカウント登録
          </Button>
        </form>
      </Card>
    </div>
  );
}
