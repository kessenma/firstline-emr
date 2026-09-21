# Rspack Configuration Notes

## Overview

The `rspack.config.mjs` file configures Rspack (the bundler) for the React Native application. It's enhanced with Re.Pack defaults for optimal React Native development.

## Key Configurations

### Lucide Icons Infinity Fix

**Problem:**
The `lucide-react-native` package contains an `Infinity` icon that conflicts with JavaScript's global `Infinity` constant when parsed by the Hermes JavaScript engine. This causes a build error:

```
SyntaxError: Can't create duplicate variable that shadows a global property: 'Infinity'
```

**Solution:**
We exclude the problematic `infinity.js` file from processing:

```javascript
module: {
  rules: [
    {
      test: /\.[cm]?[jt]sx?$/,
      exclude: [
        /node_modules\/lucide-react-native\/dist\/esm\/icons\/infinity\.js$/,
      ],
      type: 'javascript/auto',
      use: {
        loader: '@callstack/repack/babel-swc-loader',
        parallel: true,
        options: {},
      },
    },
  ],
}
```

This exclusion tells Rspack to skip processing this specific file, preventing the Hermes parser from encountering the naming conflict.

### Impact

- The `Infinity` icon from lucide-react-native will not be available for import
- All other lucide icons work normally
- This is a safe workaround as we don't use the Infinity icon in our app

## Configuration Structure

```javascript
export default Repack.defineRspackConfig({
  context: __dirname,           // Root directory
  entry: './index.js',          // Entry point
  
  resolve: {
    ...Repack.getResolveOptions(),  // Standard RN resolution
  },
  
  module: {
    rules: [
      // JavaScript/TypeScript processing with exclusions
      {
        test: /\.[cm]?[jt]sx?$/,
        exclude: [...],
        type: 'javascript/auto',
        use: {
          loader: '@callstack/repack/babel-swc-loader',
          parallel: true,
          options: {},
        },
      },
      // Asset transformations (images, fonts, etc.)
      ...Repack.getAssetTransformRules(),
    ],
  },
  
  plugins: [
    new Repack.RepackPlugin(),  // Re.Pack core functionality
  ],
});
```

## When to Modify

### Adding More Exclusions

If you encounter similar naming conflicts with other packages:

```javascript
exclude: [
  /node_modules\/lucide-react-native\/dist\/esm\/icons\/infinity\.js$/,
  /node_modules\/other-package\/problematic-file\.js$/,  // Add here
],
```

### Adding Babel Plugins

To add Babel transformations (e.g., for WatermelonDB decorators):

```javascript
use: {
  loader: '@callstack/repack/babel-swc-loader',
  parallel: true,
  options: {
    presets: ["module:@react-native/babel-preset"],
    plugins: [
      ["@babel/plugin-proposal-decorators", { "legacy": true }],
      // Add more plugins here
    ],
  },
},
```

### Adding Module Aliases

To create import shortcuts:

```javascript
resolve: {
  ...Repack.getResolveOptions(),
  alias: {
    '@': './src',
    '@components': './src/components',
    '@utils': './src/utils',
  },
},
```

### Adding Custom Asset Rules

For special file types (e.g., 3D models):

```javascript
module: {
  rules: [
    {
      test: /\.(glb|gltf)$/i,
      type: 'asset/resource',
    },
    // ... other rules
  ],
}
```

## Related Files

- `babel.config.js` - Babel transformation rules (if exists)
- `metro.config.js` - Metro bundler config (fallback/alternative)
- `package.json` - Dependencies that affect bundling

## Troubleshooting

### Changes not taking effect

1. Stop Metro bundler:
   ```bash
   pkill -f "node.*metro"
   ```

2. Clear cache and restart:
   ```bash
   pnpm start --reset-cache
   ```

3. Rebuild the app:
   ```bash
   pnpm ios  # or pnpm android
   ```

### Build errors after adding exclusions

- Ensure regex pattern is correct (escape special characters with `\\`)
- Check that the file path matches exactly
- Use forward slashes `/` even on Windows

### Performance issues

- Keep exclusions minimal (only exclude what's necessary)
- Use specific patterns rather than broad wildcards
- Consider using `parallel: true` for loaders

## Best Practices

1. **Minimal Exclusions**: Only exclude files that cause actual build errors
2. **Document Changes**: Add comments explaining why files are excluded
3. **Version Control**: Always commit `rspack.config.mjs` changes
4. **Test Thoroughly**: Test on both iOS and Android after config changes
5. **Keep It Simple**: Avoid over-complicating the configuration

## References

- [Rspack Documentation](https://rspack.dev/config/)
- [Re.Pack Documentation](https://re-pack.dev/docs/guides/configuration)
- [React Native Documentation](https://reactnative.dev/)
- [Hermes Engine](https://hermesengine.dev/)

## Version History

- **v1.0.0** - Initial configuration
- **v1.1.0** - Added lucide-react-native infinity.js exclusion fix