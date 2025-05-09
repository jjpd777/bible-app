import "dotenv/config";

module.exports = {
  expo: {
    name: "Bendiga",
    slug: "bibleApp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    // splash: {
    //   image: "./assets/images/bootSplash_logo.png",
    //   resizeMode: "contain",
    //   backgroundColor: "#22143C",
    //   delay: 2000,
    // },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.juan28.bibleApp",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/bendiga_appstore_final.png",
        backgroundColor: "#22143C",
      },
      package: "com.juan28.bibleApp",
      permissions: ["MEDIA_LIBRARY", "NOTIFICATIONS"],
      privacyPolicyUrl:
        "https://gist.github.com/jjpd777/20440aed0f9e61775d0f62c7d5e3f5f5",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/bendiga_react.png",
    },
    plugins: [
      "expo-router",
      "expo-asset",
      [
        "expo-notifications",
        {
          icon: "./assets/images/bendiga_main_logo.png",
          color: "#ffffff",
        },
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow Bendiga to access your photos.",
          savePhotosPermission: "Allow Bendiga to save photos.",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    assetBundlePatterns: ["**/*", "assets/audio/*"],
    extra: {
      eas: {
        projectId: "f943f2f0-6e23-4ea7-a475-5a7444baf8a1",
      },
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
      ELEVEN_LABS_KEY_PROD: process.env.ELEVEN_LABS_KEY_PROD,
      MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN,
    },
  },
};
