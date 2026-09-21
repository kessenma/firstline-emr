# TanStack Start Migration - Quick Reference Guide

**Quick lookup for common migration patterns during the Next.js → TanStack Start migration**

---

## Table of Contents
1. [Routing](#routing)
2. [Components](#components)
3. [Navigation](#navigation)
4. [Data Fetching](#data-fetching)
5. [Authentication](#authentication)
6. [API Routes](#api-routes)
7. [Assets & Fonts](#assets--fonts)
8. [Metadata & SEO](#metadata--seo)

---

## Routing

### File Naming Conventions

| Next.js | TanStack Start | Route |
|---------|---------------|-------|
| `app/page.tsx` | `app/index.tsx` | `/` |
| `app/about/page.tsx` | `app/about.tsx` | `/about` |
| `app/blog/[slug]/page.tsx` | `app/blog/$slug.tsx` | `/blog/:slug` |
| `app/blog/[...slug]/page.tsx` | `app/blog/$.tsx` | `/blog/*` |
| `app/layout.tsx` | `app/__root.tsx` | Root layout |
| `app/dashboard/layout.tsx` | `app/dashboard.tsx` with `<Outlet/>` | Nested layout |

### Basic Route

**Before (Next.js):**
```tsx
// app/about/page.tsx
export default function AboutPage() {
  return <div>About Us</div>
}
```

**After (TanStack Start):**
```tsx
// app/about.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return <div>About Us</div>
}
```

### Dynamic Route

**Before (Next.js):**
```tsx
// app/patient/[id]/page.tsx
export default async function PatientPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  return <div>Patient: {id}</div>
}
```

**After (TanStack Start):**
```tsx
// app/patient/$id.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/patient/$id')({
  component: PatientPage,
})

function PatientPage() {
  const { id } = Route.useParams()
  return <div>Patient: {id}</div>
}
```

### Catch-All Route

**Before (Next.js):**
```tsx
// app/docs/[...slug]/page.tsx
export default async function DocsPage({ 
  params 
}: { 
  params: Promise<{ slug: string[] }> 
}) {
  const { slug } = await params
  return <div>Docs: {slug.join('/')}</div>
}
```

**After (TanStack Start):**
```tsx
// app/docs/$.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/$')({
  component: DocsPage,
})

function DocsPage() {
  const { _splat } = Route.useParams()
  return <div>Docs: {_splat}</div>
}
```

---

## Components

### Client Components

**Before (Next.js):**
```tsx
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

**After (TanStack Start):**
```tsx
// No 'use client' directive needed - components are client by default
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### Root Layout

**Before (Next.js):**
```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My App',
  description: 'App description',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**After (TanStack Start):**
```tsx
// app/__root.tsx
import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router'
import './globals.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
      { name: 'description', content: 'App description' },
    ],
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
```

---

## Navigation

### Links

**Before (Next.js):**
```tsx
import Link from 'next/link'

export function Navigation() {
  return (
    <nav>
      <Link href="/about">About</Link>
      <Link href="/blog/my-post">Blog Post</Link>
      <Link href="/search?query=test">Search</Link>
    </nav>
  )
}
```

**After (TanStack Start):**
```tsx
import { Link } from '@tanstack/react-router'

export function Navigation() {
  return (
    <nav>
      <Link to="/about">About</Link>
      <Link to="/blog/$slug" params={{ slug: 'my-post' }}>Blog Post</Link>
      <Link to="/search" search={{ query: 'test' }}>Search</Link>
    </nav>
  )
}
```

### Programmatic Navigation

**Before (Next.js):**
```tsx
'use client'
import { useRouter } from 'next/navigation'

export function MyComponent() {
  const router = useRouter()
  
  const handleClick = () => {
    router.push('/dashboard')
    router.replace('/home')
    router.back()
    router.refresh()
  }
  
  return <button onClick={handleClick}>Navigate</button>
}
```

**After (TanStack Start):**
```tsx
import { useNavigate, useRouter } from '@tanstack/react-router'

export function MyComponent() {
  const navigate = useNavigate()
  const router = useRouter()
  
  const handleClick = () => {
    navigate({ to: '/dashboard' })
    navigate({ to: '/home', replace: true })
    router.history.back()
    router.invalidate() // Similar to refresh
  }
  
  return <button onClick={handleClick}>Navigate</button>
}
```

### Current Route Information

**Before (Next.js):**
```tsx
'use client'
import { usePathname, useSearchParams } from 'next/navigation'

export function CurrentRoute() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.get('query')
  
  return <div>Path: {pathname}, Query: {query}</div>
}
```

**After (TanStack Start):**
```tsx
import { useLocation, useSearch } from '@tanstack/react-router'

export function CurrentRoute() {
  const location = useLocation()
  const search = useSearch({ strict: false })
  
  return <div>Path: {location.pathname}, Query: {search.query}</div>
}
```

---

## Data Fetching

### Fetch in Component

**Before (Next.js - Server Component):**
```tsx
// app/posts/page.tsx
export default async function PostsPage() {
  const res = await fetch('https://api.example.com/posts')
  const posts = await res.json()
  
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

**After (TanStack Start):**
```tsx
// app/posts.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts')({
  loader: async () => {
    const res = await fetch('https://api.example.com/posts')
    const posts = await res.json()
    return { posts }
  },
  component: PostsPage,
})

function PostsPage() {
  const { posts } = Route.useLoaderData()
  
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

### Fetch with TanStack Query

**Before (Next.js):**
```tsx
'use client'
import { useQuery } from '@tanstack/react-query'

export default function PostsPage() {
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await fetch('/api/posts')
      return res.json()
    },
  })
  
  return <div>{posts?.length} posts</div>
}
```

**After (TanStack Start - Same!):**
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/posts')({
  component: PostsPage,
})

function PostsPage() {
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await fetch('/api/posts')
      return res.json()
    },
  })
  
  return <div>{posts?.length} posts</div>
}
```

---

## Authentication

### Session Hook

**Before (Next.js with next-auth):**
```tsx
'use client'
import { useSession } from 'next-auth/react'

export function UserProfile() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <div>Loading...</div>
  if (!session) return <div>Not authenticated</div>
  
  return <div>Hello, {session.user.name}</div>
}
```

**After (TanStack Start):**
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profile')({
  component: UserProfile,
})

function UserProfile() {
  const { auth } = Route.useRouteContext()
  
  if (!auth.user) return <div>Not authenticated</div>
  
  return <div>Hello, {auth.user.name}</div>
}
```

### Protected Route

**Before (Next.js):**
```tsx
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

export default async function DashboardPage() {
  const session = await getServerSession()
  
  if (!session) {
    redirect('/login')
  }
  
  return <div>Dashboard</div>
}
```

**After (TanStack Start):**
```tsx
// app/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  return <div>Dashboard</div>
}
```

---

## API Routes

### Simple GET Endpoint

**Before (Next.js):**
```tsx
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'

export async function GET(request: NextRequest) {
  const posts = await db.select().from('posts')
  return NextResponse.json(posts)
}
```

**After (TanStack Start - Option 1: Server Function):**
```tsx
// lib/server-functions/posts.ts
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'

export const getPosts = createServerFn('GET', async () => {
  const posts = await db.select().from('posts')
  return posts
})
```

**After (TanStack Start - Option 2: Server Route):**
```tsx
// app/api/posts.ts
import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'

export const Route = createFileRoute('/api/posts')({
  server: {
    handlers: {
      GET: async () => {
        const posts = await db.select().from('posts')
        return Response.json(posts)
      },
    },
  },
})
```

### POST Endpoint with Auth

**Before (Next.js):**
```tsx
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/db'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const post = await db.insert('posts').values(body)
  
  return NextResponse.json(post)
}
```

**After (TanStack Start):**
```tsx
// lib/server-functions/posts.ts
import { createServerFn } from '@tanstack/react-start'
import { getSession } from '@/lib/auth'
import { db } from '@/db'

