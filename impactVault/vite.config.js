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
    logLevel: 'error',
    // Bake env values into the bundle so they survive Xcode/Gradle builds
    // where the .env file is not present at runtime.
    define: {
      'import.meta.env.VITE_BASE44_APP_ID': JSON.stringify(env.VITE_BASE44_APP_ID),
      'import.meta.env.VITE_BASE44_APP_BASE_URL': JSON.stringify(env.VITE_BASE44_APP_BASE_URL),
      'import.meta.env.VITE_BASE44_FUNCTIONS_VERSION': JSON.stringify(env.VITE_BASE44_FUNCTIONS_VERSION),
      'import.meta.env.VITE_NATIVE_AUTH_SCHEME': JSON.stringify(env.VITE_NATIVE_AUTH_SCHEME),
      'import.meta.env.VITE_BYPASS_PAYWALL': JSON.stringify(env.VITE_BYPASS_PAYWALL),
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