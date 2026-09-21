module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
        },
        extensions: ['.ts', '.tsx', '.js', '.json'],
      },
    ],
    '@babel/plugin-transform-async-generator-functions',
    'react-native-reanimated/plugin', // Must be last
  ],
};
