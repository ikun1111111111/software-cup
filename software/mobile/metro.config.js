const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add .vrm to asset extensions
config.resolver.assetExts.push('vrm');

// Mock react-native-maps for web
config.resolver.extraNodeModules = {
  'react-native-maps': path.resolve(__dirname, 'mocks/react-native-maps.js'),
};

module.exports = config;
