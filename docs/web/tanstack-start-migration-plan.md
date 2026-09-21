# TanStack Start Migration Plan
## Fajr.EMR Next.js to TanStack Start Migration

**Document Version:** 1.0  
**Created:** 2024  
**Status:** Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to migrate the Fajr.EMR application from Next.js 16 (App Router) to TanStack Start. Based on analysis of the codebase, this is a **LARGE-SCALE MIGRATION** that will require significant effort and careful planning.

### Migration Scope Assessment

**Current Application Size:**
- **185 TypeScript/TSX files** in the `app/` directory
- **30 page routes** (page.tsx files)
- **150 API routes** in `app/api/`
- **446 component files** in the `components/` directory
- **631 total TS/TSX files** to potentially modify

**Key Technologies to Migrate:**
- Next.js 16 → TanStack Start + Vite
- next-auth authentication → TanStack Start auth patterns
- Next.js API Routes → TanStack Server Functions + Server Routes
- Next.js Image → Unpic or standard img
- Next.js fonts → CSS-based font loading
- Server/Client components → TanStack patterns

---

## Effort Estimation

### Overall Effort: **8-12 weeks** (2-3 person months)

| Phase | Effort | Description |
|-------|--------|-------------|
| **Phase 1: Setup & Infrastructure** | 1 week | Initial setup, build configuration, tooling |
| **Phase 2: Authentication Migration** | 2 weeks | next-auth → custom auth with TanStack patterns |
| **Phase 3: Core Routes Migration** | 3-4 weeks | Migrate 30 pages, layouts, routing patterns |
| **Phase 4: API Routes Migration** | 2-3 weeks | Convert 150 API routes to server functions/routes |
| **Phase 5: Components & Utilities** | 1-2 weeks | Update 446 component files |
| **Phase 6: Testing & Bug Fixes** | 1-2 weeks | Comprehensive testing, fixes, optimization |

### Risk Factors
- 🔴 **HIGH**: Authentication system complexity (next-auth is deeply integrated)
- 🟡 **MEDIUM**: API route volume (150 routes to convert)
- 🟡 **MEDIUM**: Component dependencies on Next.js primitives
- 🟢 **LOW**: Most components appear to be client-side React

---

## Phase 1: Setup & Infrastructure (Week 1)

### 1.1 Project Preparation

**Tasks:**
- [ ] Create a new feature branch: `feat/tanstack-start-migration`
- [ ] Document all environment variables and configuration
- [ ] Backup current working state
- [ ] Set up parallel development environment
- [ ] Create rollback plan

**Deliverables:**
- Migration branch ready
- Complete environment documentation
- Backup of working Next.js version

### 1.2 Dependency Migration

**Remove:**
```bash
npm uninstall next @tailwindcss/postcss
rm postcss.config.js next.config.mjs
```

**Install Core:**
```bash
npm install @tanstack/react-router @tanstack/react-start
npm install -D vite @vitejs/plugin-react @tailwindcss/vite tailwindcss vite-tsconfig-paths
```

**Install Additional:**
```bash
npm install @unpic/react  # For image optimization
npm install -D @fontsource-variable/dm-serif-text @fontsource-variable/aleo @fontsource-variable/figtree
```

### 1.3 Configuration Files

**Create: `vite.config.ts`**
```typescript
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: '.',
      router: {
        routesDirectory: 'app',
      },
    }),
    viteReact(),
  ],
  build: {
    target: 'es2017',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
})
```

**Update: `package.json`**
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "preview": "vite preview"
  }
}
```

**Update: `tsconfig.json`**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "module": "esnext",
    // Keep existing paths and baseUrl
  }
}
```

### 1.4 Router Setup

**Create: `router.tsx`**
```typescript
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    context: {
      // Will add auth context here in Phase 2
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
```

---

## Phase 2: Authentication Migration (Weeks 2-3)

### 2.1 Analysis of Current Auth

**Current System:**
- Uses `next-auth` v4.24.13
- Custom credentials provider
- JWT-based sessions
- Admin role checking
- Mobile auth support
- Session management in `lib/auth.ts`

**Files to Migrate:**
- `lib/auth.ts` (100+ lines)
- `lib/dal.ts` (session verification)
- `app/api/auth/[...nextauth]/route.ts`
- All `useSession()` calls throughout the app

