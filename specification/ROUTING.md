# File-Based Routing Guide

## Overview

This project uses **TanStack Router** with its Vite plugin for automatic file-based routing. Route files live in `src/routes/`. The Vite plugin watches this directory and auto-generates `src/routeTree.gen.ts` — never edit that file manually.

## Directory Structure

```
src/routes/
├── __root.tsx                          # Root layout (header, <Outlet />)
├── login.tsx                           # /login (public)
├── register.tsx                        # /register (public)
├── _authenticated.tsx                  # Auth guard layout (no URL segment)
└── _authenticated/
    ├── index.tsx                       # / (protected home)
    └── profile/
        └── complete.tsx               # /profile/complete (protected)
```

## Key Concepts

| Pattern | Meaning |
|---------|---------|
| `__root.tsx` | Root layout, wraps everything |
| `index.tsx` | Index route for a directory (`/` or `/somepath`) |
| `_prefixed.tsx` | **Pathless layout** — wraps child routes without adding a URL segment |
| `$param.tsx` | Dynamic route parameter (e.g., `$rankingId` → `/rankings/123`) |
| `foo.bar.tsx` | Nested route using dots instead of directories (`/foo/bar`) |

## How Auth Works

- **Public routes** (`login.tsx`, `register.tsx`): Placed directly in `src/routes/`. They redirect to `/` if the user is already authenticated.
- **Protected routes**: Placed inside `src/routes/_authenticated/`. The `_authenticated.tsx` layout checks auth state reactively — unauthenticated users are redirected to `/login`, users without a profile are redirected to `/profile/complete`.

## Adding a New Public Route

Example: Add an `/impressum` page.

1. Create `src/routes/impressum.tsx`:
   ```tsx
   import { createFileRoute } from "@tanstack/react-router";

   export const Route = createFileRoute("/impressum")({
     component: ImpressumPage,
   });

   function ImpressumPage() {
     return <h1>Impressum</h1>;
   }
   ```
2. Save the file — the Vite plugin auto-updates `routeTree.gen.ts`.
3. The page is now available at `/impressum`. No further wiring needed.

## Adding a New Protected Route

Example: Add a `/rankings` page (only accessible when logged in with a complete profile).

1. Create `src/routes/_authenticated/rankings.tsx`:
   ```tsx
   import { createFileRoute } from "@tanstack/react-router";

   export const Route = createFileRoute("/_authenticated/rankings")({
     component: RankingsPage,
   });

   function RankingsPage() {
     return <h1>Rankings</h1>;
   }
   ```
2. Save — route tree updates automatically.
3. The page is at `/rankings` (the `_authenticated` prefix is **not** part of the URL).
4. Auth guard runs automatically via the `_authenticated.tsx` layout.

### With a Dynamic Parameter

For `/rankings/:rankingId`, create `src/routes/_authenticated/rankings/$rankingId.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/rankings/$rankingId")({
  component: RankingDetailPage,
});

function RankingDetailPage() {
  const { rankingId } = Route.useParams();
  return <h1>Ranking {rankingId}</h1>;
}
```

## Important Notes

- `routeTree.gen.ts` is auto-generated — do not edit it.
- The route string in `createFileRoute("...")` must match the file path exactly (the plugin validates this).
- The Vite plugin may scaffold a default template when creating a new file — always replace it with your actual implementation.
- Use `@/` path alias for imports (e.g., `import { Foo } from "@/features/foo"`).
- UI text should be in German.
