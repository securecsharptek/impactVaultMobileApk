# Android OAuth Implementation Guide for impactVault

## Overview
This guide provides step-by-step instructions to build and deploy the impactVault app to Android with proper OAuth authentication handling.

## Prerequisites
- Node.js (v18+)
- Android SDK (API 31+)
- Android Studio (recommended for testing)
- Java Development Kit (JDK 11+)
- Gradle

## Key Changes Made

### 1. **Capacitor Configuration** (`capacitor.config.ts`)
- Added proper `allowNavigation` rules for deep links
- Configured Browser plugin for OAuth
- Enabled deep link subscriber

### 2. **Android Manifest** (`AndroidManifest.xml`)
- Added intent filter for deep link: `com.vault.impactVault://auth`
- Set `launchMode="singleTask"` to prevent multiple instances
- Configured `autoVerify="false"` for custom scheme

### 3. **Native Auth Module** (`src/lib/native-auth.js`)
- Enhanced with comprehensive logging for debugging
- Improved error handling and recovery
- Added timeout configurations
- Better deep link handling

### 4. **Environment Configuration** (`.env.mobile`)
- Created mobile-specific environment variables
- Configured native auth scheme and host

### 5. **MainActivity** (`MainActivity.java`)
- Added deep link logging for debugging
- Improved intent handling

## Build Instructions

### Step 1: Update Environment Variables

Before building, ensure your `.env.mobile` file contains:

```bash
VITE_BASE44_APP_ID=6a07b28a6cfaff8f09df371b
VITE_BASE44_APP_BASE_URL=https://impact-vault-app-copy-09df371b.base44.app
VITE_NATIVE_AUTH_SCHEME=com.vault.impactVault
VITE_NATIVE_AUTH_HOST=auth
```

### Step 2: Build Web Assets

```bash
# Install dependencies
npm install

# Build with mobile environment
npm run build

# Or use mobile-specific env:
cross-env NODE_ENV=production npx vite build --mode mobile
```

**Note:** If `cross-env` is not installed, install it globally:
```bash
npm install -g cross-env
```

### Step 3: Sync with Capacitor

```bash
cd impactVault

# Sync the built dist folder with Android platform
npx cap sync android

# Or copy specifically
npx cap copy android
```

### Step 4: Open Android Studio

```bash
# Open in Android Studio
npx cap open android
```

Or manually:
1. Open Android Studio
2. File → Open → Select `impactVault/android` folder

### Step 5: Build APK

**Option A: Using Android Studio (Recommended)**
1. Open Android Studio
2. Go to Build → Build Bundle(s)/APK(s) → Build APK(s)
3. Wait for build to complete
4. APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Using Command Line**

```bash
cd impactVault/android

# Debug APK
./gradlew assembleDebug

# Release APK (requires signing configuration)
./gradlew assembleRelease

# Output location: app/build/outputs/apk/debug/app-debug.apk
```

### Step 6: Install on Device or Emulator

```bash
# Using ADB (if device is connected)
adb install -r impactVault/android/app/build/outputs/apk/debug/app-debug.apk

# Or drag & drop to Android Studio emulator
```

## Testing OAuth Flow

### Manual Testing Steps:

1. **Launch the app** on your Android device/emulator
2. **Tap Login/Google Sign-In button**
3. **Browser should open** showing login screen
4. **Log in with credentials**
5. **App should automatically return** after successful authentication
6. **Check console logs** by running: `adb logcat | grep OAuth`

### Expected Behavior:

```
[OAuth] Setting up native auth listener
[OAuth] Opening native login with appBaseUrl: https://impact-vault-app-copy-09df371b.base44.app
[OAuth] Using callback URL: com.vault.impactVault://auth
[OAuth] Opening browser with login URL: [full OAuth URL]
[OAuth] Browser opened successfully
[OAuth] App URL open event received: com.vault.impactVault://auth?access_token=...
[OAuth] Processing auth callback URL
[OAuth] Auth token received, storing in localStorage
[OAuth] Browser closed successfully
[OAuth] Auth params changed, calling callback
```

## Troubleshooting