### 2.2 New Auth Architecture

**Approach: Custom Auth with TanStack Start Patterns**

**Create: `lib/tanstack-auth.ts`**
```typescript
import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, deleteCookie } from 'vinxi/http'
import jwt from 'jsonwebtoken'

// Server function to verify session
export const getSession = createServerFn('GET', async () => {
  const token = getCookie('auth-token')
  if (!token) return null
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    // Fetch user from DB
    return decoded
  } catch {
    return null
  }
})

// Server function to login
export const login = createServerFn('POST', async (credentials: {
  email: string
  password: string
}) => {
  // Verify credentials against DB
  // Generate JWT
  // Set cookie
  // Return user
})

// Server function to logout
export const logout = createServerFn('POST', async () => {
  deleteCookie('auth-token')
  return { success: true }
})
```

**Create: `app/__root.tsx` with Auth Context**
```typescript
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { getSession } from '@/lib/tanstack-auth'

interface RouterContext {
  auth: {
    user: SessionUser | null
    login: typeof login
    logout: typeof logout
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const user = await getSession()
    return { auth: { user } }
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <html>
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

### 2.3 Auth Migration Tasks

**Week 2:**
- [ ] Implement server functions for auth (login, logout, session)
- [ ] Create auth context and router context
- [ ] Migrate `lib/auth.ts` logic to TanStack patterns
- [ ] Update cookie management
- [ ] Create auth middleware for protected routes

**Week 3:**
- [ ] Replace all `useSession()` with `useRouterContext()` or custom hook
- [ ] Update protected route patterns
- [ ] Migrate admin role checking
- [ ] Update mobile auth endpoints
- [ ] Test authentication flow end-to-end

**Files to Update (~50+ files that use `useSession`):**
- Search for: `import.*useSession.*from.*next-auth`
- Replace with custom auth hook

---

## Phase 3: Core Routes Migration (Weeks 4-7)

### 3.1 Root Layout Migration

**From: `app/layout.tsx` → `app/__root.tsx`**

**Tasks:**
- [ ] Migrate metadata to `head()` function
- [ ] Convert `ClientLayout` to work with TanStack
- [ ] Update font loading (Next.js fonts → CSS imports)
- [ ] Ensure theme provider works
- [ ] Migrate `LastPageRedirect` component

**Font Migration:**
```css
/* app/globals.css */
@import '@fontsource-variable/dm-serif-text';
@import '@fontsource-variable/aleo';
@import '@fontsource-variable/figtree';

@theme inline {
  --font-dm-serif-text: 'DM Serif Text Variable', serif;
  --font-aleo: 'Aleo Variable', serif;
  --font-figtree: 'Figtree Variable', sans-serif;
}
```

### 3.2 Route Migration Pattern

**Mapping:**
```
Next.js                              → TanStack Start
────────────────────────────────────────────────────────────────
app/layout.tsx                       → app/__root.tsx
app/page.tsx                         → app/index.tsx
app/home/page.tsx                    → app/home.tsx
app/admin/page.tsx                   → app/admin.tsx
app/patient/[id]/page.tsx           → app/patient/$id.tsx
app/med-evac-patient-table/page.tsx → app/med-evac-patient-table.tsx
app/create-patient/page.tsx         → app/create-patient.tsx
```

### 3.3 Route Conversion Template

**Before (Next.js):**
```tsx
// app/home/page.tsx
'use client'
import { useSession } from 'next-auth/react'

export default function HomePage() {
  const { data: session } = useSession()
  return <div>Home: {session?.user?.email}</div>
}
```

**After (TanStack Start):**
```tsx
// app/home.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/home')({
  component: HomePage,
  beforeLoad: ({ context }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/auth/login' })
    }
  },
})

