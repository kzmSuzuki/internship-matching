"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Company } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CompanyProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      try {
        const docRef = doc(db, 'companies', user.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as Company);
        } else {
          setProfile({
            userId: user.id,
            name: user.name, // Default to user name/company name from signup
            website: '',
            industry: '',
            address: '',
            description: '',
            isApproved: false,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'company') {
        router.push('/');
      } else {
        fetchProfile();
      }
    }
  }, [user, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    setSaving(true);
    setSuccessMessage('');
    try {
      await updateDoc(doc(db, 'companies', user.id), {
        ...profile,
      });
      setSuccessMessage('企業情報を更新しました');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[#1E3A5F]" size={32} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">企業プロフィール編集</h1>
        <p className="text-gray-500">学生に公開される企業情報を入力してください</p>
      </div>

      <Card className="p-8">
        {successMessage && (
           <div className="bg-[#48BB78]/10 text-[#48BB78] p-3 rounded-lg text-sm mb-6 animate-in fade-in">
             {successMessage}
           </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="企業名"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />

          <Input
            label="Webサイト URL"
            type="url"
            value={profile.website}
            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
            placeholder="https://company.co.jp"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input
               label="業界"
               value={profile.industry}
               onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
               placeholder="IT・通信"
             />
             <Input
               label="所在地"
               value={profile.address}
               onChange={(e) => setProfile({ ...profile, address: e.target.value })}
               placeholder="東京都渋谷区..."
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
               企業概要 / 事業内容
             </label>
             <textarea
               className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] min-h-[120px]"
               value={profile.description}
               onChange={(e) => setProfile({ ...profile, description: e.target.value })}
               placeholder="事業内容やミッションについて..."
             />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" isLoading={saving}>
              保存する
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
