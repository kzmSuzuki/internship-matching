"use client";

import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 w-full h-16 px-6 flex items-center justify-between glass border-b-0 rounded-2xl mx-auto max-w-[98%] mt-2">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64 md:w-96 hidden md:block">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="検索..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white/50 border-none focus:ring-2 focus:ring-[#161B33]/20 text-sm shadow-sm backdrop-blur-sm transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <Link href={user?.role === 'student' ? '/student/profile' : user?.role === 'company' ? '/company/profile' : '/'} className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[#161B33]">{user?.name || 'ゲスト'}</p>
            <p className="text-xs text-gray-500">{user?.role === 'student' ? '学生アカウント' : user?.role === 'company' ? '企業アカウント' : user?.role === 'admin' ? '管理者' : 'ゲスト'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#161B33] to-[#2D5A8E] shadow-md border-2 border-white cursor-pointer" />
        </Link>
      </div>
    </header>
  );
}
