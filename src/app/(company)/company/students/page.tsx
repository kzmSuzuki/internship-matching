"use client";

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, GraduationCap, MapPin, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const q = query(collection(db, 'students'));
        const snapshot = await getDocs(q);
        const studentsData = snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() } as Student));
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">学生一覧</h1>
        <p className="text-gray-500">登録されている学生のプロフィールを確認できます</p>
      </div>

      {students.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <p>登録されている学生はいません。</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <Card key={student.userId} className="p-6 flex flex-col h-full hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {student.name.charAt(0)}
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-[#1E3A5F]">{student.name}</h3>
                    <p className="text-xs text-gray-500">{student.university} {student.grade}</p>
                 </div>
              </div>

              <div className="flex-1 space-y-3">
                 <div className="flex flex-wrap gap-1">
                    {student.skills?.slice(0, 5).map((skill, i) => (
                       <Badge key={i} variant="outline" className="text-xs bg-gray-50">{skill}</Badge>
                    ))}
                    {student.skills?.length > 5 && (
                       <span className="text-xs text-gray-400">+{student.skills.length - 5}</span>
                    )}
                 </div>
                 
                 <p className="text-sm text-gray-600 line-clamp-3">
                    {student.bio || '自己紹介文はまだありません。'}
                 </p>
              </div>

              <div className="mt-4 pt-4 border-t">
                 <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedStudent(student)}
                 >
                    プロフィール詳細
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="学生プロフィール">
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                  {selectedStudent.name.charAt(0)}
               </div>
               <div>
                  <h2 className="text-xl font-bold text-[#1E3A5F]">{selectedStudent.name}</h2>
                  <p className="text-gray-500">{selectedStudent.university} {selectedStudent.grade}</p>
               </div>
            </div>

            <div>
               <h3 className="text-sm font-bold text-gray-700 mb-2">自己紹介 / BIO</h3>
               <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedStudent.bio || '未入力'}
               </div>
            </div>

            <div>
               <h3 className="text-sm font-bold text-gray-700 mb-2">スキル</h3>
               <div className="flex flex-wrap gap-2">
                  {selectedStudent.skills?.map((skill, i) => (
                     <Badge key={i} variant="outline" className="bg-white">{skill}</Badge>
                  ))}
               </div>
            </div>

            <div>
               <h3 className="text-sm font-bold text-gray-700 mb-2">リンク / ポートフォリオ</h3>
               {selectedStudent.links && selectedStudent.links.length > 0 ? (
                  <ul className="space-y-2">
                     {selectedStudent.links.map((link, i) => (
                        <li key={i} className="flex items-center gap-2">
                           <ExternalLink size={14} className="text-blue-500" />
                           <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-full block">
                              {link}
                           </a>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="text-sm text-gray-400">リンクはありません</p>
               )}
            </div>

            <div className="flex justify-end pt-4 border-t">
               <Button variant="secondary" onClick={() => setSelectedStudent(null)}>閉じる</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
