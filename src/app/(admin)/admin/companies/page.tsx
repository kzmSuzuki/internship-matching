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

  useEffect(() => {
    async function fetchCompanies() {
       try {
          const data = await adminService.getAllCompanies();
          setCompanies(data);
       } catch (error) {
          console.error(error);
       } finally {
          setLoading(false);
       }
    }
    fetchCompanies();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold text-gray-800">企業管理</h1>
         <p className="text-gray-500">登録企業: {companies.length} 社</p>
       </div>

       <div className="grid gap-4">
          {companies.map(comp => (
             <Card key={comp.userId} className="p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedCompany(comp)}>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building className="text-gray-500" />
                   </div>
                   <div>
                      <h3 className="font-bold text-lg">{comp.name}</h3>
                      <div className="flex gap-4 text-sm text-gray-500">
                         <span className="flex items-center gap-1"><MapPin size={14} /> {comp.address}</span>
                         <span>{comp.industry}</span>
                      </div>
                   </div>
                   <div className="ml-auto">
                      <Badge variant={comp.isApproved ? "success" : "warning"}>
                         {comp.isApproved ? "承認済み" : "承認待ち"}
                      </Badge>
                   </div>
                </div>
             </Card>
          ))}
       </div>

       <Modal isOpen={!!selectedCompany} onClose={() => setSelectedCompany(null)} title="企業詳細">
          {selectedCompany && (
             <div className="space-y-4">
                <div>
                   <label className="text-xs text-gray-400 block">企業名</label>
                   <p className="font-bold text-xl">{selectedCompany.name}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-400 block">Webサイト</label>
                   <a href={selectedCompany.website} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                      <Globe size={14} /> {selectedCompany.website}
                   </a>
                </div>
                <div>
                   <label className="text-xs text-gray-400 block">住所</label>
                   <p>{selectedCompany.address}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-400 block">会社概要</label>
                   <p className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">{selectedCompany.description}</p>
                </div>
                <div className="pt-4 flex justify-end">
                   <Button variant="secondary" onClick={() => setSelectedCompany(null)}>閉じる</Button>
                </div>
             </div>
          )}
       </Modal>
    </div>
  );
}
