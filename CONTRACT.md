# API Contract

How the GPFA mobile app expects to talk to a backend, and what you need to do to
plug one in.

Everything here describes code that exists today. The app currently runs on
local fixtures; nothing about the UI changes when you point it at a real server.

---

## 1. The switch

The app decides where data comes from by reading one environment variable:

```bash
# .env  (see .env.example)
EXPO_PUBLIC_API_URL=https://api.example.org
```

| `EXPO_PUBLIC_API_URL` | Behaviour |
| --- | --- |
| unset / empty | **Fixture mode.** Data comes from `src/data/fixtures.ts`. Sign-in accepts any credentials. Mutations are local no-ops. |
| set | **Remote mode.** Every read and write hits your server. Sign-in posts real credentials and stores a token. |

Expo inlines `EXPO_PUBLIC_*` at **build time**, so restart Metro after changing
it — a hot reload will not pick it up:

```bash
npx expo start --clear
```

There is no per-screen fallback. Once the URL is set, a failing endpoint shows
an error state; it does not silently fall back to fixtures. That is deliberate —
silent fallback hides broken integrations.

---

## 2. Architecture

```
screens/ ──────────► App.tsx ──────► src/api/portal.ts ──┬─► src/data/fixtures.ts
(presentational)   (owns state,     (THE SEAM: decides   │   (no API URL set)
                    fires queries)   fixtures vs HTTP)   │
                                                         └─► src/api/client.ts
                                                             (fetch + auth + errors)
```

Rules that keep this working:

- **Screens never import `src/data/fixtures.ts`.** They receive data as props.
  Only `src/api/portal.ts` may import fixtures. (`grep -rn "data/fixtures" src`
  should return exactly one hit.)
- **Every repository function returns a `Promise`**, even in fixture mode. The
  UI has always been written against async data, so switching sources changes
  nothing in the components.
- **Shape mismatches get fixed in `src/api/portal.ts`**, never by changing
  screens. See §7.

### File map

| File | Responsibility |
| --- | --- |
| `src/api/config.ts` | Base URL, remote/fixture flag, timeout, all route paths |
| `src/api/types.ts` | The domain types — **the contract itself** |
| `src/api/client.ts` | `fetch` wrapper: auth header, timeout, `ApiError` |
| `src/api/portal.ts` | Repository. One function per operation |
| `src/api/tokens.ts` | Token storage in Keychain / Keystore |
| `src/api/useQuery.ts` | `{ data, loading, error, refetch }` hook |
| `src/auth/AuthProvider.tsx` | Session state, login, restore, 401 handling |
| `src/components/DataGate.tsx` | Spinner + retry UI around a query |
| `src/data/fixtures.ts` | Seed content for fixture mode |

---

## 3. Authentication

### 3.1 What the app does

1. On launch, reads a stored token from SecureStore. If present → signed in,
   skip the sign-in screen. If absent → show sign-in.
2. Sign-in `POST`s to `/auth/login` with `{ email, password }`, **without** an
   `Authorization` header.
3. On success, stores the token and enters the app.
4. Every later request sends `Authorization: Bearer <token>`.
5. Any `401` or `403` from **any** endpoint clears the token and returns the
   user to sign-in.

### 3.2 Login

```http
POST /auth/login
Content-Type: application/json

{ "email": "member@example.org", "password": "…" }
```

Response — the app accepts any of these key spellings, so you probably don't
need to change your server:

```jsonc
{
  "accessToken": "eyJ…",     // or "access_token", or "token"
  "refreshToken": "…"        // or "refresh_token" — optional
}
```

Failure should return **401**. The app shows *"That email and password were not
accepted."* Any other non-2xx shows the server's `message` / `error` / `detail`
field if present.

> **If your web app uses httpOnly session cookies, this will not work.** Native
> apps have no per-origin cookie jar. You need a token-issuing route for mobile.
> This is the single most likely server-side change required.

### 3.3 Not yet implemented

- **Refresh tokens are stored but never used.** There is no refresh-on-401
  retry — a 401 signs the user out. If your access tokens are short-lived, add
  the refresh call in `src/api/client.ts` before shipping.
- `ROUTES.logout` and `ROUTES.session` are declared in `config.ts` but **not
  called**. Sign-out is currently local-only (clears the token).
- **No UI triggers sign-out.** `signOut` exists in `AuthProvider` and is
  destructured in `App.tsx`, but the tab bar is Home / Ask GPFA / Groups with no
  profile screen, so the only way the session ends is a 401. Add a control when
  you add a profile screen.

---

## 4. Endpoints

