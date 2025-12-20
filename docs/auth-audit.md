## What route is serving `/signin` and why
- Only one route exists: `src/app/(auth)/signin/page.tsx` (route group `(auth)` is ignored in the URL). This file currently renders placeholder text, so `/signin` shows the placeholder.

## What files implement the sign-in page (and which are unused)
- Implemented (but placeholder): `src/app/(auth)/signin/page.tsx`.
- No other `/signin` routes exist (`src/app/signin/page.tsx` is absent). The `(auth)` route is the one Next.js serves.

## NextAuth config status
- Provider: GitHub via `next-auth/providers/github`.
- `authOptions` is exported from `src/lib/auth.ts` and consumed by `src/app/api/auth/[...nextauth]/route.ts`.
- `pages.signIn` was not set, so NextAuth would default to its built-in page; we will set it to `/signin` to match the custom route.
- Secret and client IDs are read from `env` (`NEXTAUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`).

## What is missing / miswired
- The `/signin` page is still a placeholder and does not render a GitHub sign-in button or call `signIn("github", ...)`.
- There is no GitHub sign-in button component in `src/components`.
- `pages.signIn` is not configured to point at `/signin`.

## Minimal fix plan
1) Create a reusable client component `src/components/GitHubSignInButton.tsx` that calls `signIn("github", { callbackUrl })`.
2) Replace the placeholder in `src/app/(auth)/signin/page.tsx` with a server component that:
   - Reads `callbackUrl` from `searchParams` safely (default `/dashboard`).
   - If already signed in, redirects to `callbackUrl`.
   - Renders the GitHub sign-in button with the callback.
3) Update `src/lib/auth.ts` to set `pages.signIn = "/signin"` so NextAuth uses the custom page.
