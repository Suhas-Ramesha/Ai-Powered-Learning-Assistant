import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      project_id: 'ai-powered-learning-assi-9d48d',
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: 'ai-powered-learning-assi-9d48d.appspot.com',
  });
}

// Export Firestore and Storage instances
export const db = getFirestore();
export const bucket = getStorage().bucket();

export default { db, bucket };
