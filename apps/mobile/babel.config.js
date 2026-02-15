module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@/types': './src/types',
          '@/services': './src/services',
          '@/screens': './src/screens',
          '@/components': './src/components',
        },
      },
    ],
  ],
};