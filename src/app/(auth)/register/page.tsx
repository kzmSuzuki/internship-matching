"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Students use Google login (which auto-registers), so /register redirects to /login.
// Company registration is at /register/company.
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
