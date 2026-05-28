# impactVault Mobile Authentication Setup

This document covers the mobile-specific login, signup, and OAuth integration for Android.

## Overview

The mobile authentication system includes:
- **Native Mobile Login UI** - Custom login/signup form for mobile devices
- **Email/Password Authentication** - Direct integration with Base44 auth API
- **Google OAuth** - Native OAuth flow using Capacitor Browser plugin
- **Deep Link Handling** - Automatic return from OAuth browser to app

## Files Created/Modified

### New Files

1. **[src/api/auth-service.js](src/api/auth-service.js)**
   - `authService.register()` - Register new users
   - `authService.login()` - Email/password login
   - `authService.getOAuthUrl()` - Get OAuth URL for web
   - `authService.getOAuthUrlWithRedirect()` - Get OAuth URL with custom redirect
   - `authService.handleOAuthCallback()` - Handle OAuth callback

2. **[src/pages/MobileLogin.jsx](src/pages/MobileLogin.jsx)**
   - Mobile-optimized login/signup UI
   - Tab interface for login and signup modes
   - Form validation and error handling
   - Google OAuth integration
   - Responsive design for mobile screens

### Modified Files

1. **[src/App.jsx](src/App.jsx)**
   - Import MobileLogin component
   - Show MobileLogin page when auth is required on mobile
   - Add /MobileLogin route

2. **[src/lib/native-auth.js](src/lib/native-auth.js)**
   - Added `openNativeGoogleLogin()` function for mobile OAuth
   - Better error handling and logging

## API Endpoints Used

### Register
```
POST https://impact-vault-app-copy-09df371b.base44.app/api/apps/6a07b28a6cfaff8f09df371b/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}

Response:
{
  "token": "access_token_here",
  "user": { ... }
}
```

### Login
```
POST https://impact-vault-app-copy-09df371b.base44.app/api/apps/6a07b28a6cfaff8f09df371b/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "access_token_here",
  "user": { ... }
}
```

### Google OAuth
```
GET https://impact-vault-app-copy-09df371b.base44.app/api/apps/6a07b28a6cfaff8f09df371b/auth/oauth/google?redirect_uri=CALLBACK_URL

Returns redirect to Google OAuth flow
After user authenticates, redirects back to:
com.vault.impactVault://auth?access_token=...
```

## How It Works

### Login Flow (Mobile)

1. User opens app without authentication token
2. `AuthContext` detects auth_required error
3. On mobile (`isNativeRuntime() === true`), shows `MobileLogin` page
4. User enters email/password and clicks "Login"
5. `authService.login()` calls `/auth/login` endpoint
6. Token received and stored in `localStorage`
7. `checkAppState()` is called to refresh auth context
8. User is redirected to app dashboard

### Signup Flow (Mobile)

1. User selects "Sign Up" tab on login page
2. User fills in email, password, and full name
3. Form validation ensures all fields are valid
4. `authService.register()` calls `/auth/register` endpoint
5. Token received and stored in `localStorage`
6. `checkAppState()` is called to refresh auth context
7. User is redirected to app dashboard

### Google OAuth Flow (Mobile)

1. User clicks "Continue with Google" button
2. On mobile, `openNativeGoogleLogin()` opens a native browser
3. Browser navigates to `/auth/oauth/google` endpoint
4. User authenticates with Google
5. Google redirects to `com.vault.impactVault://auth?access_token=...`
6. Deep link listener captures this URL
7. Token is extracted and stored in `localStorage`
8. Browser is closed automatically
9. `checkAppState()` is called to refresh auth context
10. User is logged in and redirected to dashboard

## Configuration Required

### 1. Environment Variables (.env)

```
VITE_BASE44_APP_ID=6a07b28a6cfaff8f09df371b
VITE_BASE44_APP_BASE_URL=https://impact-vault-app-copy-09df371b.base44.app
VITE_NATIVE_AUTH_SCHEME=com.vault.impactVault
VITE_NATIVE_AUTH_HOST=auth
```