Base URL is prefixed to every path. All bodies are JSON.

| Method | Path | Used by | Returns |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Sign-in | `{ accessToken, refreshToken? }` |
| `GET` | `/me` | Greeting, avatars, authorship | `Member` |
| `GET` | `/groups` | Home, Groups drawer | `Group[]` |
| `GET` | `/events/next` | Home calendar card | `CalendarEvent \| null` |
| `GET` | `/posts` | Groups feed | `FeedEntry[]` |
| `GET` | `/news` | Home News Radar | `NewsItem[]` |
| `GET` | `/ask/suggestions` | Ask GPFA empty state | `string[]` |
| `POST` | `/ask` | Ask GPFA | `AskAnswer` |
| `POST` | `/posts` | Composer | `Thread` |
| `POST` | `/posts/:id/replies` | Post detail | `Reply` |
| `POST`/`DELETE` | `/posts/:id/upvote` | Feed + detail | ignored |
| `POST` | `/posts/:id/vote` | Poll | ignored |
| `POST` | `/posts/:id/rsvp` | Event post | ignored |

Declared in `ROUTES` but **not called**: `/auth/logout`, `/auth/session`,
`/posts/:id`. The post detail screen reads from the already-loaded feed rather
than fetching one post.

To change any path, edit `ROUTES` in `src/api/config.ts` — nothing else
references URLs.

### 4.1 Request/response details

**`GET /me` → `Member`**

The signed-in member. Home and Groups **block on this** — `DataGate` holds the
spinner until it resolves, because the greeting, top-bar avatar, and the author
of anything the member posts all come from it.

```json
{ "id": "rg", "name": "Robert Goobie", "firstName": "Robert", "initials": "RG", "org": "HOOPP" }
```

`initials` is optional — derived from `name` when absent.

**`GET /events/next` → `CalendarEvent | null`**

The single "Next on the calendar" card on Home. Return `null` and the card is
hidden entirely.

```json
{
  "id": "annual-2026",
  "month": "Sep",
  "day": "17",
  "title": "GPFA Annual Meeting 2026",
  "meta": "Toronto, Canada · registration open",
  "tags": [{ "label": "Registered", "tone": "green" }, { "label": "Conference", "tone": "default" }]
}
```

`month` and `day` are pre-formatted display strings, not a date. `tone` is
`"green"` (accented) or `"default"` (neutral).

**`GET /groups` → `Group[]`**

Must include each group's `threads`. Home shows the newest thread's title, and
the filter drawer shows a per-group post count. Returning groups without
`threads` renders "No posts yet" and a count of 0 rather than crashing, but the
UI will be wrong. See §7.2 if you'd rather not duplicate that data.

**`GET /posts` → `FeedEntry[]`**

The cross-group feed. Flat, not nested:

```json
[{ "post": { "id": "cl1", "title": "…", "replies": [] }, "groupId": "cl" }]
```

Return every post the member may see. **Filtering, sorting, and search are all
client-side today** (§6), so pagination is not supported — see §8.

**`POST /ask` → `AskAnswer`**

```http
POST /ask
{ "question": "How do peers structure indemnification?" }
```
```json
{ "text": "Across responding members…", "sources": ["Matrix v3 — Collateral & Liquidity"] }
```

Failures are caught and rendered as a chat message: *"Ask GPFA is unavailable
right now."* — the screen does not throw.

**`POST /posts` → `Thread`**

Body is `NewPostInput`. Return the created post; the app swaps its optimistic
placeholder for your record so the real `id` and timestamps take effect.

**`POST /posts/:id/replies` → `Reply`**

Body is `{ "text": "…" }`. The author is the authenticated member — do not trust
a client-supplied author.

**Upvote / vote / RSVP** — return anything; the app ignores the body and only
checks for a non-error status.

- Upvote: `POST` to set, `DELETE` to unset.
- Vote: `{ "option": 0 }` — zero-based index into `poll.options`. One vote per
  organization; the app blocks a second vote client-side, but **enforce it
  server-side**.
- RSVP: `{ "choice": "yes" | "no" }`.

---

## 5. Types

From `src/api/types.ts`. Field names are terse because they were transcribed
from the design documents — if your API differs, map it (§7) rather than
renaming across the UI.

### `Group`

```ts
{
  id: string;          // "cl" — stable key, used by the feed filter
  n: string;           // "Collateral & Liquidity" — display name
  short: string;       // "Collateral & Liq" — chips and composer
  cls: WgRuleClass;    // colour key, see below
  unread: number;      // Home badge; 0 hides it
  meta: string;        // "12 new posts this week"
  threads: Thread[];   // see GET /groups above
}
```

