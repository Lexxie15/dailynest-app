import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.dailynest.mobile',
  appName: 'DailyNest',
  webDir: 'dist',
  backgroundColor: '#F9F8F4',
  server: {
    androidScheme: 'https'
  }
};

export default config;
