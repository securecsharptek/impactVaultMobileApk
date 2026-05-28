#!/usr/bin/env node

/**
 * Quick OAuth Test Helper for impactVault Android App
 * Run this to test your OAuth configuration
 */

const fs = require('fs');
const path = require('path');

const checks = [];

function check(name, fn) {
  try {
    const result = fn();
    checks.push({ name, status: result ? '✅' : '❌', result });
  } catch (error) {
    checks.push({ name, status: '❌', error: error.message });
  }
}

console.log('\n🔍 Checking OAuth Configuration...\n');

// Check 1: .env.mobile exists
check('.env.mobile exists', () => {
  return fs.existsSync(path.join(__dirname, '.env.mobile'));
});

// Check 2: .env.mobile has required vars
check('.env.mobile has VITE_BASE44_APP_ID', () => {
  const envMobile = fs.readFileSync(path.join(__dirname, '.env.mobile'), 'utf-8');
  return envMobile.includes('VITE_BASE44_APP_ID');
});

check('.env.mobile has VITE_BASE44_APP_BASE_URL', () => {
  const envMobile = fs.readFileSync(path.join(__dirname, '.env.mobile'), 'utf-8');
  return envMobile.includes('VITE_BASE44_APP_BASE_URL');
});

// Check 3: capacitor.config.ts has proper config
check('capacitor.config.ts has plugins configuration', () => {
  const config = fs.readFileSync(path.join(__dirname, 'capacitor.config.ts'), 'utf-8');
  return config.includes('plugins:') || config.includes('Browser');
});

// Check 4: AndroidManifest.xml has deep link
check('AndroidManifest.xml has deep link intent filter', () => {
  const manifest = fs.readFileSync(
    path.join(__dirname, 'android/app/src/main/AndroidManifest.xml'),
    'utf-8'
  );
  return manifest.includes('com.vault.impactVault') && manifest.includes('android:host="auth"');
});

// Check 5: native-auth.js has logging
check('native-auth.js has console logging', () => {
  const auth = fs.readFileSync(path.join(__dirname, 'src/lib/native-auth.js'), 'utf-8');
  return auth.includes('console.log') && auth.includes('[OAuth]');
});

// Check 6: MainActivity.java has deep link handler
check('MainActivity.java has onNewIntent method', () => {
  const activity = fs.readFileSync(
    path.join(__dirname, 'android/app/src/main/java/com/vault/impactVault/MainActivity.java'),
    'utf-8'
  );
  return activity.includes('onNewIntent');
});

// Check 7: dist folder exists
check('dist folder has been built', () => {
  return fs.existsSync(path.join(__dirname, 'dist'));
});

// Check 8: package.json has mobile scripts
check('package.json has mobile scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
  return pkg.scripts && (pkg.scripts['build:mobile'] || pkg.scripts['build:apk']);
});

// Print results
console.log('Check Results:');
console.log('─'.repeat(50));

let passed = 0;
checks.forEach(({ name, status, result, error }) => {
  console.log(`${status} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  if (status === '✅') passed++;
});

console.log('─'.repeat(50));
console.log(`\nResult: ${passed}/${checks.length} checks passed\n`);

if (passed < checks.length) {
  console.log('⚠️  Some checks failed. Please review the Android OAuth Guide.');
  console.log('📖 See: ANDROID_OAUTH_GUIDE.md\n');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Ready to build Android APK.\n');
  console.log('Next steps:');
  console.log('1. npm run build:mobile');
  console.log('2. npm run sync:android');
  console.log('3. npm run open:android');
  console.log('4. Build and run from Android Studio\n');
  process.exit(0);
}
