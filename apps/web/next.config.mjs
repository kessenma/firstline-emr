import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@fajr/shared"],
  reactStrictMode: false, // Disabled to prevent excessive reloads when switching tabs
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,

  // Memory optimizations for low-end servers
  productionBrowserSourceMaps: false, // Disable source maps to save memory during build

  // TypeScript checking - skip during build to save memory (do this in CI instead)
  typescript: {
    ignoreBuildErrors: true, // Only if you have TypeScript checks in CI/CD
  },

  // Server external packages - exclude Node.js-only packages from bundling
  serverExternalPackages: [
    "jsonwebtoken",
    "bcryptjs",
  ],

  // Experimental webpack memory optimizations
  experimental: {
    webpackMemoryOptimizations: true, // Reduces max memory usage with slight time increase
    serverSourceMaps: false, // Disable server source maps
  },

  images: {
    unoptimized: true, // Bypass Next.js image optimization
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.fajrmission.org",
        port: "",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  async headers() {
    return [
      {
        source: "/:path*.(ttf|woff|woff2|eot|otf)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
      {
        source: "/:path*.ogg",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
      {
        source: "/api/telegram-thread/get-media",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
  webpack(config, { isServer }) {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    config.module.rules.push({
      test: /\.ttf$/,
      use: [
        {
          loader: "file-loader",
          options: {
            publicPath: "/_next/static/chunks",
            outputPath: "static/fonts",
            name: "[name].[hash].[ext]",
            emitFile: false,
          },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
