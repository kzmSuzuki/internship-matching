"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, LayoutDashboard, Briefcase, FileText, Users, Building, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        alert('管理者権限がありません');
        router.push('/');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !isAuthorized) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
       {/* Sidebar */}
       <aside className="w-64 bg-[#1E3A5F] text-white flex flex-col fixed h-full">
          <div className="p-6 border-b border-white/10">
             <h1 className="text-xl font-bold">Admin Console</h1>
             <p className="text-xs opacity-70 mt-1">インターンシップ管理</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
             <NavLink href="/admin/dashboard" icon={<LayoutDashboard size={18} />} label="ダッシュボード" />
             <NavLink href="/admin/jobs" icon={<Briefcase size={18} />} label="求人承認" />
             <NavLink href="/admin/applications" icon={<FileText size={18} />} label="応募承認" />
             <div className="pt-4 pb-2 text-xs font-bold opacity-50 uppercase tracking-widest">Management</div>
             <NavLink href="/admin/users" icon={<Users size={18} />} label="ユーザー管理" />
             <NavLink href="/admin/companies" icon={<Building size={18} />} label="企業管理" />
          </nav>
          
          <div className="p-4 border-t border-white/10">
             <Button 
                variant="ghost" 
                className="w-full justify-start text-white hover:bg-white/10 hover:text-white"
                onClick={logout}
             >
                <LogOut size={18} className="mr-2" />
                ログアウト
             </Button>
          </div>
       </aside>
       
       {/* Main Content */}
       <main className="ml-64 flex-1 p-8">
          {children}
       </main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
   return (
      <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors">
         {icon}
         <span>{label}</span>
      </Link>
   );
}
