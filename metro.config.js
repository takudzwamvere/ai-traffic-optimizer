const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Several packages ship ES2022 private class fields (#field syntax) in their
// dist files, which Expo Go's bundled Hermes version cannot parse natively.
// Metro skips Babel transformation for all of node_modules by default, so we
// explicitly opt these packages back into transformation.
//
// Pattern logic: files are IGNORED (not transformed) when their path matches
// this regex. The negative lookahead (?!...) makes the pattern NOT match
// (i.e. not ignore) any package we list here — forcing Babel to transform them.
//
// Wildcard notes:
//  react-native[^/]*   → matches react-native, react-native-web,
//                         react-native-svg, react-native-safe-area-context, etc.
//  expo[^/]*           → matches expo, expo-location, expo-status-bar, etc.
//  @supabase/[^/]+     → matches any @supabase/* scoped package
//  @expo/[^/]+         → matches any @expo/* scoped package
//  @react-native/[^/]+ → matches any @react-native/* scoped package

config.transformIgnorePatterns = [
  'node_modules/(?!(' +
    // Supabase — ships private class fields in GoTrueClient & locks
    '@supabase/[^/]+|' +
    // undici — used internally by supabase for HTTP; heavy private field use
    'undici|' +
    // All react-native-* unscoped packages (web, svg, safe-area, webview…)
    'react-native[^/]*|' +
    // All @react-native/* scoped packages (e.g. @react-native/js-polyfills)
    '@react-native/[^/]+|' +
    // @react-native-community/* (netinfo, etc.)
    '@react-native-community/[^/]+|' +
    // @react-native-async-storage/*
    '@react-native-async-storage/[^/]+|' +
    // All expo-* unscoped packages (expo-location, expo-status-bar, etc.)
    'expo[^/]*|' +
    // All @expo/* scoped packages
    '@expo/[^/]+|' +
    // Navigation libraries
    'react-navigation|' +
    '@react-navigation/[^/]+|' +
    // Icon library
    'lucide-react-native|' +
    // CSS-in-JS prefixer used by react-native-web
    'inline-style-prefixer' +
  ')/)',
];

module.exports = config;
