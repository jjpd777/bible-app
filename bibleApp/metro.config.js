// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add these Firebase-specific configurations
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Keep your existing transformer config if needed
config.transformer = {
  ...config.transformer,
  _expoRelativeProjectRoot: __dirname
};

module.exports = config;