function HomePage() {
  const { auth } = Route.useRouteContext()
  return <div>Home: {auth.user?.email}</div>
}
```

### 3.4 All 30 Pages to Migrate

**Week 4-5: Core Pages**
- [ ] `app/page.tsx` → `app/index.tsx` (home redirect)
- [ ] `app/home/page.tsx` → `app/home.tsx`
- [ ] `app/patient-dashboard/page.tsx` → `app/patient-dashboard.tsx`
- [ ] `app/about/page.tsx` → `app/about.tsx`
- [ ] `app/admin/page.tsx` → `app/admin.tsx`
- [ ] `app/admin-signup/page.tsx` → `app/admin-signup.tsx`
- [ ] `app/my-profile/page.tsx` → `app/my-profile.tsx`
- [ ] `app/notifications/page.tsx` → `app/notifications.tsx`

**Week 6: Patient & Medical Pages**
- [ ] `app/patient/[id]/page.tsx` → `app/patient/$id.tsx`
- [ ] `app/create-patient/page.tsx` → `app/create-patient.tsx`
- [ ] `app/new-patient/page.tsx` → `app/new-patient.tsx`
- [ ] `app/telegram-patient/[id]/page.tsx` → `app/telegram-patient/$id.tsx`
- [ ] `app/med-evac-home/page.tsx` → `app/med-evac-home.tsx`
- [ ] `app/med-evac-patient-table/page.tsx` → `app/med-evac-patient-table.tsx`
- [ ] `app/create-med-evac-patient/page.tsx` → `app/create-med-evac-patient.tsx`
- [ ] `app/med-evac-audit-log/page.tsx` → `app/med-evac-audit-log.tsx`

**Week 7: Auth & Messaging Pages**
- [ ] `app/auth/login/page.tsx` → `app/auth/login.tsx`
- [ ] `app/auth/signup/page.tsx` → `app/auth/signup.tsx`
- [ ] `app/complete-signup/page.tsx` → `app/complete-signup.tsx`
- [ ] `app/messages/page.tsx` → `app/messages.tsx`
- [ ] `app/call/[roomName]/page.tsx` → `app/call/$roomName.tsx`
- [ ] `app/rx-order/[id]/page.tsx` → `app/rx-order/$id.tsx`

### 3.5 Special Route Features

**Protected Routes Pattern:**
```tsx
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    if (!context.auth.user?.isAdmin) {
      throw redirect({ to: '/unauthorized' })
    }
  },
  component: AdminPage,
})
```

**Data Loading Pattern:**
```tsx
export const Route = createFileRoute('/patient/$id')({
  loader: async ({ params, context }) => {
    const patient = await getPatient(params.id)
    return { patient }
  },
  component: PatientPage,
})

function PatientPage() {
  const { patient } = Route.useLoaderData()
  return <div>{patient.name}</div>
}
```

---

## Phase 4: API Routes Migration (Weeks 8-10)

### 4.1 API Route Analysis

**Current Structure:**
- 150 API route files in `app/api/`
- Mix of GET, POST, PUT, DELETE handlers
- Authentication middleware
- Database operations (Drizzle ORM)
- File uploads, external API calls

**Categories:**
1. **Simple CRUD** (~80 routes): Direct DB operations
2. **Complex Logic** (~40 routes): Multi-step operations
3. **External Services** (~20 routes): Telegram, S3, LiveKit, etc.
4. **Auth Endpoints** (~10 routes): Login, signup, token management

### 4.2 Migration Strategies

**Strategy 1: Server Functions (Recommended for most)**
```typescript
// Before: app/api/patient/route.ts
export async function GET(request: NextRequest) {
  const session = await verifySessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const patients = await db.select().from(patients)
  return NextResponse.json(patients)
}

// After: lib/server-functions/patient.ts
import { createServerFn } from '@tanstack/react-start'

