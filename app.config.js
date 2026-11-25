const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = ({ config }) => {
  if (process.env.EAS_BUILD === 'true') {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('Set EXPO_PUBLIC_API_URL to the deployed HTTPS API before building with EAS.');
    }

    let parsedApiUrl;
    try {
      parsedApiUrl = new URL(apiUrl);
    } catch {
      throw new Error('EXPO_PUBLIC_API_URL must be a valid HTTPS URL.');
    }

    if (parsedApiUrl.protocol !== 'https:') {
      throw new Error('EXPO_PUBLIC_API_URL must use HTTPS for EAS builds.');
    }
  }

  const resolvedConfig = {
    ...config,
    android: {
      ...config.android,
      package: 'com.elez4r.airesumesystem',
    },
  };

  if (process.env.APP_VARIANT !== 'local-test') {
    return resolvedConfig;
  }

  return withAndroidManifest(resolvedConfig, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return manifestConfig;
  });
};
