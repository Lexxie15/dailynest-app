import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.dailynest.mobile',
  appName: 'DailyNest',
  webDir: 'dist',
  backgroundColor: '#F9F8F4',
  server: {
    // IMPORTANT: Replace the URL below with your ACTUAL Netlify website address!
    url: 'https://jade-seahorse-0cb507.netlify.app/', 
    androidScheme: 'https',
    cleartext: false
  }
};

export default config;
