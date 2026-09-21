// app/about/page.tsx
"use client";

import React from "react";
import { AboutPageView } from "../../components/aboutPage/AboutPageView";

/**
 * About Page
 * Simple wrapper that renders the AboutPageView component
 * This keeps the page file clean and delegates all logic to components
 */
export default function AboutPage() {
  return <AboutPageView />;
}
