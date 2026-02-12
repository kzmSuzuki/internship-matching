"use client";

import { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

// In the future, we can add student-specific context or navigation highlights here
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}
