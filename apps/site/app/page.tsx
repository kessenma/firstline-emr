import { AboutPageView } from '@/components/aboutPage/AboutPageView';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteNav } from '@/components/site/SiteNav';

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <AboutPageView />
      </main>
      <SiteFooter />
    </>
  );
}
