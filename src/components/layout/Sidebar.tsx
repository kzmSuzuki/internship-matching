"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, Search, Briefcase, FileText, User, Settings, LogOut,
  LayoutDashboard, Users, CheckCircle, Building, Globe, GraduationCap, Handshake
} from 'lucide-react';

interface MenuItem {
  icon: any;
  label: string;
  href: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // Debug log removed
  // console.log('Sidebar user role:', user?.role);

  const getMenuItems = (): MenuItem[] => {
    if (!user) return [];

    switch (user.role) {
      case 'student':
        return [
          { icon: Home, label: 'ホーム', href: '/' },
          { icon: Search, label: '求人検索', href: '/student/jobs' },
          { icon: FileText, label: '応募履歴', href: '/student/applications' },
          { icon: User, label: 'プロフィール', href: '/student/profile' },
        ];
      
      case 'company':
        return [
          { icon: LayoutDashboard, label: 'ダッシュボード', href: '/company/dashboard' },
          { icon: Briefcase, label: '自社求人管理', href: '/company/jobs' },
          { icon: Users, label: '応募者管理', href: '/company/applicants' },
          { icon: User, label: '企業情報', href: '/company/profile' },
        ];
      
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'ダッシュボード', href: '/admin/dashboard' },
          { icon: CheckCircle, label: '求人承認', href: '/admin/jobs' },
          { icon: FileText, label: '応募管理', href: '/admin/applications' },
          { icon: Users, label: 'ユーザー管理', href: '/admin/users' },
          { icon: Building, label: '企業管理', href: '/admin/companies' },
          { icon: Handshake, label: 'インターン実施状況', href: '/admin/matches' },
        ];
      
      default:
        return [{ icon: Home, label: 'ホーム', href: '/' }];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="fixed left-4 top-4 z-40 h-[calc(100vh-2rem)] w-18 glass rounded-2xl border-r-0 flex flex-col items-center py-6 transition-all duration-300">
      <div className="mb-8 p-2 rounded-xl bg-[#161B33]/10">
        <div className="w-8 h-8 rounded-full bg-[#161B33]" />
      </div>

      <nav className="flex-1 flex flex-col gap-4 w-full items-center px-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative group flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-[#161B33] text-white shadow-md shadow-[#161B33]/20" 
                  : "text-gray-500 hover:bg-[#161B33]/10 hover:text-[#161B33]"
              )}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              
              {/* Tooltip */}
              <span className="absolute left-14 px-2 py-1 bg-[#1E3A5F] text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <button 
        onClick={logout}
        className="mt-auto p-3 text-gray-500 hover:text-[#F56565] hover:bg-[#F56565]/10 rounded-xl transition-all"
      >
        <LogOut size={22} />
      </button>
    </aside>
  );
}
