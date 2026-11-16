import type { Metadata } from 'next';
import { Aleo, DM_Serif_Text, Figtree, Inter } from 'next/font/google';
import { SITE_URL } from '@/lib/links';
import '@/styles/globals.css';
import '@/styles/aboutPage.css';

// Same fonts as the web app (apps/web/app/layout.tsx + ClientLayout.tsx)
const inter = Inter({ subsets: ['latin'] });
const dmSerifText = DM_Serif_Text({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-serif-text',
});
const aleo = Aleo({ weight: ['600', '700'], subsets: ['latin'], variable: '--font-aleo' });
const figtree = Figtree({ weight: ['400', '600'], subsets: ['latin'], variable: '--font-figtree' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Firstline: open-source EMR for mission teams and clinics',
  description:
    'Patient intake over Telegram, a shared patient dashboard, charts, care-team messaging and video calls. Open source and self-hostable.',
  openGraph: {
    title: 'Firstline',
    description: 'Open-source EMR for mission teams and clinics.',
    url: SITE_URL,
    siteName: 'Firstline',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerifText.variable} ${aleo.variable} ${figtree.variable}`}
    >
      <body className={`${inter.className} bg-background text-foreground antialiased`}>{children}</body>
    </html>
  );
}
