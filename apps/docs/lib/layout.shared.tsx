import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { ExternalLink } from 'lucide-react';
import { FirstlineLogo } from '@/components/logo';
import { appUrl, gitConfig } from './shared';

/** Header breadcrumb in the PocketDev docs style: "[logo] Firstline / Docs". */
function NavTitle() {
  return (
    <span className="inline-flex items-center gap-2">
      <FirstlineLogo className="size-5 text-fd-primary" />
      <span className="fd-display text-[1.05rem] text-fd-foreground">Firstline</span>
      <span className="text-xs text-fd-muted-foreground">/</span>
      <span className="text-sm text-fd-muted-foreground">Docs</span>
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <NavTitle />,
      url: '/',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        type: 'main',
        text: 'Open Firstline',
        url: appUrl,
        external: true,
        icon: <ExternalLink />,
      },
    ],
  };
}
