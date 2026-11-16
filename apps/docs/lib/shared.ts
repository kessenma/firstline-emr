import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Firstline Docs';
export const siteUrl = 'https://docs.firstline.care';
export const appUrl = 'https://firstline.care';

// Docs are served from the site root: docs.firstline.care/self-hosting/...
export const docsRoute = '/';
export const docsImageRoute = '/og/pages';

export const gitConfig = {
  user: 'kessenma',
  repo: 'firstline-emr',
  branch: 'main',
  // MDX lives here relative to the repo root (used for "Edit on GitHub" links)
  contentDir: 'apps/docs/content/docs',
};

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}

/** URL of the raw-markdown copy of a page (served by app/llms.mdx). */
export function getMarkdownUrl(pageUrl: string) {
  const path = pageUrl === '/' ? '/index' : pageUrl.replace(/\/$/, '');
  return `/llms.mdx${path}.md`;
}
