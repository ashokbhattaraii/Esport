import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fireslot.nepal',
  appName: 'FireSlot Nepal',
  webDir: 'public',   // ← changed from 'out' to 'public'
  // 'public' folder has no index.html — forces Capacitor to use server.url ALWAYS
  // Never falls back to file:// because there is no index.html in /public

  server: {
    // App loads live website — NO file:// routing issues
    url: process.env.CAPACITOR_SERVER_URL || 'https://fireslot.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    hostname: 'fireslot.vercel.app',
    // Allow navigation to any path on this domain
    allowNavigation: [
      'fireslot.vercel.app',
      '*.fireslot.vercel.app',
    ],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: '#0f0f0f',
      showSpinner: false,
      autoHide: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0f0f',
      overlaysWebView: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#E53935',
    },
  },
}

export default config
