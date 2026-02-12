import { db } from '@/lib/firebase';
import { 
  collection, doc, updateDoc, query, where, orderBy, onSnapshot, limit, serverTimestamp, writeBatch, getDocs 
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
}

export const notificationService = new NotificationService();

export function useNotifications(userId: string | undefined) {
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

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20) // Limit to recent 20
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(msgs);
      setUnreadCount(msgs.filter(m => !m.read).length); // Count unread in FETCHED set (simplified)
      // Note: Real unread count might need a separate count query if we limit fetched items, 
      // but for this scale, client-side count of recent items is acceptable or '9+' style.
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { notifications, unreadCount, loading };
}
