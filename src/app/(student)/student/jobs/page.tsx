"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting, Company } from '@/types';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { Loader2, MapPin, Building, Briefcase, Users, Laptop, Banknote, Calendar, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import React, { useMemo } from 'react';

interface JobWithCompany extends JobPosting {
  company?: Company;
}

export default function JobListPage() {
  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [occupationFilter, setOccupationFilter] = useState('');
  const [workFormatFilter, setWorkFormatFilter] = useState('');
  const [isPaidFilter, setIsPaidFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

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

  const filteredAndSortedJobs = useMemo(() => {
    let result = jobs.filter(job => {
      const matchSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (job.companyName && job.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchOccupation = occupationFilter === '' || job.occupation === occupationFilter;
      const matchWorkFormat = workFormatFilter === '' || job.workFormat === workFormatFilter;
      
      let matchIsPaid = true;
      if (isPaidFilter === 'paid') matchIsPaid = job.isPaid === true;
      if (isPaidFilter === 'unpaid') matchIsPaid = job.isPaid === false;

      return matchSearch && matchOccupation && matchWorkFormat && matchIsPaid;
    });

    result.sort((a, b) => {
      if (sortBy === 'companyAsc') {
         const aName = a.companyName || a.company?.name || '';
         const bName = b.companyName || b.company?.name || '';
         return aName.localeCompare(bName, 'ja');
      } else if (sortBy === 'companyDesc') {
         const aName = a.companyName || a.company?.name || '';
         const bName = b.companyName || b.company?.name || '';
         return bName.localeCompare(aName, 'ja');
      } else {
         const aTime = a.createdAt?.toMillis?.() ?? 0;
         const bTime = b.createdAt?.toMillis?.() ?? 0;
         return bTime - aTime;
      }
    });

    return result;
  }, [jobs, searchTerm, occupationFilter, workFormatFilter, isPaidFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">求人を探す</h1>
        <p className="text-gray-500">あなたのキャリアを開始する最適なインターンシップを見つけましょう</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Input
            placeholder="キーワード、企業名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#1E3A5F]/5 text-[#1E3A5F] border-b border-gray-200 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3 min-w-[150px]">
                  <button 
                    className="flex items-center gap-2 font-bold hover:text-[#2D5A8E] transition-colors whitespace-nowrap"
                    onClick={() => {
                      if (sortBy === 'companyAsc') setSortBy('companyDesc');
                      else if (sortBy === 'companyDesc') setSortBy('newest');
                      else setSortBy('companyAsc');
                    }}
                  >
                    <Building size={14} /> 企業名
                    {sortBy === 'companyAsc' ? <ArrowUp size={14} /> : sortBy === 'companyDesc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="text-gray-400" />}
                  </button>
                </th>
                <th className="px-4 py-3 min-w-[200px]">
                  タイトル
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} />
                    <select
                      className="bg-transparent border-none text-[#1E3A5F] font-bold focus:ring-0 cursor-pointer text-sm font-medium p-0"
                      value={occupationFilter}
                      onChange={(e) => setOccupationFilter(e.target.value)}
                    >
                      <option value="">職種 (すべて)</option>
                      <option value="エンジニア">エンジニア</option>
                      <option value="デザイナー">デザイナー</option>
                      <option value="事業企画">事業企画</option>
                      <option value="営業">営業</option>
                      <option value="マーケティング">マーケティング</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[100px]">
                  <div className="flex items-center gap-1 font-bold">
                    <Users size={14} /> 受入人数
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <Laptop size={14} />
                    <select
                      className="bg-transparent border-none text-[#1E3A5F] font-bold focus:ring-0 cursor-pointer text-sm font-medium p-0"
                      value={workFormatFilter}
                      onChange={(e) => setWorkFormatFilter(e.target.value)}
                    >
                      <option value="">実施形態 (すべて)</option>
                      <option value="対面">対面</option>
                      <option value="ハイブリッド">ハイブリッド</option>
                      <option value="フルリモート">フルリモート</option>
                    </select>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  <div className="flex items-center gap-1 font-bold">
                    <MapPin size={14} /> 就業場所
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <Banknote size={14} />
                    <select
                      className="bg-transparent border-none text-[#1E3A5F] font-bold focus:ring-0 cursor-pointer text-sm font-medium p-0"
                      value={isPaidFilter}
                      onChange={(e) => setIsPaidFilter(e.target.value)}
                    >
                      <option value="">報酬 (すべて)</option>
                      <option value="paid">有償</option>
                      <option value="unpaid">無償</option>
                    </select>
                  </div>
                </th>
                <th className="px-4 py-3 w-[100px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 border-b border-gray-100 text-center">
                    <Loader2 className="animate-spin text-[#1E3A5F] mx-auto" size={32} />
                  </td>
                </tr>
              ) : filteredAndSortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 border-b border-gray-100 text-center text-gray-500">
                    該当する求人が見つかりませんでした。
                  </td>
                </tr>
              ) : (
                filteredAndSortedJobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/student/jobs/${job.id}`}>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap border-b border-gray-100">
                      {job.companyName || job.company?.name || '企業名不明'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="font-bold text-[#1E3A5F] line-clamp-2 mb-1 group-hover:text-[#2D5A8E]">
                        {job.title}
                        {job.status === 'published' && <Badge variant="success" className="ml-2 py-0 px-1 text-[10px] whitespace-nowrap">募集中</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.occupation || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.minCapacity ? `${job.minCapacity}名〜` : '定員なし'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.workFormat || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap truncate max-w-[150px]" title={job.location}>{job.location || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.isPaid ? '有償' : '無償'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/student/jobs/${job.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="whitespace-nowrap">
                          詳細へ
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
