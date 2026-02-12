"use client";

import { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

export default function CompanyLayout({ children }: { children: ReactNode }) {
  // In Phase 5, we can add company-specific contextual help or navigation emphasis
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}
