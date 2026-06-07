const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/auth-js ships ES2022 private class fields (#field) in its dist
// files. Hermes can't parse these without Babel transformation, so we remove
// the supabase packages from Metro's "don't transform" list.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

// Force Metro to run Babel on supabase packages so private class fields are
// down-compiled before Hermes sees them.
config.transformIgnorePatterns = [
  'node_modules/(?!(' +
    '@supabase/supabase-js|' +
    '@supabase/auth-js|' +
    '@supabase/realtime-js|' +
    '@supabase/postgrest-js|' +
    '@supabase/storage-js|' +
    'react-native|' +
    '@react-native|' +
    '@react-native-community|' +
    'expo|' +
    '@expo|' +
    'react-navigation|' +
    '@react-navigation' +
  ')/)',
];

module.exports = config;