`cls` must be exactly one of — anything else renders no colour:

```
wg-rule-collateral-liquidity | wg-rule-legal | wg-rule-technology
wg-rule-risk | wg-rule-private-credit | wg-rule-regional | wg-rule-general
```

This is a UI concern in the data contract. If your server has no opinion,
hard-code the mapping from `id` in `portal.ts`.

### `Thread` (a post)

```ts
{
  id: string;
  type?: PostType;      // 'discussion' | 'poll' | 'announcement' | 'event'
                        // omitted → 'discussion'
  title: string;
  author: string;       // "Elena Rossi"
  initials?: string;    // "ER" — derived from author if omitted
  org: string;          // "APG"
  time: string;         // "2h ago" — DISPLAY STRING, not a timestamp
  state?: string;       // "Closes Mon" — short status by the type chip
  body: string;
  file?: string;        // attachment filename
  fileMeta?: string;    // "XLSX · 214 KB · UPLOADED TODAY"
  poll?: Poll;
  eventRows?: EventRow[];
  upvotes?: number;     // absent → 0
  mins?: number;        // age in MINUTES — the "Newest" sort key
  replies: Reply[];     // required; [] is fine
}
```

Two fields deserve attention:

- **`time` is a pre-formatted string**, not ISO 8601. The app never parses it.
  If you send timestamps, format them in `portal.ts`.
- **`mins` is what actually sorts.** Without it a post sorts as age 0 and floats
  to the top of "Newest". Send `mins` **and** `time`, or compute `mins` from
  your timestamp in the mapping layer.

### `Reply`

```ts
{
  a: string;          // author name  ← note the terse key
  org: string;
  time: string;       // display string
  initials?: string;
  mention?: string;   // "@Marcus Chen" — rendered highlighted before text
  text: string;
  up?: number;
}
```

### `Poll`, `PollOption`, `EventRow`

```ts
Poll        { q: string; closes: string; options: PollOption[] }
PollOption  { label: string; votes: number }   // votes = current tally
EventRow    { icon: 'calendar' | 'pin' | 'people'; text: string }
```

Poll percentages are computed client-side from `options[].votes` plus the
member's own vote. Send current tallies; the app does the arithmetic.

### `NewsItem`

```ts
{
  rel: 'high' | 'medium' | 'low';   // relevance dot
  tag: string;                      // "Regulation"
  t: string;                        // headline  ← terse key
  src: string;                      // "RISK.NET · 5H"
}
```

### `Member`

```ts
{
  id: string;
  name: string;        // "Robert Goobie" — authorship, avatars
  firstName: string;   // "Robert" — Home greeting
  initials?: string;   // "RG" — derived from name if omitted
  org: string;         // "HOOPP"
}
```

### `CalendarEvent`, `EventTag`

```ts
CalendarEvent { id, month, day, title, meta, tags: EventTag[] }
EventTag      { label: string; tone: 'green' | 'default' }
```

`month` ("Sep") and `day` ("17") are display strings, not a parsed date.

### `NewPostInput`, `AskAnswer`, `FeedEntry`, `RsvpChoice`

```ts
NewPostInput { groupId: string; type: PostType; title: string; body: string }
AskAnswer    { text: string; sources: string[] }
FeedEntry    { post: Thread; groupId: string }
RsvpChoice   'yes' | 'no'
```

---

## 6. What the client does, so your server doesn't have to

These are **client-side over the already-loaded feed**:

| Behaviour | Where |
| --- | --- |
| Search (title, body, author, org, group name) | `GroupsScreen.tsx` |
| Group filter, post-type filter | filter drawer |
| Sort: Newest (`mins`), Most upvoted, Most replies | `GroupsScreen.tsx` |
| Poll percentages | computed from `options[].votes` |
| Reply counts, stacked avatars | derived from `replies[]` |

Consequence: **`GET /posts` must return the full corpus.** This is fine for
hundreds of posts and wrong for thousands — see §8.

---

## 7. Adapting a backend that doesn't match

### 7.1 Map in the repository

`src/api/portal.ts` is the only place that should know your server's shape:

```ts
// src/api/portal.ts
interface ApiPost {
  id: string;
  headline: string;
  authorName: string;
  createdAt: string;   // ISO 8601
  workingGroupId: string;
}

export function getFeed(): Promise<FeedEntry[]> {
  if (!USING_REMOTE_API) { /* fixtures */ }

  return request<ApiPost[]>(ROUTES.feed).then((rows) =>
    rows.map((r) => ({
      groupId: r.workingGroupId,
      post: {
        id: r.id,
        title: r.headline,
        author: r.authorName,
        time: relativeTime(r.createdAt),                 // "2h ago"
        mins: (Date.now() - Date.parse(r.createdAt)) / 60000,
        replies: [],
        body: '',
        org: '',
      },
    }))
  );
}
```

