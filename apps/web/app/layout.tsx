// apps/web/app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import ClientLayout from "./ClientLayout";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fajr.EMR",
  description: "Fajr Global electronic medical records",
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