export const createPost = createServerFn('POST', async (data: PostInput) => {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  const post = await db.insert('posts').values(data)
  return post
})
```

---

## Assets & Fonts

### Images

**Before (Next.js):**
```tsx
import Image from 'next/image'

export function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Logo"
      width={200}
      height={100}
      priority
    />
  )
}
```

**After (TanStack Start):**
```tsx
import { Image } from '@unpic/react'

export function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Logo"
      width={200}
      height={100}
      priority
    />
  )
}
```

### Fonts (Google Fonts)

**Before (Next.js):**
```tsx
// app/layout.tsx
import { Inter, Roboto } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const roboto = Roboto({ weight: '400', subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html className={inter.className}>
      <body className={roboto.className}>{children}</body>
    </html>
  )
}
```

**After (TanStack Start):**
```bash
# Install fonts
npm install -D @fontsource-variable/inter @fontsource/roboto
```

```css
/* app/globals.css */
@import '@fontsource-variable/inter';
@import '@fontsource/roboto/400.css';

@theme inline {
  --font-sans: 'Inter Variable', sans-serif;
  --font-body: 'Roboto', sans-serif;
}
```

```tsx
// app/__root.tsx
import './globals.css'

function RootLayout() {
  return (
    <html>
      <body className="font-sans">
        <Outlet />
      </body>
    </html>
  )
}
```

---

## Metadata & SEO

### Page Metadata

**Before (Next.js):**
```tsx
// app/about/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about our company',
  openGraph: {
    title: 'About Us',
    description: 'Learn about our company',
  },
}

