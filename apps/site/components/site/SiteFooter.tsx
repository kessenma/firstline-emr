import { FirstlineMark } from '@/components/icons/FirstlineMark';
import { APP_URL, DOCS_URL, GITHUB_URL } from '@/lib/links';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FirstlineMark className="h-5 w-5" />
          <span className="text-sm">Firstline. Open-source EMR, Apache-2.0.</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href={DOCS_URL} className="hover:text-foreground">
            Self-hosting docs
          </a>
          <a href={GITHUB_URL} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`${GITHUB_URL}/issues`} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
            Contact &amp; issues
          </a>
          <a href={APP_URL} className="hover:text-foreground">
            Sign in
          </a>
        </div>
      </div>
    </footer>
  );
}
