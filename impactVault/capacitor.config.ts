import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vault.impactVault',
  appName: 'impactVault',
  webDir: 'dist',
  server: {
    // Allow navigation to Base44 domain and localhost for development
    allowNavigation: [
      'impact-vault-app-copy-09df371b.base44.app',
      '*.base44.app',
      'localhost',
      '127.0.0.1'
    ],
    // Allow deep links to return to app
    allowNavigation: [
      'com.vault.impactVault://',
      'impact-vault-app-copy-09df371b.base44.app',
      '*.base44.app'
    ]
  },
  // Browser plugin configuration for OAuth
  plugins: {
    Browser: {
      windowScaleBehavior: 1
    },
    App: {
      // Handle deep links
      deepLinkSubscriber: true
    }
  }
};

export default config;
