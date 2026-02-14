"use client";

import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, UserCheck, Building2, 
  Search, FileText, User, Briefcase, Users, 
  LayoutDashboard, CheckCircle, Building, Plus,
  Shield
} from 'lucide-react';

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

// --- Dashboard Card Component ---
function DashboardCard({ 
  icon, title, description, href 
}: { 
  icon: React.ReactNode; title: string; description: string; href: string; 
}) {
  return (
    <Link href={href}>
      <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer h-full group">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-[#1E3A5F]/10 transition-transform group-hover:scale-110">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 mb-1 group-hover:text-[#1E3A5F] transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
          <ArrowRight size={16} className="text-gray-300 group-hover:text-[#1E3A5F] transition-colors flex-shrink-0 mt-1" />
        </div>
      </Card>
    </Link>
  );
}

// --- Student Dashboard ---
function StudentDashboard({ name, userId }: { name: string, userId: string }) {
  const [activeMatch, setActiveMatch] = useState<string | null>(null);

  useEffect(() => {
    async function checkActiveMatch() {
       try {
         // Query matches where studentId == userId and status == 'active'
         const q = query(
            collection(db, 'matches'),
            where('studentId', '==', userId),
            where('status', '==', 'active')
         );
         const snap = await getDocs(q);
         if (!snap.empty) {
            setActiveMatch(snap.docs[0].id);
         }
       } catch (e) {
         console.error(e);
       }
    }
    checkActiveMatch();
  }, [userId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">こんにちは、{name}さん 👋</h1>
        <p className="text-gray-500 mt-1">インターンシップの機会を探しましょう</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeMatch && (
           <DashboardCard
             icon={<CheckCircle size={22} className="text-[#48BB78]" />}
             title="インターンシップ画面"
             description="現在進行中のインターンシップの管理画面へ移動します"
             href={`/student/intern/${activeMatch}`}
           />
        )}
        <DashboardCard
          icon={<Search size={22} className="text-[#1E3A5F]" />}
          title="求人を探す"
          description="スキルや興味に合ったインターンシップを検索できます"
          href="/student/jobs"
        />
        <DashboardCard
          icon={<FileText size={22} className="text-[#1E3A5F]" />}
          title="応募履歴"
          description="応募した求人の進捗状況を確認できます"
          href="/student/applications"
        />
        <DashboardCard
          icon={<User size={22} className="text-[#1E3A5F]" />}
          title="プロフィール編集"
          description="自己紹介やスキルを充実させてアピールしましょう"
          href="/student/profile"
        />
      </div>
    </div>
  );
}

// --- Company Dashboard ---
function CompanyDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">ようこそ、{name} 様 🏢</h1>
        <p className="text-gray-500 mt-1">インターンシップの採用活動を管理しましょう</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard
          icon={<LayoutDashboard size={22} className="text-[#1E3A5F]" />}
          title="ダッシュボード"
          description="求人・応募の統計情報を一目で確認できます"
          href="/company/dashboard"
        />
        <DashboardCard
          icon={<Briefcase size={22} className="text-[#1E3A5F]" />}
          title="求人管理"
          description="作成した求人の一覧確認・新規作成ができます"
          href="/company/jobs"
        />
        <DashboardCard
          icon={<Plus size={22} className="text-[#1E3A5F]" />}
          title="新規求人作成"
          description="新しいインターンシップ求人を作成・公開できます"
          href="/company/jobs/new"
        />
        <DashboardCard
          icon={<Users size={22} className="text-[#1E3A5F]" />}
          title="応募者管理"
          description="応募してきた学生の確認・選考を行えます"
          href="/company/applicants"
        />
        <DashboardCard
          icon={<Building2 size={22} className="text-[#1E3A5F]" />}
          title="企業プロフィール"
          description="企業情報の確認・編集ができます"
          href="/company/profile"
        />
      </div>
    </div>
  );
}

// --- Admin Dashboard ---
function AdminDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">管理パネル 🛡️</h1>
        <p className="text-gray-500 mt-1">こんにちは、{name}さん。システム全体を管理しましょう</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          icon={<LayoutDashboard size={22} className="text-[#1E3A5F]" />}
          title="統計ダッシュボード"
          description="ユーザー数・求人数・マッチング数など全体の統計を確認"
          href="/admin/dashboard"
        />
        <DashboardCard
          icon={<CheckCircle size={22} className="text-[#1E3A5F]" />}
          title="求人承認"
          description="企業から投稿された求人の確認・承認を行います"
          href="/admin/jobs"
        />
        <DashboardCard
          icon={<FileText size={22} className="text-[#1E3A5F]" />}
          title="応募管理"
          description="全応募の一覧確認・ステータスの管理を行います"
          href="/admin/applications"
        />
        <DashboardCard
          icon={<Users size={22} className="text-[#1E3A5F]" />}
          title="ユーザー管理"
          description="登録ユーザーの一覧表示・ロール管理を行います"
          href="/admin/users"
        />
        <DashboardCard
          icon={<Building size={22} className="text-[#1E3A5F]" />}
          title="企業管理"
          description="登録企業の確認・承認・管理を行います"
          href="/admin/companies"
        />
      </div>
    </div>
  );
}

// --- Guest Landing ---
function GuestLanding() {
  const router = useRouter();

  return (
    <div className="space-y-12">
      <section className="text-center space-y-6 py-12">
        <Badge variant="outline" className="mb-4">神山まるごと高専生専用</Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1E3A5F] leading-tight">
          未来をつくる<br />
          インターンシップ・マッチング
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          学生の可能性と企業の想いをつなぐプラットフォーム。<br />
          あなたにぴったりの機会を見つけましょう。
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/login')}>
          <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1E3A5F]">
            <UserCheck size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">学生の方へ</h3>
          <p className="text-gray-500 text-sm mb-4">
            自分のスキルや興味に合った長期インターンを探し、
            実際のプロジェクトで経験を積みましょう。
          </p>
          <Button variant="ghost" size="sm" className="text-[#1E3A5F]">
            Googleでログイン <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>

        <Card className="p-8 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/register/company')}>
          <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1E3A5F]">
            <Building2 size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">企業の方へ</h3>
          <p className="text-gray-500 text-sm mb-4">
            熱意ある学生と出会い、共にプロジェクトを進めることができます。
            招待制で安心して利用可能です。
          </p>
          <Button variant="ghost" size="sm" className="text-[#1E3A5F]">
            企業登録・ログイン <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <MainLayout><div className="flex justify-center p-20">Loading...</div></MainLayout>;
  }

  const renderDashboard = () => {
    if (!user) return <GuestLanding />;

    switch (user.role) {
      case 'student':
        return <StudentDashboard name={user.name} userId={user.id} />;
      case 'company':
        return <CompanyDashboard name={user.name} />;
      case 'admin':
        return <AdminDashboard name={user.name} />;
      default:
        return <GuestLanding />;
    }
  };

  return (
    <MainLayout>
      {renderDashboard()}
    </MainLayout>
  );
}
