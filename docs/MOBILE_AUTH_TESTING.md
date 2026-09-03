# Mobile Auth Testing Runbook

This document explains the mobile sign-in integration, what changed in this repo,
and how to run the real-device test flow reliably.

## What Changed

The mobile app can now sign in against the GPFA web/Next backend instead of only
fixture-mode auth.

Code changes:

- `src/api/config.ts`
  - Reads `EXPO_PUBLIC_API_URL` as the general API base.
  - Reads `EXPO_PUBLIC_GPFA_WEB_ORIGIN` as the web/auth origin.
  - Builds `AUTH_BASE_URL` and `SIGN_IN_URL` from those env vars.
  - Points `ROUTES.login` at `/api/members/sign-in`.
  - Declares `ROUTES.notifications` as `/api/members/notifications`.
  - Declares `ROUTES.workingGroups` as `/api/members/working-groups`.
  - Declares `ROUTES.workingGroupMembership` as `/api/members/working-groups/:slug/membership`.
  - Prepares typed working-group feed/co-lead/tag/subscription/resource routes plus forum, poll, upvote, and saved-content routes under `/api/members/*`.
- `src/api/portal.ts`
  - Calls `GET /api/members/notifications` for the header notification bell.
  - Calls `GET /api/members/working-groups` for Home and the Groups directory.
  - Calls `GET /api/members/working-groups/:slug/membership` when a group opens.
  - Uses `POST`/`DELETE /api/members/working-groups/:slug/subscription` for subscribe toggles.
  - Keeps fixture fallbacks available for fields not returned by ready routes.
- `src/auth/AuthProvider.tsx`
  - Sends sign-in to `AUTH_BASE_URL + /api/members/sign-in`.
  - Sends `{ email, password, webOrigin }` when `EXPO_PUBLIC_GPFA_WEB_ORIGIN` is set.
  - Accepts both top-level tokens and nested `auth.accessToken` responses.
  - Stores the access token in SecureStore and sends it on later requests.
- `src/api/client.ts`
  - Supports per-request `baseUrl` overrides.
  - Sends `Authorization: Bearer <accessToken>` on non-anonymous requests.
  - Adds development request logs for method, URL, status, timeout, and network errors.
  - Includes ngrok skip-warning headers for ngrok-free URLs.
- `src/screens/SignInScreen.tsx`
  - Shows a development-only `Auth: ...` URL on the sign-in form so testers can confirm what the phone is actually calling.
- `package.json`
  - Uses `expo@~54.0.37`.
  - Adds `@expo/ngrok` for Expo tunnel support.

## Expected Backend Routes

The sign-in route must be available on the configured web/API origin:

```http
POST /api/members/sign-in
Content-Type: application/json

{ "email": "member@example.org", "password": "...", "webOrigin": "https://example.test" }
```

The response should include an access token. The app accepts either shape:

```json
{ "accessToken": "..." }
```

or:

```json
{ "auth": { "accessToken": "..." } }
```

For bad credentials, the backend should return `401` or `403`. The app then
shows the invalid-credentials message on the sign-in screen.

The currently migrated authenticated UI route is:

```http
GET /api/members/notifications
Authorization: Bearer <accessToken>
```

After sign-in, the bell in every screen header shows the unread count. Tapping
it opens the notifications sheet and refetches this route.

## Recommended Off-Network Setup

Use this when the phone and Mac are not on the same reachable LAN, or when LAN
requests from the phone to the Mac timeout.

You need two tunnels:

- Expo tunnel for the mobile app bundle, port `8081`.
- Backend tunnel for the Next/web API server, port `3000`.

### 1. Start The Web/API Server

In the GPFA web/Next backend repo:

```bash
npm run dev -- --hostname 0.0.0.0
```

Verify local auth from the Mac:

```bash
curl -i -X POST http://127.0.0.1:3000/api/members/sign-in \
  -H "Content-Type: application/json" \
  --data '{"email":"wrong@example.com","password":"wrong"}'
```

Expected result: fast `401` JSON, not timeout.

### 2. Expose Backend Port 3000

Preferred during this session was Cloudflare Tunnel because it avoids conflict
with Expo's ngrok tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the generated HTTPS URL, for example:

```bash
https://example-words.trycloudflare.com
```

Verify the public backend URL:

```bash
curl -i -X POST https://example-words.trycloudflare.com/api/members/sign-in \
  -H "Content-Type: application/json" \
  --data '{"email":"wrong@example.com","password":"wrong"}'
```

Expected result: fast `401` JSON.

### 3. Update Mobile Env

In the mobile repo `.env`, set both public env vars to the backend tunnel URL:

```bash
EXPO_PUBLIC_API_URL=https://example-words.trycloudflare.com
EXPO_PUBLIC_GPFA_WEB_ORIGIN=https://example-words.trycloudflare.com
EXPO_PUBLIC_FIXTURE_PORTAL_DATA=true
```

Do not include a trailing slash.

