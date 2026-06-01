# Firebase Google OAuth In-App Setup Guide

## Overview
The app now uses Firebase Authentication for Google Sign-In instead of opening a browser. This works both on web and native Android/iOS.

## Prerequisites
- Firebase project created at [https://console.firebase.google.com](https://console.firebase.google.com)
- Google Sign-In enabled in Firebase Authentication
- Firebase credentials ready

## Step 1: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Settings** → **Project Settings**
4. Scroll to **Your Apps** section
5. Find your web app and click the settings icon
6. Copy the Firebase configuration (you'll see an object with `apiKey`, `authDomain`, etc.)

## Step 2: Add to Environment Variables

Create or update `.env.local` in the `impactVault/` directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Example (replace with your actual values):
```env
VITE_FIREBASE_API_KEY=AIzaSyDxxx...
VITE_FIREBASE_AUTH_DOMAIN=impactvault-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=impactvault-dev
VITE_FIREBASE_STORAGE_BUCKET=impactvault-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123...
```

## Step 3: Configure for Android

1. Download `google-services.json` from Firebase Console:
   - Project Settings → Your Apps → Android app → Download google-services.json

2. Place it in: `impactVault/android/app/google-services.json`

3. The Firebase plugin is already configured in Android build files

## Step 4: Configure for iOS (if applicable)

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in: `impactVault/ios/App/GoogleService-Info.plist`

## Step 5: Base44 Backend Configuration

Make sure your Base44 backend supports Firebase token exchange:

**Endpoint**: `POST /api/apps/{appId}/auth/oauth/firebase-callback`

**Request**:
```json
{
  "id_token": "Firebase_ID_Token_Here",
  "provider": "google"
}
```

**Response**:
```json
{
  "token": "base44_session_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

If this endpoint doesn't exist, implement it to:
1. Verify the Firebase ID token
2. Get user info from the token
3. Create/update user in your Base44 database
4. Return a session token for API authentication

## Step 6: Build and Test

```bash
# Build mobile
npm run build:mobile

# Sync Android
npm run sync:android

# Build APK (if testing on device)
npm run build:apk

# Or open Android Studio
npm run open:android
```

## How It Works

### Web Flow
1. User clicks "Sign in with Google"
2. Firebase shows Google sign-in popup
3. User authenticates with Google
4. Firebase returns ID token
5. App exchanges ID token for Base44 session token
6. User is logged in and redirected to Dashboard

### Native (Android) Flow
1. User clicks "Sign in with Google"
2. Capacitor Firebase plugin shows native Google sign-in
3. User authenticates with Google account
4. Plugin returns ID token
5. App exchanges ID token for Base44 session token
6. User is logged in and redirected to Dashboard

## Troubleshooting

### "Firebase configuration is incomplete"
- Check `.env.local` file exists in `impactVault/` directory
- Verify all `VITE_FIREBASE_*` variables are set
- Restart dev server after adding environment variables

### "Firebase not initialized" on mobile
- Ensure `google-services.json` is in `impactVault/android/app/`
- Run `npm run sync:android` to copy latest config
- Rebuild APK: `npm run build:apk`

### "App not found" error after sign-in
- This is likely a Base44 backend issue
- Ensure the `/auth/oauth/firebase-callback` endpoint exists
- Check backend logs for token exchange errors

### Pop-up blocked on web
- Browser blocked the sign-in pop-up
- User needs to allow pop-ups from the site
- Or temporarily disable pop-up blocker

### Native sign-in not working
- Verify `google-services.json` SHA-1 fingerprint matches Firebase config
- Run: `keytool -list -v -keystore ~/.android/debug.keystore`
- Update Firebase project with the correct SHA-1

## Files Modified

- `src/lib/firebase-config.js` - Firebase initialization
- `src/lib/google-auth.js` - Google Sign-In (native + web)
- `src/api/auth-service.js` - Firebase token exchange endpoint
- `src/pages/MobileLogin.jsx` - Updated to use Firebase

## Next Steps

1. Add your Firebase credentials to `.env.local`
2. Implement the `/auth/oauth/firebase-callback` endpoint in your Base44 backend
3. Rebuild and test the app
4. Monitor logs for any issues

## Testing Checklist

- [ ] Firebase configuration added to `.env.local`
- [ ] Backend Firebase token exchange endpoint implemented
- [ ] `npm run build:mobile` completes without errors
- [ ] Web: Google sign-in popup appears and works
- [ ] Mobile: Native Google sign-in prompt appears
- [ ] After sign-in, user is authenticated and redirected to Dashboard
- [ ] User profile shows in app after login