### 2. Base44 App Settings

In the [Base44 Console](https://console.base44.app/):

1. Go to your app → Settings → OAuth Configuration
2. Add Redirect URIs:
   - **For Mobile:** `com.vault.impactVault://auth`
   - **For Web:** `https://your-domain.com/auth-callback`

### 3. Android Configuration

The Capacitor config in [capacitor.config.ts](capacitor.config.ts) is already configured for:
- Deep link scheme: `com.vault.impactVault://auth`
- Browser plugin for OAuth
- App URL open listener

The [AndroidManifest.xml](impactVault/android/app/src/main/AndroidManifest.xml) has the deep link intent filter configured.

## Testing

### Test Login with Email/Password

1. **Build the app:**
   ```bash
   npm run build:mobile
   ```

2. **Build APK:**
   ```bash
   npm run build:apk
   ```

3. **Install to device/emulator:**
   ```bash
   npm run sync:android
   npx cap open android  # Opens Android Studio
   ```

4. **Run the app** in Android Studio emulator or device

5. **Test login:**
   - Email: `test@example.com`
   - Password: `password123` (or any valid password for registered user)
   - Click "Login"

### Test Signup

1. Click "Sign Up" tab
2. Enter email, password (min 6 chars), and full name
3. Click "Create Account"
4. Should see success message and redirect to dashboard

### Test Google OAuth

1. Click "Continue with Google" button
2. System browser opens with Google login
3. Sign in with your Google account
4. Browser automatically closes
5. You should be logged in

### Watch OAuth Logs

```bash
npm run adb:logcat
```

Look for logs prefixed with `[OAuth]` to debug OAuth flow.

## Common Issues & Troubleshooting

### Issue: "Missing VITE_BASE44_APP_BASE_URL"
**Solution:** Make sure `.env` file has `VITE_BASE44_APP_BASE_URL` set to the full Base44 app URL.

### Issue: OAuth redirects to blank page instead of closing
**Solution:** Check that the redirect URI in Base44 settings matches exactly: `com.vault.impactVault://auth`

### Issue: Login button doesn't do anything
**Solution:** 
- Check browser console logs
- Make sure API endpoints are accessible
- Check network tab to see if API calls are being made
- Verify app ID and base URL in `.env`

### Issue: Can't log in on Android emulator
**Solution:**
- Emulator may block internet by default
- Try building APK and installing on physical device
- Or configure emulator network settings

### Issue: Token not persisting after OAuth
**Solution:**
- Check that `localStorage` is being used
- On native apps, Capacitor should handle storage
- Check logs for `[OAuth]` prefixed messages
- Make sure OAuth callback URL is correct

## API Response Formats

The implementation supports both response formats:

**Format 1 (with token at root):**
```json
{
  "token": "...",
  "user": { ... }
}
```

**Format 2 (with access_token):**
```json
{
  "access_token": "...",
  "user": { ... }
}
```

If your API returns a different format, update `auth-service.js` to match.

## Security Notes

1. **Tokens in localStorage:** Tokens are stored in browser localStorage for persistent authentication
2. **HTTPS Only:** Ensure all API calls use HTTPS in production
3. **Token Expiration:** Implement token refresh logic if tokens expire (not currently included)
4. **Password Security:** Passwords should be sent over HTTPS only
5. **OAuth State:** For production, add CSRF state verification to OAuth flow

## Next Steps

1. Test the mobile login flow thoroughly
2. Configure Google OAuth in Base44 console with correct redirect URIs
3. Test on physical Android device
4. Implement password reset functionality (optional)
5. Add rate limiting to login/signup endpoints (backend)
6. Implement token refresh mechanism for expired tokens (optional)

## Support

For issues with:
- **Base44 API:** Check Base44 documentation and console
- **Capacitor:** Check Capacitor documentation
- **App routing:** Check React Router configuration
- **OAuth:** Check Google OAuth documentation and Base44 OAuth setup

Update repo memory with these settings after successful testing.
