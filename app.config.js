const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'GoldieHour Dev' : 'GoldieHour',
    slug: 'goldiehour',
    scheme: IS_DEV ? 'goldiehour-dev' : 'goldiehour',
    version: '1.0.0',
    platforms: ['ios'],
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    splash: {
      backgroundColor: '#F7F2E8',
    },
    ios: {
      supportsTablet: false,
      buildNumber: '1',
      bundleIdentifier: IS_DEV ? 'com.goldiehour.app.dev' : 'com.goldiehour.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'GoldieHour uses your location to show nearby places and their best light times.',
        },
      ],
      'expo-status-bar',
    ],
    extra: {
      appVariant: IS_DEV ? 'development' : 'production',
    },
  },
};