### Issue: Browser doesn't open
**Solution:**
- Check if `@capacitor/browser` is installed: `npm list @capacitor/browser`
- Verify Capacitor version: `npm list @capacitor/core`
- Install/update: `npm install @capacitor/browser@latest`

### Issue: OAuth redirects to web instead of app
**Solution:**
- ❌ Verify Base44 OAuth settings have redirect URI: `com.vault.impactVault://auth`
- ✅ In your Base44 app dashboard → Settings → OAuth Redirect URIs
- Add: `com.vault.impactVault://auth`

### Issue: Deep link not caught by app
**Solution:**
- Test deep link: `adb shell am start -a android.intent.action.VIEW -d "com.vault.impactVault://auth?access_token=test" com.vault.impactVault`
- Check logcat: `adb logcat | grep -i "deep\|auth\|MainActivity"`
- Verify AndroidManifest.xml has correct intent filter

### Issue: Token not stored/persisted
**Solution:**
- Check storage: `adb shell am start com.vault.impactVault` then open DevTools
- Verify localStorage is accessible: Check browser console for errors
- Inspect localStorage: Right-click in app → Inspect → Application → Local Storage

### Issue: App crashes on launch
**Solution:**
- Check logcat: `adb logcat | grep FATAL`
- Ensure `dist` folder exists and is not empty: `ls impactVault/dist/`
- Rebuild: `npm run build && npx cap sync android`

### Issue: "Cannot resolve appBaseUrl"
**Solution:**
- Verify `.env.mobile` exists with `VITE_BASE44_APP_BASE_URL`
- Check `capacitor.config.ts` has base URL
- For development: Update `app-params.js` to log values

## Advanced: For Release Build

### Step 1: Generate Signing Key (First time only)

```bash
cd impactVault/android/app

keytool -genkey -v -keystore impactVault.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias impactVault
```

Store the password securely!

### Step 2: Configure Gradle Signing

Edit `android/app/build.gradle`:

```gradle
android {
  signingConfigs {
    release {
      storeFile file('impactVault.keystore')
      storePassword System.getenv("KEYSTORE_PASSWORD") ?: "your_password"
      keyAlias 'impactVault'
      keyPassword System.getenv("KEY_PASSWORD") ?: "your_password"
    }
  }
  
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

### Step 3: Build Release APK

```bash
cd impactVault/android

./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

## Debugging with Chrome DevTools

1. Open Chrome and go to: `chrome://inspect`
2. Enable "Discover network targets"
3. Connect device via USB
4. Run app on device
5. Your app should appear in Chrome DevTools

## Additional Environment Variables

```bash
# Optional: For Google Sign-In specific configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Optional: For Firebase
VITE_FIREBASE_CONFIG={...}

# Optional: API Endpoints
VITE_API_BASE_URL=https://api.example.com
```

## Scripts to Add to package.json

```json
{
  "scripts": {
    "build:mobile": "cross-env NODE_ENV=production npx vite build",
    "build:apk": "npm run build:mobile && npx cap sync android && cd android && ./gradlew assembleDebug",
    "sync:android": "npx cap sync android",
    "open:android": "npx cap open android",
    "adb:logcat": "adb logcat | grep -E 'OAuth|impactVault|Capacitor'"
  }
}
```

Then use:
```bash
npm run build:apk
npm run open:android
npm run adb:logcat
```

## Final Checklist

- [ ] Capacitor config updated with proper server allowNavigation
- [ ] AndroidManifest.xml has deep link intent filter
- [ ] .env.mobile configured with correct Base44 URLs
- [ ] native-auth.js has proper error handling
- [ ] MainActivity.java includes deep link logging
- [ ] Android SDK/Studio installed
- [ ] Device/Emulator with API 31+ available
- [ ] Base44 OAuth redirect URI includes `com.vault.impactVault://auth`
- [ ] npm dependencies up to date: `npm install @capacitor/browser@latest`
- [ ] Built APK runs and OAuth flow completes

## Support

If you encounter issues:
1. Check the console logs with: `adb logcat | grep OAuth`
2. Verify all environment variables are set
3. Clear Android build cache: `cd android && ./gradlew clean`
4. Rebuild: `npm run build:mobile && npx cap sync android`