export const getPatients = createServerFn('GET', async () => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  
  const patients = await db.select().from(patients)
  return patients
})
```

**Strategy 2: Server Routes (For REST API endpoints)**
```typescript
// After: app/api/patient.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/patient')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSession()
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const patients = await db.select().from(patients)
        return Response.json(patients)
      },
    },
  },
})
```

### 4.3 Migration Priorities

**Week 8: Critical Endpoints (30 routes)**
- [ ] Auth endpoints (login, signup, session)
- [ ] Patient CRUD operations
- [ ] User profile operations
- [ ] Notification endpoints

**Week 9: Feature Endpoints (60 routes)**
- [ ] Medical evacuation routes
- [ ] Message/chat routes
- [ ] Telegram integration routes
- [ ] File upload routes (license, images)
- [ ] Admin management routes

**Week 10: Specialized Endpoints (60 routes)**
- [ ] LiveKit video call tokens
- [ ] ICD-10 and CPT code lookups
- [ ] Translation services
- [ ] PowerSync integration
- [ ] Audit logs
- [ ] Analytics/reporting

### 4.4 API Route List (Partial - Top Priority)

**Authentication:**
- [ ] `app/api/auth/[...nextauth]/route.ts` → Server functions
- [ ] `app/api/auth/signup/route.ts`
- [ ] `app/api/auth/mobile-login/route.ts`
- [ ] `app/api/auth/powersync-token/route.ts`

**Patient Management:**
- [ ] `app/api/patient/route.ts`
- [ ] `app/api/patient/[id]/route.ts`
- [ ] `app/api/patient/assign/route.ts`
- [ ] `app/api/patient/notes/route.ts`

**User Management:**
- [ ] `app/api/user/route.ts`
- [ ] `app/api/user-settings/route.ts`
- [ ] `app/api/profile-update-requests/route.ts`

**Notifications:**
- [ ] `app/api/notifications/route.ts`
- [ ] `app/api/user-notifications/route.ts`

---

## Phase 5: Components & Utilities (Weeks 11-12)

### 5.1 Component Categories

**446 Components to Review:**

1. **No Changes Required (~250 components)**
   - Pure React components
   - No Next.js dependencies
   - Client-only UI components

2. **Minor Updates (~150 components)**
   - Replace `next/link` with TanStack `Link`
   - Replace `next/image` with `@unpic/react`
   - Replace `next/navigation` hooks

3. **Significant Updates (~46 components)**
   - Components using `useSession`
   - Server/client component boundaries
   - API call patterns

### 5.2 Common Replacements

**Links:**
```tsx
// Before
import Link from 'next/link'
<Link href="/patient/123">View</Link>

// After
import { Link } from '@tanstack/react-router'
<Link to="/patient/$id" params={{ id: '123' }}>View</Link>
```

**Images:**
```tsx
// Before
import Image from 'next/image'
<Image src="/logo.svg" width={100} height={100} alt="Logo" />

// After
import { Image } from '@unpic/react'
<Image src="/logo.svg" width={100} height={100} alt="Logo" />
```

**Navigation:**
```tsx
// Before
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
const router = useRouter()
router.push('/home')

