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
    <header className="sticky top-0 z-30 w-full flex justify-end px-6 mt-4 pointer-events-none">
      {/* Left side spacer - kept to maintain structure if needed later, but width removed */}
      <div className="hidden">
        {/* Search Bar - Hidden for Student/Company as requested */}
      </div>

      <div className="flex items-center gap-4 glass px-6 py-2 rounded-2xl shadow-sm pointer-events-auto">
        {/* <NotificationBell /> */}
        
        <Link href={user?.role === 'student' ? '/student/profile' : user?.role === 'company' ? '/company/profile' : '/'} className="flex items-center gap-3 pl-2 hover:opacity-80 transition-opacity">
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
