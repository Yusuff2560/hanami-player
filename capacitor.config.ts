import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yusuff2560.hanami',
  appName: 'HANAMI',
  webDir: 'dist',
  backgroundColor: '#101014',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false }
};

export default config;
