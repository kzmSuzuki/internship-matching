"use client";

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { matchingService } from '@/services/matching';
import { Application } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Calendar as CalendarIcon, User } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null); // Details loaded on demand
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const data = await adminService.getPendingApplications();
      setApps(data);
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleOpenDetail = async (app: Application) => {
     // Ideally we fetch details here
     try {
        const details = await adminService.getApplicationDetails(app);
        setSelectedApp({ ...app, ...details });
     } catch (err) {
        console.error(err);
        alert('詳細の取得に失敗しました');
     }
  };

  const handleApprove = async (appId: string) => {
     if (!confirm('この応募を承認して、企業側へ通知しますか？')) return;
     setProcessing(appId);
     try {
        await matchingService.approveByAdmin(appId);
        setApps(prev => prev.filter(a => a.id !== appId));
        setSelectedApp(null);
     } catch (error) {
        console.error(error);
        alert('承認に失敗しました');
     } finally {
        setProcessing(null);
     }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold text-gray-800">応募承認</h1>
         <p className="text-gray-500">管理者確認待ちの応募が {apps.length} 件あります</p>
       </div>

       {apps.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
             確認待ちの応募はありません。
          </Card>
       ) : (
          <div className="grid gap-4">
             {apps.map(app => (
                <Card key={app.id} className="p-6">
                   <div className="flex justify-between items-center">
                      <div>
                         <div className="flex items-center gap-2 mb-2">
                             <Badge variant="warning">管理者承認待ち</Badge>
                             <span className="text-xs text-gray-500">ID: {app.id}</span>
                         </div>
                         <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1"><CalendarIcon size={14} /> Applied: {format(app.createdAt.toDate(), 'yyyy/MM/dd HH:mm')}</span>
                         </div>
                         <p className="text-sm font-bold">Message: {app.message.substring(0, 50)}...</p>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" onClick={() => handleOpenDetail(app)}>
                            詳細
                         </Button>
                         <Button 
                            className="bg-green-600 hover:bg-green-700"
                            isLoading={processing === app.id} 
                            onClick={() => handleApprove(app.id)}
                         >
                            承認
                         </Button>
                      </div>
                   </div>
                </Card>
             ))}
          </div>
       )}
       
       <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="応募詳細">
          {selectedApp && (
             <div className="space-y-6">
                <div>
                   <h2 className="font-bold text-lg mb-4">応募情報</h2>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                         <label className="text-xs text-gray-400 block">学生</label>
                         <p className="font-bold">{selectedApp.student?.name || selectedApp.studentId}</p>
                         <p className="text-xs">{selectedApp.student?.university}</p>
                      </div>
                      <div>
                         <label className="text-xs text-gray-400 block">企業 / 求人</label>
                         <p className="font-bold">{selectedApp.company?.name || selectedApp.companyId}</p>
                         <p className="text-xs">{selectedApp.job?.title || selectedApp.jobId}</p>
                      </div>
                   </div>
                </div>

                <div>
                   <label className="text-xs text-gray-400 block mb-1">メッセージ</label>
                   <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                      {selectedApp.message}
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                   <Button variant="secondary" onClick={() => setSelectedApp(null)}>閉じる</Button>
                   <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(selectedApp.id)} isLoading={processing === selectedApp.id}>
                      承認して企業へ送る
                   </Button>
                </div>
             </div>
          )}
       </Modal>
    </div>
  );
}
