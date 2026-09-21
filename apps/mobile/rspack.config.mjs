import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import { RepackLogsPlugin } from 'repack-logs-mcp/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Rspack configuration enhanced with Re.Pack defaults for React Native.
 *
 * Learn about Rspack configuration: https://rspack.dev/config/
 * Learn about Re.Pack configuration: https://re-pack.dev/docs/guides/configuration
 */

export default Repack.defineRspackConfig({
  context: __dirname,
  entry: './index.js',
  resolve: {
    // Package exports enabled: @powersync/common and @powersync/shared-internals
    // (SDK v2) ship no "main"/"module" at all, and the RN SDK statically imports
    // the @powersync/shared-internals/websockets subpath — all of which are
    // reachable only through the "exports" map. Re.Pack defaults this off.
    ...Repack.getResolveOptions({ enablePackageExports: true }),
    // Ensure packages outside apps/mobile (e.g. packages/shared) can resolve dependencies
    modules: ['node_modules', path.resolve(__dirname, 'node_modules')],
    alias: {
      // Map @fajr/shared subpath exports (Repack disables exportsFields by default,
      // so packages/shared's package.json "exports" map is invisible to the bundler).
      // The prefix alias points at src/ rather than enumerating every subpath, so new
      // packages/shared/<name>/index.ts entries resolve without an edit here, and
      // nested paths like @fajr/shared/constants/foo work too. The `$` suffix makes
      // the bare-specifier alias exact so it doesn't shadow the prefix one.
      '@fajr/shared$': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@fajr/shared': path.resolve(__dirname, '../../packages/shared/src'),
      // react-native-executorch-bare-resource-fetcher's "exports" map defines "."
      // only under the `import` condition — no `require`, no `default`. Re.Pack
      // resolves commonjs-typed dependencies with ['react-native', 'require'], so
      // with package exports enabled nothing matches and the bare specifier
      // resolves to nothing. Point at the file its own `main` already names.
      //
      // Preferred over adding `import` to the global conditionNames: that would
      // flip every dual-published package from its CJS build to its ESM one, which
      // is a far wider change than this one package needs.
      'react-native-executorch-bare-resource-fetcher$': path.resolve(
        __dirname,
        'node_modules/react-native-executorch-bare-resource-fetcher/lib/index.js',
      ),
      // Reanimated jest utils aliases to prevent bundling issues
      'react-native-reanimated/src/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/src/reanimated2/jestUtils':
        __dirname + '/empty.js',
      'react-native-reanimated/lib/reanimated2/jestUtils':
        __dirname + '/empty.js',
      'react-native-reanimated/lib/module/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/lib/commonjs/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/lib/mjs/jestUtils': __dirname + '/empty.js',
      // Gesture handler jest utils aliases
      'react-native-gesture-handler/src/jestUtils': __dirname + '/empty.js',
      'react-native-gesture-handler/lib/commonjs/jestUtils':
        __dirname + '/empty.js',
      'react-native-gesture-handler/lib/module/jestUtils':
        __dirname + '/empty.js',
      'react-native-gesture-handler/lib/mjs/jestUtils': __dirname + '/empty.js',
      './jestUtils': __dirname + '/empty.js',
    },
  },
  module: {
    rules: [
      // Babel-only for @powersync/common — its bundle.mjs has "use strict"
      // inside a function with destructured defaults, which SWC's parser rejects
      // as a spec violation. Babel is more lenient and handles it fine.
      {
        test: /\.[cm]?[jt]sx?$/,
        include: [/node_modules[/\\]@powersync[/\\]common/],
        type: 'javascript/auto',
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['module:@react-native/babel-preset'],
          },
        },
      },
      {
        test: /\.[cm]?[jt]sx?$/,
        exclude: [
          /node_modules\/lucide-react-native\/dist\/esm\/icons\/infinity\.js$/,
          /node_modules[/\\]@powersync[/\\]common/,
        ],
        type: 'javascript/auto',
        use: {
          loader: '@callstack/repack/babel-swc-loader',
          parallel: true,
          options: {},
        },
      },
      ...Repack.getAssetTransformRules(),
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    new ReanimatedPlugin({
      unstable_disableTransform: true,
    }),
    new RepackLogsPlugin({
      // Keep this relative to the project so the bundle step works on any machine.
      // A hardcoded absolute path here (e.g. another dev's home dir) makes the
      // "Bundle React Native code and images" build phase fail with EACCES/mkdir.
      outputPath: path.join(__dirname, '.repack-logs.json'),
    }),
  ],
});
