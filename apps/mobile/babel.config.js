/**
 * @fileoverview Babel configuration for React Native/Expo application
 * This configuration is used by Metro bundler to transform JavaScript/TypeScript code
 */

module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: [
      'babel-preset-expo'
    ],
    plugins: [
      // Add any additional babel plugins here if needed
      // 'react-native-reanimated/plugin', // This should be listed last
    ],
  };
};