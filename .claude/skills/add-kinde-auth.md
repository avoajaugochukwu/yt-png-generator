# Add Kinde Auth to Next.js App

This skill adds Kinde authentication with a real-time "kill switch" to any Next.js app. It provides three layers of protection: middleware gating, SSO, and live token verification that lets you boot suspended users within seconds.

## Steps

### Step 1: Install the Kinde SDK

```bash
npm install @kinde-oss/kinde-auth-nextjs
```

### Step 2: Add environment variables

Check if `.env.local` exists. If it does, append the Kinde variables. If not, create it. Use placeholder values — the user will fill them in.

Append these to `.env.local`:

```bash
# Kinde Auth
KINDE_CLIENT_ID=your_kinde_client_id
KINDE_CLIENT_SECRET=your_kinde_client_secret
KINDE_ISSUER_URL=https://your-domain.kinde.com
KINDE_SITE_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000
```

**Important:** Do NOT overwrite existing `.env.local` content. Append only.

### Step 3: Create the auth API route

Create the file `app/api/auth/[kindeAuth]/route.ts`:

```typescript
import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
export const GET = handleAuth();
```

### Step 4: Create proxy or middleware (version-conditional)

**Read `package.json` first** to determine the Next.js major version.

**If Next.js >= 16:** Create `proxy.ts` in the project root (next to `package.json`):

```typescript
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next();
  }
  return withAuth(request);
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

**If Next.js < 16:** Create `middleware.ts` in the project root (next to `package.json`):

```typescript
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next();
  }
  return withAuth(request);
}

export default middleware;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

**Why localhost bypass:** During local development, Kinde's auth redirects are unnecessary and can break hot-reload workflows. The bypass skips auth entirely on `localhost` and `127.0.0.1`.

### Step 4b: Increase proxy/middleware body size limit

**Read `next.config.ts` first.** Merge the following into the existing config object (do NOT overwrite existing config properties):

**If Next.js >= 16:**

```typescript
experimental: {
  proxyClientMaxBodySize: "1gb",
}
```

**If Next.js < 16:**

```typescript
experimental: {
  serverActions: { bodySizeLimit: "1gb" },
}
```

**Why:** Without this, requests with large payloads (audio files, base64 images) passing through the proxy/middleware will fail with 500 errors due to the default body size limit.

### Step 5: Add the kill switch to the root layout (with localhost bypass)

**Read `app/layout.tsx` first.** Do NOT blindly overwrite it. Preserve all existing imports, fonts, metadata, className logic, and children rendering. Make these modifications:

1. Add these imports at the top:
```typescript
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
```

2. Make the default export function `async` (change `function RootLayout` to `async function RootLayout`).

3. Add this kill switch logic at the top of the function body, before the `return`. The entire auth block is wrapped in a localhost guard so local dev never hits Kinde's API:
```typescript
const headersList = await headers();
const host = headersList.get("host") ?? "";
const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

if (!isLocalhost) {
  const { getAccessToken, isAuthenticated } = getKindeServerSession();

  const isAuth = await isAuthenticated();
  if (!isAuth) {
    // Middleware handles redirect, this is a backup
  }

  // Kill switch: ping Kinde's live API on every page load
  const token = await getAccessToken();
  if (token) {
    try {
      const liveCheck = await fetch(
        `${process.env.KINDE_ISSUER_URL}/oauth2/v2/user_profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 0 },
        }
      );

      if (!liveCheck.ok) {
        redirect("/api/auth/logout");
      }
    } catch (e) {
      // If Kinde is unreachable, allow user to stay (fail-open)
    }
  }
}
```

4. Keep everything else exactly as-is — existing fonts, metadata export, body className, children, any providers, navigation components, etc.

### Step 6: Add logout to the navigation component

**Find the navigation component** by reading the layout to see what nav component is imported, then read that file. If no navigation component exists, skip this step and tell the user.

Modifications to the navigation component:

1. Add this import:
```typescript
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
```

2. Add `'use client';` at the top if not already present (LogoutLink is a client component).

3. Add a logout button in the nav, preserving all existing links and styling. Place it at the end of the nav items:
```tsx
<LogoutLink className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors">
  Log out
</LogoutLink>
```

Match the styling to the existing nav component's design patterns rather than using the exact className above if the existing styles differ.

### Step 7: Remind the user about Kinde Dashboard setup

After all changes, print this reminder:

> **Kinde Dashboard Setup Required:**
> 1. Go to Kinde Dashboard → Applications → [Your App] → Authentication
> 2. Add allowed callback URL: `http://localhost:3000/api/auth/kinde_callback`
> 3. Add allowed logout redirect URL: `http://localhost:3000`
> 4. Fill in the placeholder values in `.env.local` with your actual Kinde credentials
> 5. When deploying to production, add your production URLs to both the `.env` and Kinde Dashboard

### Verification

After completing all steps, run `npm run dev` and verify:
- No deprecation warnings in the console (especially on Next.js 16+)
- Localhost loads without auth redirect
- On production/non-localhost, auth redirect works as expected
