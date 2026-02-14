"use client";

import { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, getDoc, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader2, ExternalLink, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface StudentWithEmail extends Student {
  email?: string;
  createdAt?: any;
  role?: string;
}

export default function AdminUsersPage() {
  const [students, setStudents] = useState<StudentWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithEmail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchStudents() {
      try {
        const q = query(collection(db, 'students'));
        const snapshot = await getDocs(q);
        
        const studentsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
           const student = { userId: docSnap.id, ...docSnap.data() } as StudentWithEmail;
           try {
              const userSnap = await getDoc(doc(db, 'users', student.userId));
              if (userSnap.exists()) {
                 const userData = userSnap.data();
                 student.email = userData.email;
                 student.createdAt = userData.createdAt;
                 student.role = userData.role;
              }
           } catch (e) { console.warn(e); }
           return student;
        }));
        
        studentsData.sort((a, b) => {
           if (a.createdAt && b.createdAt) {
              return b.createdAt.toMillis() - a.createdAt.toMillis();
           }
           return 0;
        });

        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!confirm('このユーザーを削除してもよろしいですか？取り消せません。')) return;
    try {
      await deleteDoc(doc(db, 'students', userId));
      await deleteDoc(doc(db, 'users', userId));
      setStudents(prev => prev.filter(s => s.userId !== userId));
      setSelectedStudent(null);
    } catch (error) {
       console.error(error);
       alert('削除に失敗しました');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!confirm(`ユーザーのロールを "${newRole}" に変更しますか？\n権限が即座に変更されます。`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      
      // Update local state
      setStudents(prev => prev.map(s => s.userId === userId ? { ...s, role: newRole } : s));
      if (selectedStudent?.userId === userId) {
        setSelectedStudent(prev => prev ? { ...prev, role: newRole } : null);
      }
      alert('ロールを変更しました');
    } catch (e) {
      console.error(e);
      alert('変更に失敗しました');
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    const name = student.name?.toLowerCase() || '';
    const uni = student.university?.toLowerCase() || '';
    return name.includes(lower) || uni.includes(lower);
  });

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1E3A5F]" /></div>;

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-2xl font-bold text-[#1E3A5F]">登録学生一覧</h1>
           <p className="text-gray-500">プラットフォームに登録されている全学生ユーザー</p>
         </div>
         <input
           type="text"
           placeholder="名前・大学名で検索..."
           className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
        />
       </div>

      {filteredStudents.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <p>条件に一致する学生はいません。</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.userId} className="p-6 flex flex-col h-full hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {student.name ? student.name.charAt(0) : <User />}
                 </div>
                 <div className="overflow-hidden">
                    <h3 className="text-lg font-bold text-[#1E3A5F] truncate">{student.name || 'No Name'}</h3>
                    <p className="text-xs text-gray-500 truncate">{student.university} {student.grade}</p>
                 </div>
              </div>

              <div className="flex-1 space-y-3 mb-4">
                 <div className="text-xs text-gray-600 mb-2 truncate">
                    {student.email || 'Email不明'}
                 </div>

                 <div className="flex flex-wrap gap-1">
                    {student.skills?.slice(0, 5).map((skill, i) => (
                       <Badge key={i} variant="outline" className="text-xs bg-gray-50">{skill}</Badge>
                    ))}
                 </div>
              </div>
              
              <div className="text-xs text-gray-400 mb-4">
                 登録日: {student.createdAt ? format(student.createdAt.toDate(), 'yyyy/MM/dd') : '-'}
              </div>

              <div className="mt-auto pt-4 border-t">
                 <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedStudent(student)}
                 >
                    詳細を確認
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="学生プロフィール詳細">
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                  {selectedStudent.name ? selectedStudent.name.charAt(0) : <User />}
               </div>
               <div>
                  <h2 className="text-xl font-bold text-[#1E3A5F]">{selectedStudent.name}</h2>
                  <p className="text-gray-500">{selectedStudent.email}</p>
                  <p className="text-sm text-gray-600">{selectedStudent.university} {selectedStudent.grade}</p>
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
            
            <div className="pt-4 border-t text-xs text-gray-400 text-right">
               User ID: {selectedStudent.userId}
            </div>

            <div className="pt-4 border-t bg-gray-50 p-4 rounded-lg">
               <h3 className="text-sm font-bold text-[#1E3A5F] mb-2">ロール変更 (管理者機能)</h3>
               <div className="flex items-center gap-2">
                  <select 
                     className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                     value={selectedStudent.role || 'student'}
                     onChange={(e) => handleUpdateRole(selectedStudent.userId, e.target.value)}
                  >
                     <option value="student">Student (学生)</option>
                     <option value="company">Company (企業)</option>
                     <option value="admin">Admin (管理者)</option>
                  </select>
                  <span className="text-xs text-red-500">※慎重に操作してください</span>
               </div>
            </div>

            <div className="flex justify-between pt-2">
               <Button 
                  variant="ghost" 
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleDelete(selectedStudent.userId)}
               >
                  <Trash2 size={16} className="mr-2" /> 削除
               </Button>
               <Button variant="secondary" onClick={() => setSelectedStudent(null)}>閉じる</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
