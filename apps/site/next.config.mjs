/** @type {import('next').NextConfig} */
const config = {
  // Fully static: `next build` writes plain HTML/CSS/JS to `out/`, served by nginx.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // @firstline/shared ships TypeScript source
  transpilePackages: ['@firstline/shared'],
};

export default config;
