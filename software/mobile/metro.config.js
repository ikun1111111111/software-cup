const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add 3D model/animation assets to Metro.
config.resolver.assetExts.push('vrm', 'glb');

// Keep web bundling stable on memory-constrained Windows/Node 24 setups.
config.maxWorkers = 1;

// Mock react-native-maps for web
config.resolver.extraNodeModules = {
  'react-native-maps': path.resolve(__dirname, 'mocks/react-native-maps.js'),
};

module.exports = config;