`EXPO_PUBLIC_FIXTURE_PORTAL_DATA=true` means sign-in, member notifications,
working groups, and working-group membership are real, but the remaining portal
screens continue using local fixture data. Keep it enabled while only those
routes are migrated. Remove it or set it to `false` once `/me`, `/posts`,
`/news`, and the other portal routes return the mobile contract shapes.

### 4. Start Expo Tunnel

In the mobile repo:

```bash
pkill -f "expo start|@expo/cli|metro" 2>/dev/null || true && npx expo start --tunnel -c
```

Keep this terminal open. Scan the fresh QR with Expo Go.

### 5. Test On The Phone

On the mobile sign-in page, confirm the development label shows:

```text
Auth: https://example-words.trycloudflare.com/api/members/sign-in
```

Then test wrong credentials first.

Expected result:

- The web/backend terminal logs the `POST /api/members/sign-in` request.
- Metro logs an API line such as `[api] POST https://.../api/members/sign-in`.
- The app shows an invalid-credentials message.
- It does not show a timeout.

Then test real credentials.

Expected result:

- The backend returns an access token.
- The app signs in and stores the token.
- Later authenticated requests include `Authorization: Bearer <accessToken>`.

### Test Password Recovery

Return to the signed-out screen and enter a mixed-case email with surrounding
spaces, then tap `Forgot password?`.

Expected result:

- The control briefly shows `Opening password reset…` and opens the system
  browser once.
- The browser opens `/forgot-password` on the configured GPFA web origin.
- A valid email is normalized and prefilled. Empty or invalid input opens the
  same page without a prefill.
- Recovery submission, the email callback, and password replacement remain in
  the browser. No recovery token or browser cookie is copied into the app.
- After resetting the password, reopen the app manually and sign in with the
  new password.

Also verify failure behavior before finishing:

- With both API/web origins unset, fixture mode shows a retryable inline error
  instead of inventing a production URL.
- A development LAN `http://` origin is accepted, but production builds require
  HTTPS.
- A blocked or unavailable browser leaves the sign-in fields intact and shows
  the same retryable inline error.

Expo inlines these origins at build time. Restart Metro with a cleared cache
after changing either value. Do not log the typed email, recovery URL, callback
parameters, browser cookies, or recovery grant while testing.

### Signing Out During Testing

In development builds, tap the header avatar to open the member sheet, then tap
`Sign out`. This clears the stored SecureStore token and returns the app to the
sign-in screen.

Production behaviour still restores a valid stored token and skips sign-in on
launch.

## LAN-Only Setup

Use this only when the phone can directly reach the Mac over Wi-Fi.

In the web/backend repo:

```bash
npm run dev -- --hostname 0.0.0.0
```

In the mobile repo `.env`:

```bash
EXPO_PUBLIC_API_URL=http://10.0.0.98:3000
EXPO_PUBLIC_GPFA_WEB_ORIGIN=http://10.0.0.98:3000
```

Then start Expo on LAN:

```bash
npx expo start --lan -c
```

If phone sign-in times out and the backend terminal does not log anything, the
phone cannot reach the Mac LAN IP. Use the off-network tunnel setup instead.

## Troubleshooting

### The backend receives curl requests but not phone requests

The phone is not reaching the backend URL. Confirm the `Auth:` URL on the mobile
sign-in page. If it is a LAN IP and the phone is off-network, switch to a public
backend tunnel URL.

### Expo loads, but sign-in times out

Expo tunnel only exposes Metro. It does not expose the backend API. Ensure
`EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_GPFA_WEB_ORIGIN` point to a public backend
URL that the phone can reach.

### Expo tunnel crashes with ngrok errors

Avoid using ngrok for the backend at the same time as Expo tunnel. Use
Cloudflare Tunnel for backend port `3000`, then use Expo tunnel for Metro.

### The sign-in screen shows the wrong Auth URL

Expo inlines `EXPO_PUBLIC_*` variables at startup. Restart Expo with cache clear:

```bash
npx expo start --tunnel -c
```

Force-close Expo Go, reopen it, and scan the fresh QR.

### Correct sign-in works but the app shows another error

That can happen when `EXPO_PUBLIC_FIXTURE_PORTAL_DATA` is disabled before all
mobile API routes are migrated. After sign-in, the app loads routes such as
`/me`, `/groups`, `/posts`, and `/news`. If those are not implemented on the
backend yet, auth can succeed while data screens still show errors. Re-enable
`EXPO_PUBLIC_FIXTURE_PORTAL_DATA=true` to keep testing auth against fixture
portal screens.

## Verification Commands

Run this from the mobile repo after code changes:

```bash
npm run typecheck
```

Run this against the active backend tunnel to confirm bad credentials produce an
auth failure instead of a timeout:

```bash
curl -i -X POST https://example-words.trycloudflare.com/api/members/sign-in \
  -H "Content-Type: application/json" \
  --data '{"email":"wrong@example.com","password":"wrong"}'
```
