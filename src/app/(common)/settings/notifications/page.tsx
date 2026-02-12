"use client";

import { Card } from '@/components/ui/Card';
// import { Toggle } from '@/components/ui/Toggle'; // Removed
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

// Simple switch component if not exists
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
   return (
      <button 
         className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
         onClick={() => onChange(!checked)}
      >
         <div className={`w-4 h-4 bg-white rounded-full transition-transform transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
   );
}

export default function NotificationSettingsPage() {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [browserEnabled, setBrowserEnabled] = useState(true);

  const handleSave = () => {
     alert('設定を保存しました (デモ)');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div>
         <h1 className="text-2xl font-bold text-gray-800">通知設定</h1>
         <p className="text-gray-500">通知の受け取り方法を管理します</p>
       </div>

       <Card className="p-6 space-y-6">
          <div className="flex justify-between items-center">
             <div>
                <h3 className="font-bold text-gray-700">メール通知</h3>
                <p className="text-sm text-gray-500">重要な更新をメールで受け取る</p>
             </div>
             <Switch checked={emailEnabled} onChange={setEmailEnabled} />
          </div>
          
          <div className="border-t pt-6 flex justify-between items-center">
             <div>
                <h3 className="font-bold text-gray-700">ブラウザ通知</h3>
                <p className="text-sm text-gray-500">Webプッシュ通知を受け取る (未実装)</p>
             </div>
             <Switch checked={browserEnabled} onChange={setBrowserEnabled} />
          </div>

          <div className="pt-4 flex justify-end">
             <Button onClick={handleSave}>設定を保存</Button>
          </div>
       </Card>
    </div>
  );
}
