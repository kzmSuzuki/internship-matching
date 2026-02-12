"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, notificationService } from '@/services/notification';
import { Bell, Check, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Notification } from '@/types';

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications(user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
       await notificationService.markAsRead(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
       router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
     if (user) {
        await notificationService.markAllAsRead(user.id);
     }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
         className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
         onClick={() => setIsOpen(!isOpen)}
      >
         <Bell size={24} />
         {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4">
               {unreadCount > 9 ? '9+' : unreadCount}
            </span>
         )}
      </button>

      {isOpen && (
         <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
               <h3 className="text-sm font-bold text-gray-700">通知</h3>
               {unreadCount > 0 && (
                  <button 
                     onClick={handleMarkAllRead}
                     className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                     <Check size={12} />
                     すべて既読にする
                  </button>
               )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
               {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                     通知はありません
                  </div>
               ) : (
                  <ul className="divide-y divide-gray-100">
                     {notifications.map(notification => (
                        <li 
                           key={notification.id} 
                           className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                           onClick={() => handleNotificationClick(notification)}
                        >
                           <div className="flex gap-3">
                              <div className="mt-1">
                                 {!notification.read ? (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                 ) : (
                                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                 )}
                              </div>
                              <div className="flex-1">
                                 <p className="text-sm font-medium text-gray-800 mb-1">{notification.title}</p>
                                 <p className="text-xs text-gray-500 line-clamp-2 mb-1">{notification.message}</p>
                                 <p className="text-[10px] text-gray-400">
                                    {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: ja }) : '-'}
                                 </p>
                              </div>
                           </div>
                        </li>
                     ))}
                  </ul>
               )}
            </div>
            
            <div className="p-2 border-t bg-gray-50 text-center">
               <button 
                  onClick={() => router.push('/settings/notifications')}
                  className="text-xs text-gray-500 hover:text-gray-700"
               >
                  通知設定
               </button>
            </div>
         </div>
      )}
    </div>
  );
}
