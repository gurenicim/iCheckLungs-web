import { useState, useRef } from 'react';
import { type User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getToken } from 'firebase/app-check';
import { storage, db, appCheck } from '../../firebase/config';

export type ScanPhase =
  | { type: 'idle' }
  | { type: 'uploading' }
  | { type: 'submitting' }
  | { type: 'pending' }
  | { type: 'done'; findings: string; confidence: string }
  | { type: 'failed'; message: string };

export function useScan(user: User) {
  const [phase, setPhase] = useState<ScanPhase>({ type: 'idle' });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  function reset() {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setPhase({ type: 'idle' });
  }

  async function submitScan(file: File) {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    const scanId = crypto.randomUUID();
    const uid = user.uid;

    try {
      // Upload image
      setPhase({ type: 'uploading' });
      const storageRef = ref(storage, `users/${uid}/scans/${scanId}/image.jpg`);
      await uploadBytes(storageRef, file, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(storageRef);
      // Convert to gs:// URL for backend
      const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
      const storagePath = `users/${uid}/scans/${scanId}/image.jpg`;
      const storageUrl = `gs://${bucket}/${storagePath}`;

      // Create pending Firestore doc
      await setDoc(doc(db, 'users', uid, 'scans', scanId), {
        status: 'pending',
        imageUrl: downloadUrl,
        createdAt: serverTimestamp(),
      });

      // Submit to backend
      setPhase({ type: 'submitting' });
      const [idToken, appCheckToken] = await Promise.all([
        user.getIdToken(),
        getToken(appCheck).then((r) => r.token),
      ]);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          'X-Firebase-AppCheck': appCheckToken,
        },
        body: JSON.stringify({ storageUrl, scanId, userId: uid }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Server error ${res.status}`);
      }

      // Listen for result
      setPhase({ type: 'pending' });
      unsubscribeRef.current = onSnapshot(
        doc(db, 'users', uid, 'scans', scanId),
        (snap) => {
          const data = snap.data();
          if (!data || data.status === 'pending') return;
          unsubscribeRef.current?.();
          unsubscribeRef.current = null;
          if (data.status === 'done') {
            setPhase({ type: 'done', findings: data.findings ?? '', confidence: data.confidence ?? '' });
          } else {
            setPhase({ type: 'failed', message: data.error ?? 'Analysis failed' });
          }
        },
        (err) => {
          setPhase({ type: 'failed', message: err.message });
        }
      );
    } catch (err: unknown) {
      setPhase({ type: 'failed', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return { phase, submitScan, reset };
}
