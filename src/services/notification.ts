import { db } from '@/lib/firebase';
import { 
  collection, doc, updateDoc, query, where, orderBy, onSnapshot, limit, serverTimestamp, writeBatch, getDocs, addDoc  
} from 'firebase/firestore';
import { Notification } from '@/types';
import { useState, useEffect } from 'react';

class NotificationService {
  async markAsRead(notificationId: string) {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, {
      read: true,
      updatedAt: serverTimestamp(),
    });
  }

  async markAllAsRead(userId: string) {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
       batch.update(doc.ref, { read: true, updatedAt: serverTimestamp() });
    });
    
    await batch.commit();
  }
  async createNotification(recipientId: string, title: string, message: string, type: string, link?: string) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        title,
        message,
        type,
        link,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error creating notification:", e);
    }
  }
}

export const notificationService = new NotificationService();

export function useNotifications(userId: string | undefined, role?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
       setNotifications([]);
       setUnreadCount(0);
       setLoading(false);
       return;
    }

    let q;
    // If admin, fetch personal notifications AND 'admin' role notifications
    if (role === 'admin') {
      q = query(
        collection(db, 'notifications'),
        where('userId', 'in', [userId, 'admin']),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    } else {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(msgs);
      setUnreadCount(msgs.filter(m => !m.read).length); 
      setLoading(false);
    }, (error) => {
       console.error("Notification listener error:", error);
       setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role]);

  return { notifications, unreadCount, loading };
}
