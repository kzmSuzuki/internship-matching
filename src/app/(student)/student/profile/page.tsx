"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      try {
        const docRef = doc(db, 'students', user.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as Student);
        } else {
          // Should have been created on register, but just in case
          setProfile({
            userId: user.id,
            name: user.name,
            grade: '',
            bio: '',
            skills: [],
            links: [],
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
      } else if (user.role !== 'student') {
        router.push('/'); // Redirect if not student
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
      await updateDoc(doc(db, 'students', user.id), {
        ...profile,
        // Ensure userId and name stay synced if needed, though usually name is in User model too
      });
      setSuccessMessage('プロフィールを更新しました');
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
        <h1 className="text-2xl font-bold text-[#1E3A5F]">プロフィール編集</h1>
        <p className="text-gray-500">企業に公開される情報を入力してください</p>
      </div>

      <Card className="p-8">
        {successMessage && (
          <div className="bg-[#48BB78]/10 text-[#48BB78] p-3 rounded-lg text-sm mb-6 animate-in fade-in">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="氏名"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
          
          <Input
            label="大学・学部・学科"
            value={profile.university || ''}
            onChange={(e) => setProfile({ ...profile, university: e.target.value })}
            placeholder="〇〇大学 工学部 情報工学科"
          />

          <Input
            label="学年"
            value={profile.grade}
            onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
            placeholder="学部3年 / 修士1年"
          />

          <div className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
                自己PR / BIO
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] min-h-[120px]"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="興味のある技術、インターンで学びたいことなど..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
                スキル (カンマ区切り)
              </label>
              <Input
                value={profile.skills.join(', ')}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="TypeScript, React, Golang, Python"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
                ポートフォリオ / リンク (カンマ区切り)
              </label>
              <Input
                value={profile.links.join(', ')}
                onChange={(e) => setProfile({ ...profile, links: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="https://github.com/..., https://qiita.com/..."
              />
            </div>
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
