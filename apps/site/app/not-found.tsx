import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteNav } from '@/components/site/SiteNav';

export const metadata: Metadata = { title: 'Page not found | Firstline' };

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-3 text-3xl font-bold">Page not found</h1>
        <p className="mb-6 text-muted-foreground">
          Looking for the Firstline app? It lives at{' '}
          <a className="text-primary underline" href="https://app.firstline.care">
            app.firstline.care
          </a>
          .
        </p>
        <a className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/">
          Back to firstline.care
        </a>
      </main>
      <SiteFooter />
    </>
  );
}
