// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-4xl font-bold text-foreground">404 - Page Not Found</h1>
      <p className="mt-4 text-muted-foreground">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Return Home
      </Link>
    </div>
  );
}
