import type { CapacitorConfig } from '@capacitor/cli';

// Settings for the Android app. The app is this same website, packaged to run on a phone.
// appId is the app's permanent identity on Android and in the Play Store.
// Change it BEFORE your first release, never after.
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
