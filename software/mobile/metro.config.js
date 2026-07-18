const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withVrmAssetMime } = require('./metroModelMime');

const config = getDefaultConfig(__dirname);

// Add 3D model/animation assets to Metro.
config.resolver.assetExts.push('vrm', 'glb');

// Metro does not know the VRM extension and otherwise emits
// `Content-Type: false` together with `nosniff`, which Chrome rejects.
const defaultEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware(middleware, server) {
    const enhanced = defaultEnhanceMiddleware
      ? defaultEnhanceMiddleware(middleware, server)
      : middleware;
    return withVrmAssetMime(enhanced);
  },
};

// Keep web bundling stable on memory-constrained Windows/Node 24 setups.
config.maxWorkers = 1;

// Mock react-native-maps for web
config.resolver.extraNodeModules = {
  'react-native-maps': path.resolve(__dirname, 'mocks/react-native-maps.js'),
};

module.exports = config;
