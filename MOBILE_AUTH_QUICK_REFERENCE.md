# Mobile Authentication - Quick Reference

## 🚀 Quick Start

### Build & Run
```bash
# Build web assets
npm run build:mobile

# Build APK
npm run build:apk

# Open in Android Studio
npx cap open android

# Watch logs
npm run adb:logcat
```

## 🧪 Testing Checklist

### [ ] Test Email/Password Login
- [ ] App shows login page on first open
- [ ] Valid email format accepted
- [ ] Password min 6 characters
- [ ] Login button disabled until form valid
- [ ] Success message appears
- [ ] Redirects to dashboard
- [ ] Token stored (check localStorage)

### [ ] Test Signup
- [ ] Click "Sign Up" tab
- [ ] All three fields required
- [ ] Form validation works
- [ ] Create Account button works
- [ ] Redirects to dashboard
- [ ] User can log in next time

### [ ] Test Google OAuth
- [ ] Click "Continue with Google"
- [ ] System browser opens
- [ ] Can sign in with Google account
- [ ] Browser closes automatically
- [ ] Logged into app
- [ ] Token stored

### [ ] Test Error Cases
- [ ] Wrong password shows error
- [ ] Invalid email shows error
- [ ] Network error handled gracefully
- [ ] Can retry after error
- [ ] Error messages are helpful

## 🔧 Configuration

### .env File (Required)
```
VITE_BASE44_APP_ID=6a07b28a6cfaff8f09df371b
VITE_BASE44_APP_BASE_URL=https://impact-vault-app-copy-09df371b.base44.app
```

### Base44 Settings (Required)
1. Go to https://console.base44.app/
2. Your App → Settings → OAuth Configuration
3. Add Redirect URI: `com.vault.impactVault://auth`

## 📱 UI Components

### Mobile Login Page Location
```
src/pages/MobileLogin.jsx
```

### Features
- Tab interface (Login | Sign Up)
- Email validation
- Password strength check
- Show/hide password toggle
- Form validation
- Google OAuth button
- Error/success messages
- Loading states

## 🔗 API Endpoints

### Login
```
POST /api/apps/{appId}/auth/login
Body: { email, password }
Response: { token, user }
```

### Register
```
POST /api/apps/{appId}/auth/register
Body: { email, password, full_name }
Response: { token, user }
```

### Google OAuth
```
GET /api/apps/{appId}/auth/oauth/google?redirect_uri=com.vault.impactVault://auth
```

## 🐛 Debugging

### Enable OAuth Logs
```bash
npm run adb:logcat | grep "OAuth"
```

### Check Token Storage
```javascript
// In browser console
localStorage.getItem('base44_access_token')
localStorage.getItem('token')
```

### Common Issues

| Problem | Solution |
|---------|----------|
| "Missing app base URL" | Check .env file has VITE_BASE44_APP_BASE_URL |
| Login button doesn't work | Check API base URL, network tab, error console |
| OAuth doesn't redirect back | Check redirect URI in Base44 settings |
| Can't test on emulator | Use physical device instead |
| Form validation too strict | Password min 6 chars, valid email format required |

## 📦 Files Created

```
src/
├── api/
│   └── auth-service.js          (NEW)
├── pages/
│   └── MobileLogin.jsx          (UPDATED - was empty)
└── lib/
    ├── native-auth.js           (UPDATED)
    └── AuthContext.jsx          (No changes needed)

MOBILE_AUTH_SETUP.md             (Detailed guide)
MOBILE_AUTH_IMPLEMENTATION.md    (This guide)
```

## 🎯 Expected Behavior

### First Time User
1. App opens → Shows MobileLogin
2. User signs up → Redirected to Dashboard
3. User can use all app features

### Existing User
1. App opens → Shows MobileLogin
2. User logs in → Redirected to Dashboard
3. If logout → Back to MobileLogin

### After OAuth
1. Click Google button → Browser opens
2. Sign in with Google → Browser closes
3. Automatically logged in → Dashboard

## ✅ Production Checklist

- [ ] Base44 OAuth redirect URI configured
- [ ] Build APK successfully
- [ ] All three login methods tested
- [ ] Error handling tested
- [ ] Logs show [OAuth] messages
- [ ] Token persists on app restart
- [ ] Ready to release

## 📞 Support

**Configuration Issues**: Check .env and Base44 console settings
**API Issues**: Check network tab, API endpoint URLs, response format
**UI Issues**: Check browser console, React errors
**OAuth Issues**: Check logs with `npm run adb:logcat`

---

Created: May 25, 2026
Version: 1.0 - Mobile Authentication System
