"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting, Company } from '@/types';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { Loader2, MapPin, Building } from 'lucide-react';

interface JobWithCompany extends JobPosting {
  company?: Company;
}

export default function JobListPage() {
  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchJobs() {
      try {
        let jobsData: JobPosting[];
        
        try {
          // Query published jobs (requires composite index: status + createdAt)
          const q = query(
            collection(db, 'jobPostings'),
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          jobsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as JobPosting[];
        } catch (indexError: any) {
          // Fallback if composite index is missing
          if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
            console.warn('Composite index missing for published jobs query, falling back to unordered query.');
            const q = query(
              collection(db, 'jobPostings'),
              where('status', '==', 'published')
            );
            const snapshot = await getDocs(q);
            jobsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as JobPosting[];
            // Sort client-side
            jobsData.sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() ?? 0;
              const bTime = b.createdAt?.toMillis?.() ?? 0;
              return bTime - aTime;
            });
          } else {
            throw indexError;
          }
        }

        // Fetch company data for each job using direct doc reference
        const jobsWithCompany = await Promise.all(jobsData.map(async (job) => {
          try {
            const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
            const companySnap = await getDoc(firestoreDoc(db, 'companies', job.companyId));
            const company = companySnap.exists() ? (companySnap.data() as Company) : undefined;
            return { ...job, company };
          } catch {
            return { ...job, company: undefined };
          }
        }));

        setJobs(jobsWithCompany);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">求人を探す</h1>
        <p className="text-gray-500">あなたのキャリアを開始する最適なインターンシップを見つけましょう</p>
      </div>

      <div className="relative">
        <Input
          placeholder="キーワード、企業名で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        {/* Search Icon would go here if Input supported icons inside, or wrapped */}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-[#1E3A5F]" size={32} />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          該当する求人が見つかりませんでした。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <Link key={job.id} href={`/student/jobs/${job.id}`}>
              <Card className="h-full hover:shadow-2xl transition-all cursor-pointer border border-transparent hover:border-[#1E3A5F]/20 group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#1E3A5F] group-hover:text-[#2D5A8E] transition-colors line-clamp-2">
                       {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Building size={14} />
                      <span>{job.companyName || job.company?.name || '企業名不明'}</span>
                    </div>
                  </div>
                  {job.status === 'published' && <Badge variant="success">募集中</Badge>}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <MapPin size={14} />
                  <span>{job.location}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {job.requirements.slice(0, 3).map((req, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-white/50">
                      {req}
                    </Badge>
                  ))}
                  {job.requirements.length > 3 && (
                     <Badge variant="outline" className="text-xs bg-white/50">+{job.requirements.length - 3}</Badge>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                  <span>投稿: {job.createdAt?.toDate ? format(job.createdAt.toDate(), 'yyyy/MM/dd') : '-'}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
