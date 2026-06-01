import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { getFirebaseAuth, initializeFirebase } from './firebase-config';
import { appParams } from '@/lib/app-params';

const isNativeRuntime = () => Capacitor.isNativePlatform();

/**
 * Initialize Google Sign-In for both web and native
 */
export const initializeGoogleAuth = async () => {
  try {
    console.log('[GoogleAuth] Initializing Google Auth');

    // Initialize Firebase first
    await initializeFirebase();

    if (isNativeRuntime()) {
      console.log('[GoogleAuth] Initializing Capacitor Firebase for native');
      
      // Initialize the Firebase Authentication plugin on native
      try {
        await FirebaseAuthentication.initialize();
        console.log('[GoogleAuth] FirebaseAuthentication plugin initialized');
      } catch (error) {
        console.warn('[GoogleAuth] Plugin initialization warning:', error.message);
        // Continue anyway - plugin might auto-initialize
      }
      
      console.log('[GoogleAuth] Native Google Auth ready');
    } else {
      console.log('[GoogleAuth] Web Google Auth ready');
    }

    return true;
  } catch (error) {
    console.error('[GoogleAuth] Failed to initialize:', error);
    throw error;
  }
};

/**
 * Sign in with Google (handles both web and native)
 * @returns {Promise<{user: object, idToken: string, accessToken?: string}>}
 */
export const signInWithGoogle = async () => {
  try {
    console.log('[GoogleAuth] Starting Google Sign-In');

    if (isNativeRuntime()) {
      return await signInWithGoogleNative();
    } else {
      return await signInWithGoogleWeb();
    }
  } catch (error) {
    console.error('[GoogleAuth] Google Sign-In failed:', error);
    throw error;
  }
};

/**
 * Native Google Sign-In using Capacitor Firebase
 */
const signInWithGoogleNative = async () => {
  try {
    console.log('[GoogleAuth] Starting native Google Sign-In');

    // Ensure FirebaseAuthentication is initialized
    try {
      await FirebaseAuthentication.initialize();
    } catch (e) {
      console.log('[GoogleAuth] Plugin auto-initialize or already initialized');
    }

    console.log('[GoogleAuth] Calling FirebaseAuthentication.signInWithGoogle()');
    
    // Use Capacitor Firebase Authentication plugin
    const result = await FirebaseAuthentication.signInWithGoogle();

    console.log('[GoogleAuth] Native sign-in result:', result);
    console.log('[GoogleAuth] Native sign-in successful');

    if (!result.user) {
      throw new Error('No user returned from native Google sign-in');
    }

    // Get the ID token from the sign-in result
    const idToken = result.idToken;

    if (idToken) {
      return {
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoUrl: result.user.photoUrl
        },
        idToken: idToken,
        accessToken: result.accessToken
      };
    }

    // If idToken is not directly available, try to get it from the user
    console.warn('[GoogleAuth] No idToken in result, attempting alternative approach');
    
    try {
      const currentUser = await FirebaseAuthentication.getCurrentUser();
      if (!currentUser?.idToken) {
        throw new Error('Unable to retrieve ID token after native sign-in');
      }
      return {
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoUrl: result.user.photoUrl
        },
        idToken: currentUser.idToken,
        accessToken: currentUser.accessToken
      };
    } catch (tokenError) {
      throw new Error('Unable to retrieve ID token: ' + tokenError.message);
    }
  } catch (error) {
    console.error('[GoogleAuth] Native sign-in error:', error);
    console.error('[GoogleAuth] Error message:', error.message);
    console.error('[GoogleAuth] Error code:', error.code);
    
    // Provide more detailed error messages
    let userMessage = error.message || 'Native Google Sign-In failed';
    
    if (error.message?.includes('provider')) {
      userMessage = 'Google provider is not configured. Please ensure Firebase and google-services.json are properly set up.';
    } else if (error.message?.includes('not enabled')) {
      userMessage = 'Google sign-in is not enabled in Firebase console or Capacitor configuration.';
    }
    
    throw {
      message: userMessage,
      code: error.code || 'NATIVE_SIGNIN_ERROR',
      originalError: error
    };
  }
};

/**
 * Web Google Sign-In using Firebase
 */
const signInWithGoogleWeb = async () => {
  try {
    console.log('[GoogleAuth] Starting web Google Sign-In');

    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();

    // Configure Google provider for mobile web
    provider.addScope('profile');
    provider.addScope('email');

    const result = await signInWithPopup(auth, provider);

    console.log('[GoogleAuth] Web sign-in successful');

    if (!result.user) {
      throw new Error('No user returned from web Google sign-in');
    }

    // Get the ID token
    const idToken = await result.user.getIdToken();

    return {
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoUrl: result.user.photoURL
      },
      idToken: idToken,
      accessToken: result.credential?.accessToken
    };
  } catch (error) {
    console.error('[GoogleAuth] Web sign-in error:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/popup-blocked') {
      throw {
        message: 'Pop-up was blocked. Please allow pop-ups and try again.',
        code: 'POPUP_BLOCKED'
      };
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw {
        message: 'Sign-in was cancelled',
        code: 'SIGNIN_CANCELLED'
      };
    }

    throw {
      message: error.message || 'Web Google Sign-In failed',
      code: error.code || 'WEB_SIGNIN_ERROR'
    };
  }
};

/**
 * Sign out from Google
 */
export const signOutGoogle = async () => {
  try {
    console.log('[GoogleAuth] Signing out from Google');

    if (isNativeRuntime()) {
      // Sign out from Capacitor Firebase
      await FirebaseAuthentication.signOut();
      console.log('[GoogleAuth] Native sign-out successful');
    } else {
      // Sign out from Firebase
      const auth = getFirebaseAuth();
      await signOut(auth);
      console.log('[GoogleAuth] Web sign-out successful');
    }

    return true;
  } catch (error) {
    console.error('[GoogleAuth] Sign-out error:', error);
    throw error;
  }
};

/**
 * Get current Google user
 */
export const getCurrentGoogleUser = async () => {
  try {
    if (isNativeRuntime()) {
      const result = await FirebaseAuthentication.getCurrentUser();
      return result?.user || null;
    } else {
      const auth = getFirebaseAuth();
      return auth.currentUser;
    }
  } catch (error) {
    console.error('[GoogleAuth] Error getting current user:', error);
    return null;
  }
};
