import { CapacitorConfig } from "@capacitor/cli";

const remoteServerUrl =
  process.env.CAPACITOR_SERVER_URL ||
  (process.env.CAPACITOR_LIVE_RELOAD === "true"
    ? process.env.NEXT_PUBLIC_APP_URL
    : undefined);

const server: CapacitorConfig["server"] =
  remoteServerUrl && /^https?:\/\//.test(remoteServerUrl)
    ? {
        url: remoteServerUrl,
        androidScheme: "https",
        cleartext: remoteServerUrl.startsWith("http://"),
      }
    : {
        androidScheme: "https",
        cleartext: false,
      };

const config: CapacitorConfig = {
  appId: "com.fireslot.nepal",
  appName: "FireSlot Nepal",
  webDir: "out",
  server,
  android: {
    buildOptions: {
      keystorePath: "fireslot-release.keystore",
      keystorePassword: process.env.KEYSTORE_PASSWORD || "fireslot2024",
      keystoreAlias: "fireslot",
      keystoreAliasPassword: process.env.KEYSTORE_PASSWORD || "fireslot2024",
      releaseType: "APK",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f0f0f",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f0f0f",
    },
  },
};

export default config;
