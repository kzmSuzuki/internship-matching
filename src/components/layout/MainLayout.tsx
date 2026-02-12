import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen text-[#161B33] font-sans">
      <Sidebar />
      <div className="pl-24 flex flex-col min-h-screen transition-all duration-300">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
