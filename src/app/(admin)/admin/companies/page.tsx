"use client";

import { useEffect, useState } from 'react';

import { adminService } from '@/services/admin';
import { Company } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Globe, MapPin, Building } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCompanies = async () => {
    try {
      const data = await adminService.getAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);



  const handleApproveCompany = async (userId: string) => {
    if (!confirm('この企業を承認しますか？求人の作成が可能になります。')) return;
    setProcessing(userId);
    try {
      await adminService.approveCompany(userId);
      setCompanies(prev => prev.map(c => 
        c.userId === userId ? { ...c, isApproved: true } : c
      ));
      setSelectedCompany(prev => prev && prev.userId === userId ? { ...prev, isApproved: true } : prev);
    } catch (error) {
      console.error(error);
      alert('承認に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevokeCompany = async (userId: string) => {
    if (!confirm('この企業の承認を取り消しますか？求人の作成ができなくなります。')) return;
    setProcessing(userId);
    try {
      await adminService.revokeCompany(userId);
      setCompanies(prev => prev.map(c => 
        c.userId === userId ? { ...c, isApproved: false } : c
      ));
      setSelectedCompany(prev => prev && prev.userId === userId ? { ...prev, isApproved: false } : prev);
    } catch (error) {
      console.error(error);
      alert('取消に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  const filteredCompanies = companies.filter(c => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    const name = c.name?.toLowerCase() || '';
    const industry = c.industry?.toLowerCase() || '';
    return name.includes(lower) || industry.includes(lower);
  });

  const pendingCompanies = filteredCompanies.filter(c => !c.isApproved);
  const approvedCompanies = filteredCompanies.filter(c => c.isApproved);

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-2xl font-bold text-[#1E3A5F]">企業管理</h1>
           <p className="text-gray-500">登録企業: {companies.length} 社（表示: {filteredCompanies.length} 社）</p>
         </div>
         <input
           type="text"
           placeholder="企業名・業種で検索..."
           className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
        />
       </div>

       {/* Pending companies first */}
       {pendingCompanies.length > 0 && (
         <div className="space-y-3">
           <h2 className="text-lg font-bold text-amber-700">⏳ 承認待ちの企業</h2>
           <div className="grid gap-4">
             {pendingCompanies.map(comp => (
               <Card key={comp.userId} className="p-6 border-l-4 border-l-amber-400">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center">
                       <Building className="text-[#1E3A5F]" />
                    </div>
                    <div className="flex-1">
                       <h3 className="font-bold text-lg">{comp.name}</h3>
                       <div className="flex gap-4 text-sm text-gray-500">
                          {comp.industry && <span>{comp.industry}</span>}
                          {comp.address && <span className="flex items-center gap-1"><MapPin size={14} /> {comp.address}</span>}
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">承認待ち</Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setSelectedCompany(comp)}
                      >
                        詳細
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveCompany(comp.userId)}
                        isLoading={processing === comp.userId}
                      >
                        承認する
                      </Button>
                    </div>
                 </div>
               </Card>
             ))}
           </div>
         </div>
       )}

       {/* Approved companies */}
       {approvedCompanies.length > 0 && (
         <div className="space-y-3">
           <h2 className="text-lg font-bold text-[#1E3A5F]">✅ 承認済みの企業</h2>
           <div className="grid gap-4">
             {approvedCompanies.map(comp => (
               <Card key={comp.userId} className="p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedCompany(comp)}>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center">
                       <Building className="text-[#1E3A5F]" />
                    </div>
                    <div className="flex-1">
                       <h3 className="font-bold text-lg">{comp.name}</h3>
                       <div className="flex gap-4 text-sm text-gray-500">
                          {comp.industry && <span>{comp.industry}</span>}
                          {comp.address && <span className="flex items-center gap-1"><MapPin size={14} /> {comp.address}</span>}
                       </div>
                    </div>
                    <Badge variant="success">承認済み</Badge>
                 </div>
               </Card>
             ))}
           </div>
         </div>
       )}

       <Modal isOpen={!!selectedCompany} onClose={() => setSelectedCompany(null)} title="企業詳細">
          {selectedCompany && (
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{selectedCompany.name}</h2>
                  <Badge variant={selectedCompany.isApproved ? "success" : "warning"}>
                    {selectedCompany.isApproved ? "承認済み" : "承認待ち"}
                  </Badge>
                </div>
                <div>
                   <label className="text-xs text-gray-400 block">業種</label>
                   <p>{selectedCompany.industry || '未設定'}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-400 block">Webサイト</label>
                   {selectedCompany.website ? (
                     <a href={selectedCompany.website} target="_blank" className="text-[#1E3A5F] hover:underline flex items-center gap-1">
                       <Globe size={14} /> {selectedCompany.website}
                     </a>
                   ) : (
                     <p className="text-gray-400">未設定</p>
                   )}
                </div>
                <div>
                   <label className="text-xs text-gray-400 block">住所</label>
                   <p>{selectedCompany.address || '未設定'}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-400 block">会社概要</label>
                   <p className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">{selectedCompany.description || '未設定'}</p>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t">

                   {selectedCompany.isApproved ? (
                     <Button 
                       variant="danger" 
                       onClick={() => handleRevokeCompany(selectedCompany.userId)}
                       isLoading={processing === selectedCompany.userId}
                       className="text-[#f56565]"
                     >
                       承認を取消
                     </Button>
                   ) : (
                     <Button 
                       onClick={() => handleApproveCompany(selectedCompany.userId)}
                       isLoading={processing === selectedCompany.userId}
                     >
                       承認する
                     </Button>
                   )}
                   <Button variant="secondary" onClick={() => setSelectedCompany(null)}>閉じる</Button>
                </div>
             </div>
          )}
       </Modal>
    </div>
  );
}
