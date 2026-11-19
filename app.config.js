const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = ({ config }) => {
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
