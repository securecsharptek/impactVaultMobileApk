import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.impactvault.app',
  appName: 'impactVault',
  webDir: 'dist',
  server: {
    // Allow navigation to Base44 domain, localhost, and deep links
    allowNavigation: [
      'impact-vault-app-copy-09df371b.base44.app',
      '*.base44.app',
      'localhost',
      '127.0.0.1',
      'com.vault.impactVault://'
    ]
  },
  plugins: {
    Browser: {
      windowScaleBehavior: 1
    },
    App: {
      deepLinkSubscriber: true
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google']
    }
  }
};

export default config;
