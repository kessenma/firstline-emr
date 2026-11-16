// app/about/page.tsx
// The marketing/about page moved to its own static app (apps/site → https://firstline.care).
// Keep this route so old links and bookmarks still land somewhere useful.
import { redirect } from "next/navigation";

export default function AboutPage() {
  redirect("https://firstline.care");
}
