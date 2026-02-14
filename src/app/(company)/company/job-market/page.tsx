"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobPosting, Company } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, MapPin, Building, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface JobWithCompany extends JobPosting {
  company: Company;
}

export default function JobMarketPage() {
  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const q = query(
          collection(db, 'jobPostings'),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        
        const jobsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as JobPosting;
            let companyData = {} as Company;
            if (data.companyId) {
                const companySnap = await getDoc(doc(db, 'companies', data.companyId));
                if (companySnap.exists()) {
                    companyData = companySnap.data() as Company;
                }
            }
            return {
                ...data,
                id: docSnap.id,
                company: companyData
            } as JobWithCompany;
        }));

        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">公開求人一覧</h1>
        <p className="text-gray-500">現在公開されている全ての求人を確認できます</p>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <p>現在公開されている求人はありません。</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-[#1E3A5F]">{job.title}</h3>
                      <Badge variant="outline" className="text-xs">{job.company?.name || '企業名不明'}</Badge>
                   </div>
                   
                   <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                         <MapPin size={14} />
                         <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                         <Calendar size={14} />
                         <span>{job.createdAt ? format(job.createdAt.toDate(), 'yyyy/MM/dd') : '-'}</span>
                      </div>
                   </div>

                   <div className="flex gap-2">
                      {job.requirements.slice(0, 3).map((req, i) => (
                        <Badge key={i} variant="outline" className="bg-gray-50">{req}</Badge>
                      ))}
                      {job.requirements.length > 3 && (
                        <span className="text-xs text-gray-400 self-center">+{job.requirements.length - 3}</span>
                      )}
                   </div>
                </div>
                
                <div className="flex items-center">
                  <Link href={`/company/jobs/${job.id}`}> 
                    {/* Note: /company/jobs/[id] will likely show edit view if owner, or detail view if not. 
                        Ideally we'd have a public view or re-use student view. 
                        Assuming company/jobs/[id] handles ownership check or displays readonly for non-owners.
                        If not, we might need a separate route or update the component. 
                        Let's link to it for now assuming it shows details. */}
                    <Button variant="outline">詳細を見る</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
