"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader2, Calendar, User, Building, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchMatches() {
      try {
        const data = await adminService.getAllMatches();
        setMatches(data);
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="bg-green-500 text-white">進行中</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-gray-500 border-gray-300">完了</Badge>;
      case 'cancelled':
        return <Badge variant="error" className="bg-red-100 text-red-500">キャンセル</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredMatches = matches.filter(match => {
    // Status filter
    if (filter !== 'all' && match.status !== filter) return false;

    // Search term filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const sName = match.studentName?.toLowerCase() || '';
      const cName = match.companyName?.toLowerCase() || '';
      const title = match.jobTitle?.toLowerCase() || '';
      return sName.includes(lower) || cName.includes(lower) || title.includes(lower);
    }
    
    return true;
  });

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-2xl font-bold text-[#1E3A5F]">インターン実施状況</h1>
             <p className="text-gray-500">成立したマッチング一覧と進捗状況（{filteredMatches.length} 件）</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <input
               type="text"
               placeholder="学生名・企業名・求人で検索..."
               className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex bg-gray-100 p-1 rounded-lg self-start">
               <button 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFilter('all')}
               >
                  すべて
               </button>
               <button 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'active' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFilter('active')}
               >
                  進行中
               </button>
               <button 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFilter('completed')}
               >
                  完了
               </button>
            </div>
          </div>
       </div>

       {filteredMatches.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
             該当するマッチングはありません。
          </Card>
       ) : (
          <div className="grid gap-4">
             {filteredMatches.map(match => (
                <Card key={match.id} className="p-6">
                   <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                         <div className="flex items-center gap-3 mb-1">
                            {getStatusBadge(match.status)}
                            <span className="text-xs text-gray-400">ID: {match.id}</span>
                         </div>
                         <h3 className="text-lg font-bold text-[#1E3A5F]">{match.jobTitle}</h3>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm text-gray-600 mt-2">
                            <div className="flex items-center gap-2">
                               <User size={16} className="text-gray-400" />
                               <span className="font-medium">学生:</span> {match.studentName}
                            </div>
                            <div className="flex items-center gap-2">
                               <Building size={16} className="text-gray-400" />
                               <span className="font-medium">企業:</span> {match.companyName}
                            </div>
                            <div className="flex items-center gap-2">
                               <Calendar size={16} className="text-gray-400" />
                               <span className="font-medium">開始日:</span> {match.startDate ? format(match.startDate.toDate(), 'yyyy/MM/dd') : '-'}
                            </div>
                            {match.endDate && (
                              <div className="flex items-center gap-2">
                                 <Calendar size={16} className="text-gray-400" />
                                 <span className="font-medium">終了日:</span> {format(match.endDate.toDate(), 'yyyy/MM/dd')}
                              </div>
                            )}
                         </div>
                      </div>
                      <div className="flex items-center">
                         <Link href={`/admin/matches/${match.id}`}>
                            <Button variant="outline">詳細を確認</Button>
                         </Link>
                      </div>
                   </div>
                </Card>
             ))}
          </div>
       )}
    </div>
  );
}