export default function AboutPage() {
  return <div>About</div>
}
```

**After (TanStack Start):**
```tsx
// app/about.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About Us' },
      { name: 'description', content: 'Learn about our company' },
      { property: 'og:title', content: 'About Us' },
      { property: 'og:description', content: 'Learn about our company' },
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  return <div>About</div>
}
```

### Dynamic Metadata

**Before (Next.js):**
```tsx
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPost(slug)
  
  return {
    title: post.title,
    description: post.excerpt,
  }
}
```

**After (TanStack Start):**
```tsx
// app/blog/$slug.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const post = await getPost(params.slug)
    return { post }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.post.title },
      { name: 'description', content: loaderData.post.excerpt },
    ],
  }),
  component: BlogPostPage,
})
```

---

## Environment Variables

**Before (Next.js):**
```tsx
// Client-side: NEXT_PUBLIC_ prefix required
const publicKey = process.env.NEXT_PUBLIC_API_KEY

// Server-side: No prefix needed
const secretKey = process.env.SECRET_KEY
```

**After (TanStack Start):**
```tsx
// Client-side: VITE_ prefix required
const publicKey = import.meta.env.VITE_API_KEY

// Server-side: No prefix needed (in server functions)
const secretKey = process.env.SECRET_KEY
```

---

## Common Patterns

### Redirect

**Before (Next.js):**
```tsx
import { redirect } from 'next/navigation'

export default async function Page() {
  redirect('/new-page')
}
```

**After (TanStack Start):**
```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/old-page')({
  beforeLoad: () => {
    throw redirect({ to: '/new-page' })
  },
})
```

### Loading State

**Before (Next.js):**
```tsx
// app/loading.tsx
export default function Loading() {
  return <div>Loading...</div>
}
```

**After (TanStack Start):**
```tsx
// app/__root.tsx or specific route
export const Route = createFileRoute('/posts')({
  pendingComponent: () => <div>Loading...</div>,
  component: PostsPage,
})
```

### Error Handling

**Before (Next.js):**
```tsx
// app/error.tsx
'use client'

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

**After (TanStack Start):**
```tsx
// app/__root.tsx or specific route
export const Route = createFileRoute('/')({
  errorComponent: ({ error, reset }) => (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  ),
  component: HomePage,
})
```

---

## Import Path Changes

```tsx
// Next.js imports
import { redirect } from 'next/navigation'         // ❌ Remove
import { useRouter } from 'next/navigation'        // ❌ Remove
import { usePathname } from 'next/navigation'      // ❌ Remove
import { useSearchParams } from 'next/navigation'  // ❌ Remove
import Link from 'next/link'                       // ❌ Remove
import Image from 'next/image'                     // ❌ Remove
import { Metadata } from 'next'                    // ❌ Remove

// TanStack Start imports
import { redirect } from '@tanstack/react-router'            // ✅ Add
import { useNavigate, useRouter } from '@tanstack/react-router'  // ✅ Add
import { useLocation } from '@tanstack/react-router'         // ✅ Add
import { useSearch } from '@tanstack/react-router'           // ✅ Add
import { Link } from '@tanstack/react-router'                // ✅ Add
import { Image } from '@unpic/react'                         // ✅ Add
import { createServerFn } from '@tanstack/react-start'       // ✅ Add
```

---

## Quick Migration Checklist

### Per File
- [ ] Remove `'use client'` and `'use server'` directives
- [ ] Change file naming (page.tsx → index.tsx or route-name.tsx)
- [ ] Wrap in `createFileRoute()`
- [ ] Move component to named function
- [ ] Update imports (next/* → @tanstack/react-router)
- [ ] Convert metadata to `head()` function
- [ ] Move data fetching to `loader()`
- [ ] Add auth checks to `beforeLoad()`

### Project-Wide
- [ ] Update all Link components
- [ ] Update all Image components
- [ ] Replace useRouter hooks
- [ ] Replace usePathname with useLocation
- [ ] Replace useSearchParams with useSearch
- [ ] Convert API routes to server functions
- [ ] Update environment variable prefixes
- [ ] Update font loading strategy

---

**Need Help?**
- 📖 [Full Migration Plan](./tanstack-start-migration-plan.md)
- 🌐 [TanStack Start Docs](https://tanstack.com/start/latest)
- 🔗 [TanStack Router Docs](https://tanstack.com/router/latest)