Keep `src/api/types.ts` as the target shape. If you change it, you change the UI.

### 7.2 If nesting `threads` inside `/groups` is wrong for you

Two call sites need it: Home's latest-thread line and the drawer's post count.
Either return a lightweight `threads` array (id + title is enough for Home), or
change those two call sites to derive from the already-loaded feed. Both are
small; the second is cleaner if your `/groups` is expensive.

---

## 8. Known gaps

Honest list of what is *not* handled, in rough priority order:

1. **No pagination.** `GET /posts` returns everything. Add cursor support in
   `getFeed()` and the feed's `ScrollView` when the corpus outgrows one payload.
2. **No token refresh.** A 401 signs the user out (§3.3).
3. **No sign-out UI** (§3.3).
4. **No caching between screens.** `useQuery` refetches on mount and holds no
   shared cache. If this becomes a problem, swap it for TanStack Query — call
   sites take the same shape, so the change is contained to `useQuery.ts` and
   its consumers.
5. **Search is client-side** (§6). Server-side search means a new endpoint and
   moving the query out of `GroupsScreen`.
6. **Not wired to anything:** the notification bell, the per-card `⋯` menu,
   "Forgot password?", and Share / send on feed cards.
7. **Composer captures only** group, type, title, body. A poll created in-app
   has no options; an event has no date rows.
8. **Session data is memory-only.** Optimistic state (`votes`, `upvoted`,
   `rsvps`, `extraReplies`, `newPosts`) lives in `App.tsx` and resets on reload.
   Server state is the source of truth after a refetch.

---

## 9. Errors

`src/api/client.ts` normalises every failure into `ApiError`:

```ts
class ApiError extends Error {
  status: number;         // 0 = no response (offline, bad host, timeout)
  body?: unknown;         // parsed response body if any
  isUnauthorized: boolean // 401 or 403
  isNetworkError: boolean // status === 0
}
```

- Messages are read from `message`, `error`, or `detail` on the response body,
  in that order. Sending one of those gives users a real message instead of
  *"Request failed (500)."*
- Requests time out after **15s** (`REQUEST_TIMEOUT_MS`).
- Read failures on Home and Groups render `DataGate`'s retry screen. Mutation
  failures roll the optimistic update back silently.

---

## 10. Mutation semantics

Every write is **optimistic with rollback**. The UI updates immediately, the
request fires, and the change reverts if it fails.

| Action | Optimistic effect | On failure |
| --- | --- | --- |
| Create post | Prepended to feed, `mins: 0` | Removed |
| Reply | Appended to thread | Removed |
| Upvote | Count ±1, icon turns green | Reverted |
| Vote | Option selected, percentages shown | Cleared |
| RSVP | Button state changes | Reverted to previous |

Implications for your server:

- **Be idempotent where you can.** Double-taps happen.
- **Return the created resource** for `POST /posts` and `POST /posts/:id/replies`
  so the app can replace its placeholder with the real record.
- **Enforce one-vote-per-org server-side.** The client guard is UX, not security.
- A failed write is currently silent — no toast. If you want the member told,
  add it at the `catch` sites in `App.tsx`.

---

## 11. Connecting: a checklist

1. Copy `.env.example` to `.env`, set `EXPO_PUBLIC_API_URL`.
2. `npx expo start --clear`.
3. Sign in. If it fails, check §3.2 — token key spelling is the usual culprit.
4. Home should load groups + news; Groups should load the feed.
5. Post, reply, upvote, vote. Watch your server logs — silence means the
   optimistic update fired but the request didn't.
6. `npm run typecheck` after any change to `types.ts` or `portal.ts`.

### Networking gotchas

- **`localhost` is the phone, not your machine.** Use the LAN address
  (`http://192.168.x.x:3000`) or a tunnel.
- **HTTPS is effectively required.** iOS App Transport Security blocks plain
  HTTP in release builds. Fine over LAN in dev; use TLS for anything real.
- **CORS does not apply.** Native requests aren't subject to it — no preflight,
  no `Access-Control-Allow-Origin`. (It returns if you ever build for web.)
- **The token is in the Keychain / Keystore**, not AsyncStorage. It survives app
  restarts and is wiped on sign-out or a 401.
