"use client";

import { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { Mail, AlertTriangle } from 'lucide-react';

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const { user, firebaseUser, emailVerified, loading } = useAuth();
  const router = useRouter();

  // Only show banner when:
  // 1. Not loading
  // 2. User data is loaded from Firestore (user exists)
  // 3. User role is 'company'
  // 4. Firebase user exists and logged in via email/password (not Google)
  // 5. Email is not verified
  const showVerificationBanner = 
    !loading && 
    user && 
    user.role === 'company' && 
    firebaseUser && 
    !emailVerified &&
    // Only show for email/password users (Google users are always verified)
    firebaseUser.providerData.some(p => p.providerId === 'password');

  return (
    <MainLayout>
      {showVerificationBanner && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-amber-800">
                メールアドレスの確認が完了していません
              </p>
              <p className="text-xs text-amber-600">
                確認メール内のリンクをクリックして認証を完了してください。一部の機能が制限されています。
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/verify-email')}
            className="flex-shrink-0 gap-1"
          >
            <Mail size={14} />
            確認ページへ
          </Button>
        </div>
      )}
      {children}
    </MainLayout>
  );
}
