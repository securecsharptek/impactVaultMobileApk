import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.[mode] etc. — making values available
  // in the define block so they are baked into the bundle for native (Capacitor) builds.
  const env = loadEnv(mode || 'production', process.cwd(), '')

  return {
    // Relative asset paths are safer for Android/iOS WebView bundles.
    base: './',
    build: {
      rollupOptions: {
        // capacitor-plugin-cdv-purchase is a native Capacitor plugin resolved
        // at runtime inside iOS/Android WebView — it must NOT be bundled.
        external: ['capacitor-plugin-cdv-purchase'],
      },
    },
    logLevel: 'error',
    // Bake env values into the bundle so they survive Xcode/Gradle builds
    // where the .env file is not present at runtime.
    define: {
      'import.meta.env.VITE_BASE44_APP_ID': JSON.stringify(env.VITE_BASE44_APP_ID),
      'import.meta.env.VITE_BASE44_APP_BASE_URL': JSON.stringify(env.VITE_BASE44_APP_BASE_URL),
      'import.meta.env.VITE_BASE44_FUNCTIONS_VERSION': JSON.stringify(env.VITE_BASE44_FUNCTIONS_VERSION),
      'import.meta.env.VITE_NATIVE_AUTH_SCHEME': JSON.stringify(env.VITE_NATIVE_AUTH_SCHEME),
      'import.meta.env.VITE_BYPASS_PAYWALL': JSON.stringify(env.VITE_BYPASS_PAYWALL),
      // ── IAP product IDs (baked in so they survive Xcode/Gradle packaging) ──
      'import.meta.env.VITE_IAP_PRODUCT_CORE_INDIVIDUAL':       JSON.stringify(env.VITE_IAP_PRODUCT_CORE_INDIVIDUAL       || 'com.impactvault.core.individual.yearly'),
      'import.meta.env.VITE_IAP_PRODUCT_CORE_FAMILY':           JSON.stringify(env.VITE_IAP_PRODUCT_CORE_FAMILY           || 'com.impactvault.core.family.yearly'),
      'import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_MONTHLY': JSON.stringify(env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_MONTHLY || 'com.impactvault.insights.core.monthly'),
      'import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_YEARLY':  JSON.stringify(env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_YEARLY  || 'com.impactvault.insights.core.yearly'),
      'import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_MONTHLY':     JSON.stringify(env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_MONTHLY     || 'com.impactvault.insights.family.monthly'),
      'import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_YEARLY':      JSON.stringify(env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_YEARLY      || 'com.impactvault.insights.family.yearly'),
      'import.meta.env.VITE_IAP_USE_SANDBOX':      JSON.stringify(env.VITE_IAP_USE_SANDBOX      || 'true'),
      'import.meta.env.VITE_ANDROID_PACKAGE_NAME': JSON.stringify(env.VITE_ANDROID_PACKAGE_NAME || 'com.vault.impactVault'),
    },
    plugins: [
      base44({
        legacySDKImports: env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: true,
        visualEditAgent: true
      }),
      react(),
    ]
  }
})