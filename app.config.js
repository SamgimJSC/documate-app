export default {
  expo: {
    name: "documate-app",
    slug: "documate-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "documateapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
    },

    android: {
      package: "com.samgim.documate",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#E6F4FE",
        monochromeImage: "./assets/images/icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    web: {
      output: "static",
      favicon: "./assets/images/icon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          faceIDPermission: "DocuMate가 로그인 확인을 위해 Face ID를 사용하도록 허용합니다.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#1565C0",
        //   defaultChannel: "default",
        },
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
  eas: {
    projectId: "dac4068d-32fe-4a44-977e-2a7f19c5d93c",
  },
},
  },
};