// After
import { useNavigate, useLocation, useSearch } from '@tanstack/react-router'
const navigate = useNavigate()
navigate({ to: '/home' })
```

### 5.3 Component Migration Tasks

**Week 11:**
- [ ] Update navigation components (LayoutWrapper, etc.)
- [ ] Update all Link usages (~100+ instances)
- [ ] Update all Image usages (~50+ instances)
- [ ] Update navigation hooks
- [ ] Test component rendering

**Week 12:**
- [ ] Update API call patterns in components
- [ ] Update form submission handlers
- [ ] Update auth-dependent components
- [ ] Final component testing
- [ ] Performance optimization

---

## Phase 6: Testing & Polish (Week 13-14)

### 6.1 Testing Checklist

**Authentication:**
- [ ] Login flow (web)
- [ ] Login flow (mobile)
- [ ] Logout
- [ ] Session persistence
- [ ] Protected routes redirect
- [ ] Admin access control

**Core Features:**
- [ ] Patient creation
- [ ] Patient viewing/editing
- [ ] Patient assignment
- [ ] Medical evacuation workflows
- [ ] Messaging system
- [ ] Notifications
- [ ] Video calling (LiveKit)
- [ ] File uploads

**Data Operations:**
- [ ] Database queries
- [ ] Real-time updates (PowerSync)
- [ ] Data synchronization
- [ ] Audit logging

**External Integrations:**
- [ ] Telegram bot integration
- [ ] S3 file storage
- [ ] Email services (Brevo/SendGrid)
- [ ] Translation API
- [ ] LiveKit video

### 6.2 Performance Optimization

**Tasks:**
- [ ] Bundle size analysis
- [ ] Code splitting optimization
- [ ] Lazy loading implementation
- [ ] Image optimization configuration
- [ ] Database query optimization
- [ ] Caching strategy implementation

### 6.3 Production Readiness

**Deployment:**
- [ ] Update Dockerfile for Vite build
- [ ] Configure environment variables
- [ ] Update CI/CD pipeline
- [ ] Set up staging environment
- [ ] Load testing
- [ ] Security audit

**Documentation:**
- [ ] Update README.md
- [ ] Document new patterns
- [ ] Update developer onboarding docs
- [ ] Create troubleshooting guide

---

## Risk Mitigation

### High-Risk Areas

**1. Authentication System**
- **Risk**: Breaking existing user sessions, mobile app compatibility
- **Mitigation**: 
  - Maintain backward-compatible token format
  - Parallel testing environment
  - Gradual rollout strategy
  - Keep mobile app token validation unchanged

**2. API Contracts**
- **Risk**: Breaking mobile app or external integrations
- **Mitigation**:
  - Version API endpoints during migration
  - Maintain REST endpoint compatibility
  - Document all API changes
  - Test with mobile app

**3. Database Operations**
- **Risk**: Data loss, performance degradation
- **Mitigation**:
  - Drizzle ORM remains unchanged
  - No database schema changes
  - Extensive testing before production

### Rollback Plan

**Preparation:**
1. Tag current production version: `git tag v1.0-next.js-stable`
2. Maintain separate deployment branches
3. Document all environment variable changes
4. Keep Docker images of working version

**If Rollback Needed:**
1. Checkout stable tag
2. Restore environment variables
3. Deploy previous Docker image
4. Restore database if needed (from backups)

---

## Migration Alternatives & Recommendations

### Alternative 1: Gradual Migration
- Run Next.js and TanStack Start in parallel
- Migrate page by page over 6 months
- **Pros**: Lower risk, incremental testing
- **Cons**: Maintenance burden, complex routing

### Alternative 2: Stay with Next.js
- Continue with Next.js 16+
- **Pros**: No migration cost, stable platform
- **Cons**: Miss TanStack benefits, vendor lock-in concerns

### Recommendation: Full Migration (This Plan)
**Rationale:**
- Clean break, modern architecture
- Better performance potential
- More control over routing and SSR
- Aligns with TanStack ecosystem (already using React Query)
- 2-3 months is acceptable for the benefits

---

## Success Criteria

### Must Have (MVP)
- [ ] All 30 pages migrated and functional
- [ ] Authentication working (web + mobile)
- [ ] All critical API endpoints functional
- [ ] Database operations working
- [ ] Existing features maintain parity

### Should Have
- [ ] Performance improvements vs Next.js
- [ ] Smaller bundle sizes
- [ ] Better developer experience
- [ ] All tests passing

### Nice to Have
- [ ] Improved routing patterns
- [ ] Better code organization
- [ ] Enhanced type safety
- [ ] Faster build times

---

## Cost-Benefit Analysis

### Costs
- **Development Time**: 2-3 person-months
- **Risk**: Temporary instability during migration
- **Learning Curve**: Team training on TanStack Start
- **Testing**: Extensive QA required

### Benefits
- **Performance**: Faster initial loads, better code splitting
- **Control**: More control over SSR, routing, bundling
- **Flexibility**: Not locked into Next.js ecosystem
- **Modern Stack**: Cutting-edge React patterns
- **Bundle Size**: Potentially smaller bundles
- **DX**: Better development experience with Vite

### ROI Timeline
- **Short-term (0-6 months)**: Net negative (migration cost)
- **Medium-term (6-18 months)**: Break even (improved velocity)
- **Long-term (18+ months)**: Net positive (maintenance, scalability)

---

## Conclusion

**Is This Migration Worth It?**

**YES, IF:**
- ✅ You have 2-3 months of development capacity
- ✅ You want more control over your stack
- ✅ You're committed to long-term maintenance
- ✅ Team is willing to learn new patterns
- ✅ Performance is a key concern

**NO, IF:**
- ❌ You need to ship features urgently
- ❌ Team lacks React Router expertise
- ❌ Next.js is working fine for your needs
- ❌ You can't afford the risk

**Recommended Decision:** 
Given the scale (631 files), complexity (authentication, 150 API routes), and active development needs, I recommend **deferring this migration** unless there are specific pain points with Next.js that TanStack Start would solve. If you do proceed, ensure:
1. Dedicated team for 2-3 months
2. Freeze feature development during migration
3. Extensive testing phase
4. Clear rollback plan

---

## Next Steps

1. **Review this plan** with the team
2. **Decide** on migration timeline
3. **Assign** dedicated migration team
4. **Set up** parallel development environment
5. **Start** with Phase 1 (Infrastructure)

---

**Document Maintainers:** Development Team  
**Last Updated:** 2024  
**Questions?** Open an issue or contact the team lead