import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fireslot.nepal',
  appName: 'FireSlot Nepal',
  webDir: 'out',   // used as offline fallback only

  server: {
    // App loads live website — NO file:// routing issues
    url: process.env.CAPACITOR_SERVER_URL || 'https://fireslot.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    // Allow navigation to any path on this domain
    allowNavigation: [
      'fireslot.vercel.app',
      '*.fireslot.vercel.app',
    ],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f0f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0f0f',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
