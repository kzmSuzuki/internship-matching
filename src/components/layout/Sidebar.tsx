"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Briefcase, FileText, User, Settings, LogOut } from 'lucide-react';

const MENU_ITEMS = [
  { icon: Home, label: 'ホーム', href: '/' },
  { icon: Search, label: '求人検索', href: '/student/jobs' }, // Role based switching needed later
  { icon: Briefcase, label: '企業求人', href: '/company/jobs' },
  { icon: FileText, label: '応募管理', href: '/student/applications' },
  { icon: User, label: 'プロフィール', href: '/student/profile' },
  { icon: Settings, label: '設定', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-4 top-4 z-40 h-[calc(100vh-2rem)] w-18 glass rounded-2xl border-r-0 flex flex-col items-center py-6 transition-all duration-300">
      <div className="mb-8 p-2 rounded-xl bg-[#161B33]/10">
        <div className="w-8 h-8 rounded-full bg-[#161B33]" />
      </div>

      <nav className="flex-1 flex flex-col gap-4 w-full px-2">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
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

      <button className="mt-auto p-3 text-gray-500 hover:text-[#F56565] hover:bg-[#F56565]/10 rounded-xl transition-all">
        <LogOut size={22} />
      </button>
    </aside>
  );
}
