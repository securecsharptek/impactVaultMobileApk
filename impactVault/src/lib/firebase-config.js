import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Firebase configuration from environment or inline config
// You need to add these to your .env.local file:
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase config
const validateFirebaseConfig = () => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(
    (field) => !firebaseConfig[field]
  );

  if (missingFields.length > 0) {
    console.warn(
      '[Firebase] Missing configuration fields:',
      missingFields.join(', '),
      '\nAdd these to your .env.local file'
    );
    return false;
  }

  return true;
};

let firebaseApp = null;
let firebaseAuth = null;

export const initializeFirebase = async () => {
  if (firebaseApp) {
    console.log('[Firebase] Already initialized');
    return { app: firebaseApp, auth: firebaseAuth };
  }

  if (!validateFirebaseConfig()) {
    throw new Error('Firebase configuration is incomplete');
  }

  try {
    console.log('[Firebase] Initializing Firebase app');
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);

    // Set persistence for web/mobile
    if (typeof window !== 'undefined') {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
        console.log('[Firebase] Persistence set to browser local storage');
      } catch (error) {
        console.warn('[Firebase] Could not set persistence:', error.message);
      }
    }

    console.log('[Firebase] Firebase initialized successfully');
    return { app: firebaseApp, auth: firebaseAuth };
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error);
    throw error;
  }
};

export const getFirebaseAuth = () => {
  if (!firebaseAuth) {
    throw new Error(
      'Firebase not initialized. Call initializeFirebase() first.'
    );
  }
  return firebaseAuth;
};

export const getFirebaseApp = () => {
  if (!firebaseApp) {
    throw new Error(
      'Firebase not initialized. Call initializeFirebase() first.'
    );
  }
  return firebaseApp;
};
