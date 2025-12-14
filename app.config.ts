import 'dotenv/config';
import { ConfigContext, ExpoConfig } from 'expo/config';

const requiredEnvVar = (key: string) => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const auth0Domain = requiredEnvVar('AUTH0_DOMAIN');
  const auth0ClientId = requiredEnvVar('AUTH0_CLIENT_ID');

  const iosBundleIdentifier =
    process.env.EXPO_IOS_BUNDLE_IDENTIFIER ?? config.ios?.bundleIdentifier ?? 'com.waymark.app';
  const androidPackage =
    process.env.EXPO_ANDROID_PACKAGE ?? config.android?.package ?? 'com.waymark.app';

  return {
    ...config,
    name: 'Waymark',
    slug: 'Waymark',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'waymark',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    extra: {
      auth0Domain: auth0Domain,
      auth0ClientId: auth0ClientId,
    },
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: iosBundleIdentifier,
    },
    android: {
      ...config.android,
      package: androidPackage,
      adaptiveIcon: {
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
        backgroundColor: '#E6F4FE',
      },
      edgeToEdgeEnabled: true,
      allowBackup: config.android?.allowBackup,
    },
    web: {
      ...config.web,
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'react-native-auth0',
        {
          domain: auth0Domain,
          clientId: auth0ClientId,
          ios: {
            bundleIdentifier: iosBundleIdentifier,
          },
          android: {
            package: androidPackage,
          },
        },
      ],
    ],
    experiments: {
      ...config.experiments,
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};

