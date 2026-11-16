// apps/web/app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import ClientLayout from "./ClientLayout";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

// metadataBase is required for the Open Graph image to resolve to an absolute
// URL. Next picks up app/icon.png, app/apple-icon.png and app/opengraph-image.png
// automatically by file convention, so they are deliberately not listed here.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://firstline.care",
  ),
  title: "Firstline",
  description: "Offline-first electronic medical records for field clinical work",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cs = await cookies();
  const themeMode = cs.get("themeMode")?.value;
  const initialHtmlClass = themeMode === "dark" ? "dark" : undefined;
  const initialDataTheme =
    themeMode === "dark" || themeMode === "light" ? themeMode : undefined;

  return (
    <ClientLayout
      initialHtmlClass={initialHtmlClass}
      initialDataTheme={initialDataTheme}
    >
      {children}
    </ClientLayout>
  );
}
