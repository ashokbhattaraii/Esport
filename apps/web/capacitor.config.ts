import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fireslot.nepal',
  appName: 'FireSlot Nepal',
  webDir: 'capacitor-shell',
  server: {
    url: 'https://esport-web-rho.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['esport-web-rho.vercel.app','esport-api-steel.vercel.app','accounts.google.com','*.googleapis.com'],
    hostname: 'esport-web-rho.vercel.app',
  },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#0B0B14', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#0B0B14', overlaysWebView: false },
    LocalNotifications: { smallIcon: 'ic_stat_notification', iconColor: '#E53935' },
  },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false },
}

export default config
