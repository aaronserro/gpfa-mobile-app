# API Contract

How the GPFA mobile app expects to talk to a backend, and what you need to do to
plug one in.

Everything here describes code that exists today. The app currently runs on
local fixtures; nothing about the UI changes when you point it at a real server.

---

## 1. The switch

The app decides where data comes from by reading one required env var plus one
optional auth env var:

```bash
# .env  (see .env.example)
EXPO_PUBLIC_API_URL=https://api.example.org
EXPO_PUBLIC_GPFA_WEB_ORIGIN=http://192.168.1.25:3000
```

| `EXPO_PUBLIC_API_URL` | Behaviour |
| --- | --- |
| unset / empty | **Fixture mode.** Data comes from `src/data/fixtures.ts`. Sign-in accepts any credentials. Mutations are local no-ops. |
| set | **Remote mode.** Every read and write hits your server. Sign-in posts real credentials and stores a token. |

`EXPO_PUBLIC_GPFA_WEB_ORIGIN` is optional and is sent to sign-in as
`webOrigin` when set. Use your Mac's LAN IP for real devices; `localhost`
points at the phone itself.

For a step-by-step real-device auth test flow, see
[docs/MOBILE_AUTH_TESTING.md](docs/MOBILE_AUTH_TESTING.md).

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
2. Sign-in `POST`s to `/api/members/sign-in` with `{ email, password }`, and
  includes `webOrigin` when `EXPO_PUBLIC_GPFA_WEB_ORIGIN` is set, **without** an
   `Authorization` header.
3. On success, stores the token and enters the app.
4. Every later request sends `Authorization: Bearer <token>`.
5. Any `401` or `403` from **any** endpoint clears the token and returns the
   user to sign-in.

### 3.2 Login

```http
POST /api/members/sign-in
Content-Type: application/json

{ "email": "member@example.org", "password": "…", "webOrigin": "http://192.168.1.25:3000" }
```

Response — the app accepts any of these key spellings, so you probably don't
need to change your server:

```jsonc
{
  "accessToken": "eyJ…",     // or "access_token", or "token"
  "refreshToken": "…"        // or "refresh_token" — optional
}
```

Also accepted (nested):

```jsonc
{
  "auth": {
    "accessToken": "eyJ…",   // or "access_token", or "token"
    "refreshToken": "…"      // or "refresh_token" — optional
  }
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

Base URL is prefixed to every path. Bodies are JSON unless a route explicitly notes another format.

| Method | Path | Used by | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/members/sign-in` | Sign-in | `{ accessToken, refreshToken? }` or `{ auth: { accessToken, refreshToken? } }` |
| `GET` | `/api/members/notifications` | Header notification bell | `MemberNotification[]`, newest first |
| `POST` | `/api/members/notifications/read` | Notification sheet mark-read action | `{ status, readAt }` |
| `POST` | `/api/members/notifications/dismiss` | Notification sheet dismiss action | `{ status, dismissedAt }` |
| `GET` | `/api/members/working-groups` | Home + Groups directory | `WorkingGroupsResponse` |
| `GET` | `/api/members/working-groups/:slug/membership` | Group subscribe state | `WorkingGroupMembershipResponse` |
| `GET` | `/api/members/working-groups/:slug/co-leads` | Group detail About/Members | `{ status, members: WorkingGroupCoLead[] }` |
| `GET` | `/api/members/directory?workingGroupSlug=:slug&query=&limit=500` | Group detail Members tab | `{ status, members: DirectoryMember[] }` |
| `GET` | `/api/members/working-groups/:slug/feed` | Group detail infinite feed | `WorkingGroupFeedResponse` |
| `GET` | `/api/members/working-groups/:slug/feed/items/:itemType/:itemId` | Prepared route | `{ status, item: WorkingGroupFeedItem }` |
| `GET` | `/api/members/working-groups/:slug/tag-usage` | Create post tag suggestions | `WorkingGroupTagUsageResponse` |
| `GET` | `/api/members/working-groups/:slug/resource-submissions` | Group detail Resources tab | `{ status: "success", resources: ResourceItem[], newsRadar: [] }` |
| `POST`/`DELETE` | `/api/members/working-groups/:slug/subscription` | Group header + About tab | ignored |
| `POST` | `/api/members/working-groups/:slug/resource-submissions/uploads/prepare` | Resource submission attachment prepare | `WorkingGroupResourceUploadPrepareResponse` |
| `PUT` | signed storage URL from prepare | Resource submission attachment upload | non-error status |
| `POST` | `/api/members/working-groups/:slug/resource-submissions/uploads/finalize` | Resource submission attachment finalize | `WorkingGroupResourceUploadFinalizeResponse` |
| `POST` | `/api/members/working-groups/:slug/resource-submissions` | Resource submission metadata | `WorkingGroupResourceSubmissionResponse` |
| `POST` | `/api/members/working-groups/events/rsvp` | Event detail RSVP | `{ status, message }` |
| `POST` | `/api/members/forum/threads` | Create post sheet | `multipart/form-data` → `{ status, redirectTo }` |
| `PATCH`/`DELETE` | `/api/members/forum/threads/:threadId` | Post detail edit/delete controls | `{ status }` |
| `PATCH` | `/api/members/forum/threads/:threadId/status` | Post detail status controls | `{ status, threadStatus }` |
| `POST` | `/api/members/forum/replies` | Post detail reply composer | `{ status, message }` |
| `DELETE` | `/api/members/forum/replies/:replyId` | Prepared route | `{ status }` |
| `POST` | `/api/members/forum/uploads/prepare` | Thread/reply attachment prepare | `ForumUploadPrepareResponse` |
| `PUT` | signed storage URL from forum prepare | Thread/reply attachment upload | non-error status |
| `POST` | `/api/members/forum/uploads/finalize` | Thread/reply attachment finalize | `ForumUploadFinalizeResponse` |
| `GET` | `/api/content-assets/:assetId` | Open thread/reply attachment | file response; bearer required for member assets |
| `POST` | `/api/members/forum/summarize` | Post detail summarize action | `ForumSummarizeResponse` |
| `GET`/`POST` | `/api/members/polls` | Poll detail/create poll | `MemberPollsResponse` / `{ status, pollId }` |
| `GET`/`PUT`/`DELETE` | `/api/members/polls/:id` | Prepared route | `MemberPollResponse` / `{ status }` |
| `POST` | `/api/members/polls/vote` | Poll detail vote action | `{ status, message }` |
| `GET`/`POST`/`DELETE` | `/api/members/upvotes` | Feed/detail upvote actions | member content list / mutation response |
| `GET`/`POST`/`DELETE` | `/api/members/saved-content` | Feed/detail save actions | member content list / mutation response |
| `GET` | `/me` | Greeting, avatars, authorship | `Member` |
| `GET` | `/me/saved` | Member profile → Saved | `LibraryResource[]`, newest first |
| `GET` | `/groups` | Home, Groups drawer | legacy `Group[]` shape, not used while `/api/members/working-groups` is configured |
| `GET` | `/events/next` | Home calendar card | `CalendarEvent \| null` |
| `GET` | `/posts` | Groups feed | `FeedEntry[]` |
| `GET` | `/api/members/news` | News screen + Home digest | `{ status: "success", items, relatedThreads }`, mapped to `NewsStory[]`, newest first |
| `GET` | `/api/members/resources` | Resources → Library + News Radar | `{ status: "success", resources: ResourceItem[], newsRadar: RadarFeedItem[] }`, mapped to `ResourceHubData`. Called whenever `EXPO_PUBLIC_API_URL` is set, even if `EXPO_PUBLIC_FIXTURE_PORTAL_DATA=true`. |
| `GET` | `/podcasts` | Resources → Podcasts | `PodcastEpisode[]`, newest first |
| `GET` | `/podcasts/:slug/transcript` | Episode sheet | `text/plain` transcript |
| `GET` | `/jobs` | Resources → Job board | `JobListing[]` |
| `GET` | `/directory/orgs` | Directory index + profile | `MemberOrg[]`, A–Z by `name` |
| `GET` | `/directory/people` | Directory search + profile | `DirectoryPerson[]` |
| local only | Ask suggestions | Ask GPFA empty state | `string[]` from fixtures/static prompts |
| `POST` | `/api/members/knowledge/messages/stream` | Ask GPFA | SSE stream mapped to `AskAnswer` |
| `POST` | `/posts` | Composer | `Thread` |
| `POST` | `/posts/:id/replies` | Post detail | `Reply` |
| `POST`/`DELETE` | `/posts/:id/upvote` | Feed + detail | ignored |
| `POST`/`DELETE` | `/posts/:id/save` | Feed + detail bookmark | ignored |
| `POST`/`DELETE` | `/posts/:id/replies/:replyId/upvote` | Post detail | ignored |
| `POST`/`DELETE` | `/groups/:id/subscribe` | Legacy group subscription route | ignored |
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
{
  "id": "rg",
  "name": "Robert Goobie",
  "firstName": "Robert",
  "initials": "RG",
  "org": "HOOPP",
  "role": "Assistant VP, Treasury & Liquidity",
  "orgId": "hoopp"
}
```

`initials` is optional — derived from `name` when absent. `role` and `orgId`
are read by the member profile: without `role` the title line is omitted, and
without `orgId` the profile falls back to matching `org` against every
`MemberOrg`'s `name`, `short` and `fullName` — send `orgId` and the join is
exact.

**`GET /me/saved` → `LibraryResource[]`**

What the signed-in member has bookmarked from the library, in the order the
profile should list them (newest first) — the screen does not re-sort. Same
shape as `/library`; return the same records, so a saved row and its library
entry can't disagree. An empty array renders the profile's empty state.

There is no mutation for this yet: `POST`/`DELETE /posts/:id/save` bookmarks a
**post**, and nothing in the app writes to `/me/saved`. See §8.

**`GET /api/members/notifications` → `MemberNotification[]`**

Notifications for the signed-in member, newest first. The request includes the
stored token:

```http
Authorization: Bearer <accessToken>
```

The API currently returns `{ "status": "success", "memberCreatedAt": "...",
"notifications": [...] }`. The app reads the `notifications` array and
normalizes each row. It also tolerates common aliases such as `_id`, `uuid`,
`subject`, `message`, `text`, `createdAt`, `date`, `isRead`, and `readAt`, but
this is the target shape:

```json
[
  {
    "id": "notif-cl1",
    "kind": "reply",
    "title": "New reply in Collateral & Liquidity",
    "body": "Priya Nair commented on the indemnification comparison matrix thread.",
    "created_at": "2026-08-20T12:34:56.000Z",
    "read": false,
    "navigation_href": "/members/...",
    "target_type": "member",
    "target_id": "...",
    "content_type": "post",
    "content_id": "...",
    "content_deleted_at": null,
    "readAt": null
  }
]
```

`read: false` or a missing `read` value counts toward the bell badge. `href` is
stored from `navigation_href` for a later open action; the current sheet only
displays the list.

**`POST /api/members/notifications/read` → `{ status, readAt }`**

Marks one or more notifications as read. The app sends the stored bearer token
and this JSON body:

```json
{ "notificationIds": ["notif-cl1"] }
```

The app optimistically sets matching notifications to `read: true`, which also
updates the header badge. If the request fails, it restores the previous list.

**`POST /api/members/notifications/dismiss` → `{ status, dismissedAt }`**

Dismisses one or more notifications for the signed-in member. The app sends the
same body shape as mark-read:

```json
{ "notificationIds": ["notif-cl1"] }
```

The app optimistically removes matching notifications from the sheet. If the
request fails, it restores the previous list. Dismissing the last notification
renders the sheet's empty state.

**`GET /api/members/working-groups` → `WorkingGroupsResponse`**

Member-scoped working group summary. The request includes the stored token:

```http
Authorization: Bearer <accessToken>
```

The app calls this route after sign-in whenever `EXPO_PUBLIC_API_URL` is set,
even if `EXPO_PUBLIC_FIXTURE_PORTAL_DATA=true`. That lets the ready working
group route power Home and the Groups directory while the rest of the portal can
remain on fixtures.

```ts
type WorkingGroupsResponse = {
  status: 'success';
  groups: Array<{
    slug: string;
    name: string;
    description: string;
    leadLabel: string;
    color: string;
    cardImageUrl?: string;
    unread?: number;
    topic?: string;
    members?: number;
    memberRole?: 'member' | 'co_lead';
  }>;
  threads: Array<{
    groupSlug: string;
    updatedAt: string;
    replies?: number;
    upvoteCount?: number;
  }>;
  joinedSlugs: string[];
  home: {
    groups: Array<{ slug: string; href: string; name: string; unread: number | null }>;
    threads: Array<{
      id: string;
      href: string;
      title: string;
      groupName: string;
      authorName: string;
      replies: number;
      age: string;
      unread: boolean;
      participants: Array<{ id: string; name: string; initials: string }>;
    }>;
  };
};
```

`src/api/portal.ts` maps this summary into the app's existing `Group[]` shape.
Fields not returned by this endpoint, such as detailed member rosters and full
post bodies, fall back to local fixtures for now.

**`GET /api/members/working-groups/:slug/membership` → `WorkingGroupMembershipResponse`**

Member-scoped membership state for one working group. The app calls this when a
member opens a working group and uses `subscriptionStatus` to refresh the group
header's Subscribe/Subscribed state.

```http
Authorization: Bearer <accessToken>
```

```ts
type WorkingGroupMembershipResponse = {
  status: 'success';
  membership: {
    id: number;
    memberId: string;
    workingGroupSlug: string;
    role: 'member' | 'co_lead';
    subscriptionStatus: 'subscribed' | 'unsubscribed';
    updatedAt: string;
  } | null;
};
```

`membership: null` is treated as not subscribed.

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

**`POST /api/members/knowledge/messages/stream` → Server-sent events → `AskAnswer`**

```http
POST /api/members/knowledge/messages/stream
Accept: text/event-stream
Authorization: Bearer <accessToken>

{ "conversationId": "optional-existing-conversation", "message": "How do peers structure indemnification?" }
```

The app understands `ready`, `text_delta`, `done`, `persisted`, and `error`
events. It stores the returned `conversationId` in `AskScreen` state and sends
it with the next question in the same screen session. Ask suggestions are local
until a real member suggestions endpoint exists.

Failures are caught and rendered as a chat message: *"Ask GPFA is unavailable
right now."* — the screen does not throw. Development builds log the underlying
error so auth, network, timeout, parser, and backend failures can be separated.

**`POST /posts` → `Thread`**

Body is `NewPostInput`. Return the created post; the app swaps its optimistic
placeholder for your record so the real `id` and timestamps take effect.

**`POST /api/members/forum/threads` → `{ status, redirectTo }`**

The mobile app sends this as `multipart/form-data` with the bearer token. Do not
require a client-supplied `Content-Type`; React Native/fetch adds the boundary.

Fields:

```ts
groupSlug: string;
postType: 'discussion' | 'announcement' | 'event';
title: string;
body: string;
tags: string;
startsAt?: string;          // ISO string for event posts
endsAt?: string;            // ISO string or empty string for event posts
timezone?: string;
location?: string;
registrationUrl?: string;
isVirtual?: 'true' | 'false';
attachmentIds?: string[];   // repeated multipart field
```

The composer accepts actual device files, not asset IDs. For each file, mobile
calls forum upload prepare, `PUT`s the raw file to the returned signed URL,
calls finalize, and includes the finalized `assetId` in `attachmentIds`.

**Thread and reply attachment reads** use `GET /api/content-assets/:assetId`
with the member bearer token. Mobile downloads the file into its cache and opens
the native document/share sheet, which handles Office files that cannot render
inline in a WebView.

**`POST /posts/:id/replies` → `Reply`**

Body is `{ "text": "…" }`. The author is the authenticated member — do not trust
a client-supplied author.

**`GET /directory/orgs` → `MemberOrg[]`**

**Send them sorted A–Z by `name`.** The index groups *consecutive* entries under
their initial letter and never re-sorts, so an unsorted response produces
repeated letter headings rather than an error.

```json
{
  "id": "hoopp",
  "name": "HOOPP",
  "fullName": "Healthcare of Ontario Pension Plan",
  "short": "HOOPP",
  "sector": "Pension Fund",
  "country": "Canada",
  "countryCode": "CAN",
  "city": "Toronto",
  "members": 7,
  "workingGroups": 4,
  "blurb": "Ontario healthcare sector pension plan, and a founding participant…"
}
```

**`GET /directory/people` → `DirectoryPerson[]`**

Flat, not nested under the organization. `orgId` is a `MemberOrg.id`; a person
whose `orgId` matches nothing is simply never shown.

```json
[{ "id": "p-rob-goobie", "orgId": "hoopp", "name": "Robert Goobie", "role": "Assistant VP, Treasury & Liquidity" }]
```

Order matters: a profile lists its people **in the order you send them**, so put
the ones that should lead first. The index's people search sorts by name
instead, and only runs once the member types something.

**Upvote / vote / RSVP** — return anything; the app ignores the body and only
checks for a non-error status.

- Upvote / save / subscribe: `POST` to set, `DELETE` to unset.
- Reply upvote: `:replyId` is `Reply.id`. **A reply without an `id` is never
  sent** — the member can still tap it, but the state stays on the device and is
  lost on reload. Give every reply an id if you want them to persist.
- Vote: `{ "option": 0 }` — zero-based index into `poll.options`. One vote per
  organization; the app blocks a second vote client-side, but **enforce it
  server-side**.
- RSVP: `{ "choice": "yes" | "no" }`.

---

### 4.2 GPFA web API workflow contracts (2026-08-21)

This section inventories the GPFA web app routes that matter to the first mobile
pass. The source API lives in `../gpfa-modern/app/api`; the mobile route map
lives in `src/api/config.ts`; the mapping layer is `src/api/portal.ts`.

Status legend:

| Status | Meaning |
| --- | --- |
| Current | `src/api/config.ts` points at the GPFA web API path and `src/api/portal.ts` has a repository function for it. |
| Prepared | Route constants and types exist, but no required screen calls it yet. Keep the contract accurate before turning it on. |
| Deferred | A GPFA web route exists, but the mobile app still points at a legacy placeholder or the route still needs a mobile auth/mapping pass. |
| Excluded | Do not include in the first mobile pass unless a real mobile screen or workflow is added. |

Auth legend:

| Auth | Contract |
| --- | --- |
| Public | No bearer token. Still validate and rate-limit attacker-controlled input. |
| Member bearer-ready | `Authorization: Bearer <accessToken>` is supported by the route through `getApiMemberAuth(request)`. Invalid bearer headers fail closed and do not fall back to cookies. |
| Active member, migration needed | The web route requires an active member session through the browser-oriented member helper. Do not treat it as mobile-ready until bearer auth is verified or migrated. |
| Organization admin | Active member plus organization-admin authorization. Excluded unless an org-admin mobile screen exists. |
| Global admin / cron / webhook | Not a mobile member API. Excluded from this pass. |

Universal response rules for GPFA web API routes:

- Successful JSON responses include `status: "success"` unless the route is a
  legacy placeholder still mapped in `portal.ts`.
- Error JSON responses include `status: "error"` and a human-readable
  `message`; validation errors may include `errors`.
- Mobile treats any `401` or `403` as session-ending and returns to sign-in.
- Required member routes must prove both Supabase identity and active GPFA
  membership. A valid Supabase account is not enough.
- Responses must not include member emails, app roles, inactive/lock reasons,
  organization domain allowlists, private metadata, extracted document text, or
  service-role-only fields.
- Member-specific reads should use `Cache-Control: private, no-store` where the
  web route returns account-scoped data.
- Empty states are honest empty payloads, not fallback data: `[]`, `null`, or an
  empty page with `nextCursor: null` as appropriate.

#### Auth and session

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `POST /api/members/sign-in` | Current / Public, rate-limited. Source: `members/sign-in/route.ts`. | JSON `{ email, password, responseMode?: "token" | "cookie", webOrigin? }`. Mobile should send `responseMode: "token"`; no `Authorization` header. | `{ status: "success", redirectTo, memberId, auth: { tokenType: "bearer", accessToken, refreshToken, expiresAt, expiresIn } }`. The app also accepts flat token aliases for adapter flexibility. | No pagination. Invalid credentials, locked, inactive, unverified, and non-member accounts fail before tokens are returned, normally `401` with `status: "error"`. |
| `POST /api/members/sign-out` | Deferred / web session route. Source: `members/sign-out/route.ts`. | No body. | Redirect or status response depending on caller. | Mobile sign-out is local-only today; do not call until a token-mode logout/session endpoint is added. |
| `POST /api/members/forgot-password` | Deferred / Public, rate-limited. Source: `members/forgot-password/route.ts`. | JSON `{ email }`. | `{ status: "success" }` or uniform recovery message. | No pagination. Keep account discovery narrow; the current mobile app has no forgot-password UI. |
| `POST /api/members/reset-password` | Deferred / Public token flow. Source: `members/reset-password/route.ts`. | JSON reset token plus password fields. | `{ status: "success" }`. | No pagination. Invalid or expired token returns `400`/`401`; not part of first mobile shell. |
| `POST /api/members/change-password` | Deferred / active member, migration needed. Source: `members/change-password/route.ts`. | JSON `{ currentPassword, newPassword }`. | `{ status: "success" }`. | No pagination. `401` when not active; validation errors return `400`. Requires a profile/settings mobile screen. |
| `POST /api/auth/verify-email-link` | Deferred / Public token flow. Source: `auth/verify-email-link/route.ts`. | JSON `{ token }`. | `{ status: "success" }`. | No pagination. Invalid token returns error; include only when mobile owns email verification. |

#### Member profile and onboarding

These routes are mobile workflows, but the current app does not yet have a
profile/settings tab that calls the GPFA web API. Treat them as deferred until
`ROUTES.me`, profile editing, avatar upload, and onboarding routes are remapped
from legacy placeholders to `/api/members/*` paths.

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `PATCH /api/members/profile` | Deferred / active member, migration needed. Source: `members/profile/route.ts`. | JSON `{ fullName, roleTitle, country, bio }`. | `{ status: "success" }`. | No pagination. Invalid body returns `400` with field errors; unauthenticated/inactive returns `401`; write failures return `500`. |
| `PATCH /api/members/email-preferences` | Deferred / active member, migration needed. Source: `members/email-preferences/route.ts`. | JSON preference booleans keyed by email category. | `{ status: "success" }`. | No pagination. Add only with a notifications/settings screen. |
| `GET /api/members/onboarding/state` | Deferred / active member, migration needed. Source: `members/onboarding/state/route.ts`. | No body. | Current onboarding step/state payload. | No pagination. Empty state is the server-defined incomplete/completed state, not a guessed client fallback. |
| `POST /api/members/onboarding/profile` | Deferred / active member, migration needed. Source: `members/onboarding/profile/route.ts`. | JSON profile details matching `MemberProfileDetailsSchema`. | `{ status: "success" }`. | No pagination. Validation `400`; inactive/unauthenticated `401`. |
| `POST /api/members/onboarding/password` | Deferred / active member, migration needed. Source: `members/onboarding/password/route.ts`. | JSON password payload. | `{ status: "success" }`. | No pagination. Validation `400`; auth errors `401`. |
| `POST /api/members/onboarding/complete` | Deferred / active member, migration needed. Source: `members/onboarding/complete/route.ts`. | No body. | `{ status: "success" }`. | No pagination. Missing active profile fails closed. |
| `POST /api/members/avatar/prepare` | Deferred / active member, migration needed. Source: `members/avatar/prepare/route.ts`. | JSON filename/content-type/size metadata. | Direct-upload URL and server upload identifier. | No pagination. Validation `400`; storage errors `500`. |
| `POST /api/members/avatar/finalize` | Deferred / active member, migration needed. Source: `members/avatar/finalize/route.ts`. | JSON upload identifier. | `{ status: "success" }` plus persisted avatar metadata. | No pagination. Invalid upload `400`/`404`; storage errors `500`. |
| `DELETE /api/members/avatar` | Deferred / active member, migration needed. Source: `members/avatar/route.ts`. | No body. | `{ status: "success" }`. | Empty state is no avatar; UI may fall back to initials. |
| `POST /api/members/avatar/linkedin` | Deferred / active member, migration needed. Source: `members/avatar/linkedin/route.ts`. | No body or provider payload as implemented by the route. | `{ status: "success" }` plus avatar result. | External-provider errors should surface as recoverable failures. |

#### Notifications

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/notifications` | Current / Member bearer-ready. Source: `members/notifications/route.ts`. | No query params. | `{ status: "success", memberCreatedAt, notifications: MemberNotification[] }`. `portal.ts` normalizes `notifications` into `MemberNotification[]`. | Newest first, route-limited to the latest notification window. Empty state is `notifications: []`. `401` when not active; malformed rows are logged/dropped rather than rendered. |
| `POST /api/members/notifications/read` | Current / Member bearer-ready. Source: `members/notifications/read/route.ts`. | JSON `{ notificationIds: string[] }`, 1-100 UUIDs. | `{ status: "success", readAt }`. | No pagination. Validation `400`; `401` when not active; `500` on write failure. Mobile marks all unread optimistically and rolls back on failure. |
| `POST /api/members/notifications/dismiss` | Current / Member bearer-ready. Source: `members/notifications/dismiss/route.ts`. | JSON `{ notificationIds: string[] }`, 1-100 UUIDs. | `{ status: "success", dismissedAt }`. | No pagination. Same validation/auth/write errors as mark-read. Empty state after dismissal is a shorter notifications list; mobile rolls back on failure. |

#### Working groups

These are the core current mobile integration routes. They are member-scoped,
bearer-ready unless noted, and are mapped in `src/api/config.ts`.

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/working-groups` | Current / Member bearer-ready. Source: `members/working-groups/route.ts`. | No query params. | `{ status, groups, threads, joinedSlugs, home }`; mapped to `Group[]` in `portal.ts`. | Server returns summary order for the directory/home. Empty state is `groups: []`, `threads: []`, `joinedSlugs: []`. `401` when not active; `500` on load failure. |
| `GET /api/members/working-groups/:slug/membership` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/membership/route.ts`. | Path `slug`. | `{ status: "success", membership: WorkingGroupMembership | null }`. | No pagination. `membership: null` means not subscribed. Invalid/inaccessible slug returns an error without granting mutation rights. |
| `GET /api/members/working-groups/:slug/co-leads` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/co-leads/route.ts`. | Path `slug`. | `{ status: "success", members: WorkingGroupCoLead[] }`. | Sorted by server helper; no pagination. Empty state is `members: []`. `401` when inactive; inaccessible group should fail closed. |
| `GET /api/members/working-groups/:slug/feed` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/feed/route.ts`. | Query `query?`, `type?`, `status?`, `sort?`, `limit?`, `snapshotAt?`, `cursor?`; path `slug`. When sending `cursor`, send the `snapshotAt` returned with the first page. | `WorkingGroupFeedResponse`: `{ status, items, nextCursor, snapshotAt, totalMatching }`. | Cursor pagination. Sort values are `newest`, `oldest`, `recently_active`, `most_upvoted`. Empty page is `items: []`, `nextCursor: null`, `totalMatching: 0`. Invalid filters/cursors return `400`; auth errors `401`; group visibility errors should not leak private data. |
| `GET /api/members/working-groups/:slug/feed/items/:itemType/:itemId` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/feed/items/[itemType]/[itemId]/route.ts`. | Path `slug`, `itemType`, `itemId`. | `WorkingGroupFeedItemResponse`: `{ status: "success", item, detail }`. Thread details include full thread body, attachments, replies, participants, saved/upvoted counts, and `permissions: { canReply, canEdit, canDelete, canChangeStatus }`. Poll details include full poll, results, current member answers, saved/upvoted counts, and the same permission block. | No pagination. Unknown, mismatched, or inaccessible items return `404`; invalid params return `400`; auth errors return `401`. Reply upvotes are not included yet because the web upvote target union does not support `reply`. |
| `GET /api/members/working-groups/:slug/tag-usage` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/tag-usage/route.ts`. | Query `query?`/`q?`, `limit?`; path `slug`. | `WorkingGroupTagUsageResponse`: `{ status, group, tags: [{ key, label, count }] }`. | Server-ranked tag suggestions, limited by query. Empty state is `tags: []`. Validation/auth errors as above. |
| `POST /api/members/working-groups/:slug/subscription` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/subscription/route.ts`. | Path `slug`; no body required. | Success response is ignored by the app; route records subscription. | No pagination. Idempotent subscribe semantics are preferred because mobile writes optimistically. `401` inactive; `404`/`403` for invalid group; write errors `500`. |
| `DELETE /api/members/working-groups/:slug/subscription` | Current / Member bearer-ready. Source: same route. | Path `slug`; no body required. | Success response is ignored by the app; route removes subscription. | No pagination. Empty state is unsubscribed membership. Same auth/error contract as subscribe. |
| `GET /api/members/working-groups/:slug/resource-submissions` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/resource-submissions/route.ts`. | Path `slug`; no body. | `{ status: "success", resources: ResourceItem[], newsRadar: [] }`, mapped to `LibraryResource[]`. | No pagination. Returns approved CMS resources associated with the working group. Empty state is `resources: []`; auth errors `401`; invalid slug `400`; load failure `500`. |
| `POST /api/members/working-groups/:slug/resource-submissions/uploads/prepare` | Current / Member bearer-ready. | JSON `{ fileName, contentType, byteSize }`. | `WorkingGroupResourceUploadPrepareResponse`: `{ status, signedUrl, assetId? / attachmentId? / fileId? / uploadId?, expectedContentType?, expectedByteSize? }`. | No pagination. Validate membership, media type, and size before issuing a signed URL. Validation `400`; unsupported media `415`; oversized file `413`; group/subscription auth failure `401`/`403`; prepare failure `500`. |
| `PUT signedUrl` | Current / signed storage URL. | Raw file body with `Content-Type` matching the prepared content type. No bearer header. | Any non-error storage response. | This is not sent to the member API host unless the signed URL points there. Mobile treats non-2xx as upload failure and does not finalize. |
| `POST /api/members/working-groups/:slug/resource-submissions/uploads/finalize` | Current / Member bearer-ready. | JSON `{ assetId? / attachmentId? / fileId? / uploadId?, fileName, contentType, byteSize }` using the identifier returned by prepare. | `WorkingGroupResourceUploadFinalizeResponse`: `{ status, assetId? / attachmentId? / fileId? / id? }`. | No pagination. Verifies the uploaded object and persists attachment metadata. Validation `400`; missing upload `404`; storage/metadata errors `500`. |
| `POST /api/members/working-groups/:slug/resource-submissions` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/resource-submissions/route.ts`. | `multipart/form-data`: `title`, optional `resourceType`, `sourceUrl`, `summary`, `contributorNotes`, repeated `tags`, repeated finalized attachment ids as `attachmentIds` / `assetIds` / `fileIds`. The mobile app no longer sends picked files in this request. | `WorkingGroupResourceSubmissionResponse`: `{ status, submission: { id, status, submittedAt } }`. | No pagination. Validation `400`; missing finalized attachment/source URL `409`; group/subscription auth failure `401`/`403`; write failure `500`. |
| `POST /api/members/working-groups/events/rsvp` | Current / Member bearer-ready. Source: `members/working-groups/events/rsvp/route.ts`. | JSON `{ threadId, groupSlug, status: "attending" | "not_attending" }`. | `{ status: "success", message }`. | No pagination. Empty state is no RSVP. Mobile writes optimistically; route should be idempotent per member/event. |

#### Forum and posts

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `POST /api/members/forum/threads` | Current / Member bearer-ready. Source: `members/forum/threads/route.ts`. | `multipart/form-data` built from `ForumThreadCreateInput`: `groupSlug`, `postType`, `title`, `body`, `tags`, optional event fields and repeated `attachmentIds`. | `{ status: "success", redirectTo }`. The app currently returns `null` after success and refetches later. | No pagination. Validation `400`; must verify active group contribution rights; auth `401`; permission `403`; server errors `500`. |
| `PATCH /api/members/forum/threads/:threadId` | Current / Member bearer-ready. Source: `members/forum/threads/[threadId]/route.ts`. | JSON `ForumThreadUpdateInput`: `title?`, `body?`, `tags?`, optional event fields. | `{ status: "success" }`. | No pagination. Owner/moderator checks required. Unknown/inaccessible thread should not disclose more than needed. |
| `DELETE /api/members/forum/threads/:threadId` | Current / Member bearer-ready. Source: same route. | Path `threadId`; no body. | `{ status: "success" }`. | No pagination. Mobile rolls back optimistic deletion on failure. Owner/moderator checks required. |
| `PATCH /api/members/forum/threads/:threadId/status` | Current / Member bearer-ready. Source: `members/forum/threads/[threadId]/status/route.ts`. | JSON `{ status: "open" | "answered" | "closed" }`. | `{ status: "success", threadStatus }`. | No pagination. Co-lead/moderator authorization required; invalid status `400`; auth `401`/`403`. |
| `POST /api/members/forum/replies` | Current / Member bearer-ready. Source: `members/forum/replies/route.ts`. | JSON `{ threadId, groupSlug, body, attachmentIds?, parentPostId? }`. Device files are prepared/uploaded/finalized before this request. | `{ status: "success", message }`. | No pagination. Empty reply rejected even when files are attached. Must verify active member and group contribution rights. |
| `DELETE /api/members/forum/replies/:replyId` | Prepared / Member bearer-ready. Source: `members/forum/replies/[replyId]/route.ts`. | Path `replyId`; no body. | `{ status: "success" }`. | No pagination. Owner/moderator checks required. |
| `POST /api/members/forum/uploads/prepare` | Current / Member bearer-ready. Source: `members/forum/uploads/prepare/route.ts`. | JSON `{ groupSlug, fileName, contentType, byteSize }`. | `ForumUploadPrepareResponse`: upload `assetId`, bucket, storage path, signed URL, expected content type/size. | Used by thread and reply composers. Validate type/size before issuing URL; maximum 25MB. |
| `PUT signedUrl` | Current / signed storage URL. | Raw file body with the prepared `Content-Type`; no bearer header. | Any non-error storage response. | Mobile does not finalize or create the thread/reply after a failed upload. |
| `POST /api/members/forum/uploads/finalize` | Current / Member bearer-ready. Source: `members/forum/uploads/finalize/route.ts`. | JSON `{ groupSlug, assetId, fileName, contentType, byteSize }`. | `ForumUploadFinalizeResponse`: persisted asset metadata. | Used by thread and reply composers. Reject mismatched upload metadata; storage errors `500`. |
| `GET /api/content-assets/:assetId` | Current / Public for public assets; member bearer-ready for member assets. Source: `content-assets/[id]/route.ts`. | Path `assetId`; bearer token for protected forum files. | Inline response for safe media/PDF types, attachment response for Office/other files. | Mobile downloads to cache and opens the native document/share sheet. Unauthorized and missing assets intentionally return `404`. |
| `POST /api/members/forum/summarize` | Current / Member bearer-ready. Source: `members/forum/summarize/route.ts`. | `multipart/form-data` with `threadId`, `groupSlug`. | `ForumSummarizeResponse`: `{ status, message, summary }`. | No pagination. Must verify readable group content; rate-limit/AI errors should return clear `status: "error"` messages. |

#### Polls

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/polls` | Current / Member bearer-ready. Source: `members/polls/route.ts`. | Query `groupSlug?`, `cursor?`, `limit?`. | `MemberPollsResponse`: `{ status, polls, resultsByPoll, answersByPoll, member }`. | Cursor pagination where supplied; default server order is newest/relevant poll order. Empty state is `polls: []`. Invalid query `400`; auth `401`. |
| `POST /api/members/polls` | Current / Member bearer-ready. Source: same route. | JSON `MemberPollCreateInput`: `title`, `description?`, `tags?`, `closesAt`, `groupSlug?`, `questions[]`. | `{ status: "success", pollId }`. | No pagination. Validate at least one question and options; contributor auth required for group polls. |
| `GET /api/members/polls/:id` | Prepared / Member bearer-ready. Source: `members/polls/[id]/route.ts`. | Path `id`. | `MemberPollResponse`: `{ status, poll }`. | No pagination. Unknown/inaccessible poll should return not-found/permission-safe error. |
| `PUT /api/members/polls/:id` | Prepared / Member bearer-ready. Source: same route. | JSON `MemberPollUpdateInput`. | `{ status: "success" }`. | No pagination. Owner/moderator checks required; validation `400`. |
| `DELETE /api/members/polls/:id` | Prepared / Member bearer-ready. Source: same route. | Path `id`; no body. | `{ status: "success" }`. | No pagination. Owner/moderator checks required. |
| `POST /api/members/polls/vote` | Current / Member bearer-ready. Source: `members/polls/vote/route.ts`. | JSON `{ pollId, groupSlug?, answers: [{ questionId, optionId }] }`. | `{ status: "success", message }`. | No pagination. Server must enforce one valid vote set per member/question; validation `400`; closed/inaccessible poll errors should fail closed. |

#### Saved content and upvotes

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/saved-content` | Current / Member bearer-ready. Source: `members/saved-content/route.ts`. | Query `targetType?`, `targetId?`, `groupSlug?`, `limit?`, `offset?`. | `MemberContentListResponse`: `{ status, items, meta }`. | Offset pagination. Newest saved first. Empty state is `items: []`, `meta.count: 0`. Invalid filters `400`; auth `401`. |
| `POST /api/members/saved-content` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`; first-pass target types are `thread`, `event`, `announcement`, `poll`. | `MemberContentMutationResponse`: `{ status, message, targetType, targetId }`. | No pagination. Prefer idempotent save semantics. Must verify visibility/subscription for group content. |
| `DELETE /api/members/saved-content` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`. | `MemberContentMutationResponse`. | No pagination. Empty state is target not saved. Mobile rolls back optimistic state on failure. |
| `GET /api/members/upvotes` | Current / Member bearer-ready. Source: `members/upvotes/route.ts`. | Query `targetType?`, `targetId?`, `groupSlug?`, `limit?`, `offset?`. | `MemberContentListResponse`. | Offset pagination. Newest upvote first. Empty state is `items: []`. |
| `POST /api/members/upvotes` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`; first-pass targets are `thread`, `event`, `announcement`, `poll`. Reply upvotes are a mobile route dependency to verify before relying on persistence. | `MemberContentMutationResponse`. | No pagination. Idempotent upvote preferred; must verify visibility. |
| `DELETE /api/members/upvotes` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`. | `MemberContentMutationResponse`. | No pagination. Empty state is target not upvoted. |

#### Resources, library, podcasts, jobs, directory, news, and events

The GPFA web routes below exist, but some mobile surfaces still point at legacy
placeholder paths. Remap `ROUTES` and adapt the response in `portal.ts` before
treating the remaining deferred routes as remote-ready.

| Workflow | Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- | --- |
| Resources/library | `GET /api/members/resources` | Current / Member bearer-ready. Source: `members/resources/route.ts`. | No query params. | `{ status: "success", resources: ResourceItem[], newsRadar: RadarFeedItem[] }`. Map to `ResourceHubData`. | Server-defined resource and radar order; no pagination. Empty state `resources: []`, `newsRadar: []`. `401` inactive; `500` load failure. |
| Podcasts | `GET /api/members/podcasts` | Deferred / active member, migration needed. Source: `members/podcasts/route.ts`. | No query params. | `{ status: "success", episodes: PodcastEpisode[] }`. | Newest/catalog order from server. No pagination. Empty state `episodes: []`. |
| Jobs | `GET /api/members/job-postings` | Current / Member bearer-ready. Source: `members/job-postings/route.ts`. | Query `page?` default `1`, `pageSize?` default `20`, max `100`. Mobile requests `pageSize=100`. | Active job-posting page from `getCachedActiveJobPostings`. Maps `jobPostings` to `JobListing[]`. | Page-based pagination from the API; mobile loads the first page for the Resources hub and Job board card count. Empty page is an empty jobs array with total metadata. Invalid pagination `400`; auth `401`; load failure `500`. |
| Jobs write | `POST /api/members/job-postings`, `PATCH/DELETE /api/members/job-postings/:jobId` | Excluded first pass / Organization admin. Sources: job posting routes. | JSON job posting payload for create/update; path `jobId` for update/delete. | `{ status: "success", jobPosting }` or `{ status: "success" }`. | Org-admin mobile workflow does not exist; exclude until it does. |
| Directory people | `GET /api/members/directory` | Deferred / active member, migration needed. Source: `members/directory/route.ts`. | Query `query?`, `workingGroupSlug?`, `region?`, `limit?` clamped by server. | `{ status: "success", members: DirectoryMember[] }`. Map to `DirectoryPerson[]`. | Sorted by `full_name` ascending before optional region filter. Empty state `members: []`. Invalid/internal query failures return `500`; auth `401`. |
| Directory detail | `GET /api/members/directory/:memberId` | Deferred / active member, migration needed. Source: `members/directory/[memberId]/route.ts`. | Path `memberId`. | Member profile/detail DTO and organization fields. | No pagination. Unknown/inaccessible profile should return safe not-found. |
| Directory organizations | `GET /api/members/directory/organizations` | Deferred / active member, migration needed. Source: `members/directory/organizations/route.ts`. | No query params. | `{ status: "success", organizations: MemberOrg[] }`. | Server order should be A-Z for mobile grouping. Empty state `organizations: []`. Auth `401`; load failure `500`. |
| News feed | `GET /api/members/news` | Current / Member bearer-ready. Source: `members/news/route.ts`. | Query `topic?`, `source?`, `limit?`, `cursor?`, `snapshotAt?`, `story?`. | `{ status: "success", items, relatedThreads }`. Map to `NewsStory[]`. | Server feed order and cursor metadata. Empty state `items: []`. Invalid filters `400`; auth `401`; load failure `500`. |
| News Radar | `GET /api/members/news-radar` | Current / Member bearer-ready. Source: `members/news-radar/route.ts`. | Query `limit?`, 1-20. | `{ status: "success", articles }`. | Server/news-radar order; bounded by limit. Invalid limit `400`; auth `401`; load failure `500`. |
| Events | `GET /api/members/events` | Deferred / active member, migration needed. Source: `members/events/route.ts`. | No query params. | `{ status: "success", events }`. | Server event order, includes past per route implementation. Empty state `events: []`. |
| Event RSVP | `POST /api/members/events/rsvp` | Deferred / active member, migration needed. Source: `members/events/rsvp/route.ts`. | JSON event ID plus RSVP state as defined by the web route. | `{ status: "success", message }`. | Prefer idempotent writes. The current mobile app uses the working-group event RSVP route for feed event posts. |

#### Ask GPFA

The current mobile Ask GPFA screen uses the conversation-based member stream
route. Suggestions remain local/static because there is no real web member
suggestions API yet.

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/knowledge/conversations` | Deferred / active member, migration needed. Source: `members/knowledge/conversations/route.ts`. | No query params. | `{ status: "success", conversations }`. | Sorted by `updated_at` descending, limited to 20. Empty state `conversations: []`. Auth `401`; load failure `500`. |
| `POST /api/members/knowledge/conversations` | Deferred / active member, migration needed. Source: same route. | JSON `{ title?: string }`, max 120 chars. | `{ status: "success", conversation }`. | No pagination. Validation `400`; auth `401`; create failure `500`. |
| `GET /api/members/knowledge/conversations/:id` | Deferred / active member, migration needed. Source: `members/knowledge/conversations/[id]/route.ts`. | Path `id`; query `before?` cursor for earlier messages. | `{ status, conversation, messages, hasEarlier, earlierCursor }`. | Cursor pagination backward through messages. Empty state `messages: []`. Invalid cursor `400`; unknown/not-owned conversation `404`. |
| `POST /api/members/knowledge/messages/stream` | Current / Member bearer-ready. Source: `members/knowledge/messages/stream/route.ts`. | JSON `{ conversationId?: uuid, message }`, message 1-5000 chars. | Server-sent event stream with ready/persisted answer events, plus persisted conversation/message records. Mobile maps the final answer to `{ text, sources }`. | No page pagination in stream. Rate limit: 20 member requests/hour. Validation `400`; auth `401`; missing conversation `404`; rate limit `429`; model/persistence failures return error events or error JSON as implemented. |

#### Public membership

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `POST /api/membership/applications` | Deferred / Public, rate-limited. Source: `membership/applications/route.ts`. | JSON membership application payload for applicant and organization details. | `{ status: "success" }` plus application result fields from the route. | No pagination. Validation `400`; rate limit `429`; server errors `500`. Include only if the mobile app owns public signup. |

#### First-pass exclusions

The following route groups were inventoried and deliberately excluded from the
first mobile pass. Add them only with a corresponding mobile screen/workflow and
a fresh auth/privacy review.

| Route group | Examples | Reason for exclusion |
| --- | --- | --- |
| Global admin console | `/api/admin/members/*`, `/api/admin/organizations/*`, `/api/admin/content/*`, `/api/admin/knowledge/*`, `/api/admin/surveys/*`, `/api/admin/working-groups/*`, `/api/admin/marketing-campaigns/*`, `/api/admin/search` | Global-admin dashboard workflows. They require `requireAdminMember` and expose privileged state. |
| Admin annual meeting tooling | `/api/admin/annual-meeting/*` | Complex web dashboard workflow for drafts, assets, registrations, exports, and activation. No mobile admin screen. |
| Organization member management | `/api/members/organization/members/:id`, `/status`, `/role` | Organization-admin management, not member self-service. Exclude until an org-admin mobile flow exists. |
| Organization profile mutation | `PATCH /api/members/organization` | Organization-admin self-service. Defer unless the mobile app adds organization settings. |
| Member setup/email-access | `/api/members/setup-link`, `/api/members/email-access` | Web staged sign-in/setup flows with account-state disclosure rules. Not part of current native session flow. |
| Annual meeting member registration/assets | `/api/members/annual-meeting/registration`, `/api/members/annual-meeting/assets/:assetId` | Web-specific registration and asset workflows. Add only if a mobile annual meeting screen exists. |
| Cron and webhooks | `/api/cron/member-search-reconcile`, `/api/cron/news-radar`, `/api/cron/resend-contacts`, `/api/webhooks/resend` | Server automation or third-party callbacks; never called by mobile clients. |
| Tooling | `/api/openapi` | Tooling surface rather than a member workflow endpoint. |
| Admin resource submissions | `/api/admin/resource-submissions/*` | Moderation/approval workflow, global-admin only even though submissions themselves are member-facing. |

Implementation rule for future routes: if a screen starts calling a new remote
endpoint, update this contract in the same change and mark whether the route is
member bearer-ready, migration-needed, or intentionally excluded.

---

## 5. Types

From `src/api/types.ts`. Field names are terse because they were transcribed
from the design documents — if your API differs, map it (§7) rather than
renaming across the UI.

### `Group`

```ts
{
  id: string;          // "cl" — stable key, used throughout the Groups tab
  n: string;           // "Collateral & Liquidity" — display name
  short: string;       // "Collateral & Liq" — chips and composer
  cls: WgRuleClass;    // colour key, see below
  cardImageUrl?: string; // raster directory card image; hatch fallback when absent
  unread: number;      // Home badge and the About tab's Unread stat; 0 hides the badge
  meta: string;        // "12 new posts this week"
  members: GroupMember[];  // the Members tab; its length is the members count
  joined: boolean;     // subscribed → lands under "Your groups" in the directory
  trending?: boolean;  // adds the Trending chip to the directory card
  threads: Thread[];   // see GET /groups above
}

GroupMember {
  name: string;        // "Elena Rossi"
  role: string;        // "Portfolio Manager, Securities Lending"
  org: string;         // "APG"
  initials?: string;   // derived from name if omitted
  isLead?: boolean;    // co-lead: gets the badge and fills the About tab's list
}
```

`joined` is the **starting** state. Toggling it calls
`/groups/:id/subscribe`; until the app is reloaded the member's choice takes
precedence over whatever you send. Co-leads are not a separate list — mark them
with `isLead` inside `members`, and the About tab derives the roster from that.

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
  tags?: string[];      // "Indemnification" — #chips, and the About tab's topics
  replies: Reply[];     // required; [] is fine
}
```

`tags` are display strings shown as `#chips` on a card and in the post detail.
A group's **Topics** list on its About tab is the de-duplicated union of the
tags on its posts, in first-seen order — there is no separate topics endpoint.

Two fields deserve attention:

- **`time` is a pre-formatted string**, not ISO 8601. The app never parses it.
  If you send timestamps, format them in `portal.ts`.
- **`mins` is what actually sorts.** Without it a post sorts as age 0 and floats
  to the top of "Newest". Send `mins` **and** `time`, or compute `mins` from
  your timestamp in the mapping layer.

### `Reply`

```ts
{
  id?: string;        // needed to persist a reply upvote — see §4.1
  a: string;          // author name  ← note the terse key
  org: string;
  time: string;       // display string
  initials?: string;
  mention?: string;   // "@Marcus Chen" — rendered highlighted before text
  text: string;
  up?: number;
}
```

**`mention` also decides nesting.** Replies come back flat, and the detail
screen nests them one level: a reply whose `mention` names an earlier
*top-level* replier is drawn underneath that reply. Anything else — including a
mention of someone who is already nested, or of the post's author — stays at the
top level. Send replies in chronological order or the nesting will not resolve.

### `Poll`, `PollOption`, `EventRow`

```ts
Poll        { q: string; closes: string; options: PollOption[] }
PollOption  { label: string; votes: number }   // votes = current tally
EventRow    { icon: 'calendar' | 'pin' | 'people'; text: string }
```

Poll percentages are computed client-side from `options[].votes` plus the
member's own vote. Send current tallies; the app does the arithmetic.

### `NewsStory`

One list serves two surfaces. The News screen renders all of it; the Home
digest renders the `radar` entries and reads `rel` and `tag` off them.

```ts
{
  id: string;
  kind: 'radar' | 'gpfa';   // industry coverage, or GPFA's own material
  topic: string;            // "Regulation & Policy" — drives the topic filter + its counts
  title: string;
  meta: string;             // "RISK.NET · 5H" / "COLLATERAL & LIQUIDITY WG · AUG 12"
  body: string;             // standfirst; clamped to 3–4 lines on the card
  rel?: 'high' | 'medium' | 'low';   // Home digest dot; absent reads as 'low'
  tag?: string;             // Home digest chip, "Sec Finance"; falls back to `topic`
  imageUrl?: string;        // raster hero; absent falls back to the soft fill
  url?: string;             // where Open / Read goes; absent makes the action inert

  // kind: 'radar'
  ticker?: string;          // "CDCC" — shorthand above the headline
  threads?: number;         // member discussions citing it; absent reads as 0

  // kind: 'gpfa'
  chip?: string;            // "Working Paper" — a radar story shows its `topic` there
  topics?: string[];        // tags listed under the body
  memberOnly?: boolean;     // shows a lock and offers no action
}
```

Send the list in the order it should read — neither surface re-sorts it. Topic
filter chips are derived from the distinct `topic` values, sorted A–Z, and their
counts are over the whole list rather than the current source filter.

`imageUrl` must be a raster URL. RN's `Image` can't decode SVG, so an `.svg`
renders nothing. The fixtures omit it, which is why the cards run on the
soft-fill fallback until a backend supplies images.

### `Member`

```ts
{
  id: string;
  name: string;        // "Robert Goobie" — authorship, avatars
  firstName: string;   // "Robert" — Home greeting
  initials?: string;   // "RG" — derived from name if omitted
  org: string;         // "HOOPP"
  role?: string;       // "Assistant VP, Treasury & Liquidity" — profile only
  orgId?: string;      // MemberOrg.id — joins the profile to the directory
}
```

### `CalendarEvent`, `EventTag`

```ts
CalendarEvent { id, month, day, title, meta, tags: EventTag[] }
EventTag      { label: string; tone: 'green' | 'default' }
```

`month` ("Sep") and `day` ("17") are display strings, not a parsed date.

### `ResourceType`, `LibraryResource`

```ts
ResourceType    'Working Paper' | 'Podcast' | 'Briefing' | 'Template'
              | 'External Link' | 'Explainer' | 'Event Notes'
LibraryResource { id, title, type: ResourceType, summary, authors,
                  updatedAt, mins?, pages?, tags: string[], href? }
```

`updatedAt` ("Aug 12") is a display string. `mins` is the age in minutes and is
the **only** sort key the Newest/Oldest toggle uses — omit it and ordering is
undefined. `type` drives the chip colour and the corner glyph, so send one of
the seven values above. `href` is where the sheet's Open button goes; without
it the button does nothing.

### `PodcastPerson`, `PodcastEpisode`

```ts
PodcastPerson  { name: string; role: string; initials? }
PodcastEpisode { slug, title, date, mins?, duration, durationSeconds,
                 summary, hasTranscript, transcriptUrl?, audioUrl?,
                 peaks?: number[], people: PodcastPerson[] }
```

Return `/podcasts` **newest first** — the screen features `[0]` as the New
episode and never re-sorts it. `duration` is display ("38 min");
`durationSeconds` is what the transport, the resume label and the waveform fill
read, so both are required. `peaks` are 24–32 amplitudes in 0–1; when absent the
app draws a stable set seeded from `slug`. `initials` is derived from `name`
when omitted.

### `JobSource`, `JobStat`, `JobListing`

```ts
JobSource   'member' | 'curated'
JobStat     { label: string; value: string }
JobListing  { id, title, org, initials?, orgMeta, source: JobSource,
              fn, fnKey, loc, comp, posted, closes, mins?, blurb,
              bullets: string[], about, stats: JobStat[], applyUrl? }
```

Everything the card shows is a display string the app never parses: `orgMeta`
("MEMBER ORG · TORONTO"), `posted` ("12 Aug"), `closes` — **include the verb**,
as in "Closes 30 Sep" — and `comp` ("CAD 280–340k + bonus"). `mins` is the age
in minutes and is the only ordering key the board has; omit it and the listing
sorts as if posted today.

`fn` is the display label ("Collateral & liquidity"); `fnKey` is the semantic
one and must be `'collateral' | 'risk' | 'legal' | 'tech' | 'ops'` — it drives
both the function filter and the listing's left rule colour, and an unknown
value renders no rule. `source` picks the provenance chip: member-org listings
plum, secretariat-curated ones blue. `initials` is derived from `org` when
omitted. `stats` renders as a strip of up to three facts; more will fit but get
cramped. `applyUrl` is where Apply goes — without it the button does nothing.

Search and the function filter are client-side over the full list (§6), so
return every listing the member may see.

### `OrgSector`, `MemberOrg`, `DirectoryPerson`

```ts
OrgSector        'Pension Fund' | 'Sovereign Wealth Fund'
               | 'Insurance Asset Manager' | 'Asset Manager'
MemberOrg        { id, name, fullName?, short, sector: OrgSector, country,
                   countryCode, city, members, workingGroups, blurb, logoUrl? }
DirectoryPerson  { id, orgId, name, role, initials?, photoUrl? }
```

An organization carries three names, each with its own job: `name` is what the
index lists and sorts by (however the membership writes it — "HOOPP", but "Abu
Dhabi Investment Authority"); `fullName` is the formal one on the profile
masthead and defaults to `name`; `short` is the acronym in the profile's meta
line, `"HOOPP · TORONTO, CANADA"`. `countryCode` is ISO 3166-1 alpha-3 and is
shown verbatim. `sector` must be one of the four literals — it picks the row's
left rule colour, and an unknown value renders no rule.

`members` is the headcount shown in the index row and the profile stat. It is
**authoritative and independent of `/directory/people`** — send 7 while
publishing 5 profiles and the screen shows both without contradicting itself.
`workingGroups` is a stat only; nothing joins it to `/groups`.

The profile's **Open roles** stat and its Jobs tab both come from `/jobs`,
matched client-side: a listing belongs to an organization when its `org` equals
that org's `name`, `short`, or `fullName`, case-insensitively. Keep those
strings identical across the two endpoints or the roles will not appear.

`logoUrl` and `photoUrl` must be **raster** (PNG/JPG) — React Native's `Image`
cannot decode SVG, so an `.svg` URL renders as an empty box. Both are optional
and fall back to initials.

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
| Working group search (name) | `GroupsScreen.tsx` |
| Splitting the directory into subscribed / not | `GroupsScreen.tsx` |
| Working group directory sort: recommended, active, members, A-Z | `GroupsScreen.tsx` |
| Per-group post-type filter, newest-first (`mins`) order | `groups/GroupView.tsx` |
| A group's stats grid and topics list | `groups/GroupView.tsx` |
| One-level reply nesting, from `mention` | `groups/PostDetail.tsx` |
| Poll percentages | computed from `options[].votes` |
| Reply counts | derived from `replies[]` |
| Job search (title, org, location, function, blurb) | `jobs/JobBoard.tsx` |
| Job function filter, member-orgs filter, newest-first order | `jobs/JobBoard.tsx` |
| Directory search (org name, country; person name and org) | `DirectoryScreen.tsx` |
| A–Z letter grouping, per-letter counts | `DirectoryScreen.tsx` |
| An org's open roles, matched from `/jobs` by name | `DirectoryScreen.tsx` |

Consequence: **`GET /posts`, `GET /jobs` and both `/directory` endpoints must
return the full corpus.** This is fine for hundreds of rows and wrong for
thousands — see §8.

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
6. **Not wired to anything:** the per-card `⋯` menu, "Forgot password?", and
  Share / send on feed cards.
7. **Composer captures only** group, type, title, body. A poll created in-app
   has no options; an event has no date rows.
8. **Saved is read-only.** The member profile lists `GET /me/saved`, but nothing
   adds to or removes from it — the library has no bookmark control, and the
   post bookmark writes to `/posts/:id/save`, a different list. Wiring it means
   a `POST`/`DELETE /me/saved/:id` pair and a toggle on the profile row.
9. **Session data is memory-only.** Optimistic state (`votes`, `upvoted`,
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
- Requests time out after **15s** (`REQUEST_TIMEOUT_MS`). Ask GPFA stream
  requests use **60s** (`AI_REQUEST_TIMEOUT_MS`) because retrieval and model
  generation can take longer than ordinary JSON endpoints.
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
| Reply upvote | Count ±1 | Reverted (no request when the reply has no `id`) |
| Save | Bookmark fills, label becomes "Saved" | Reverted |
| Subscribe | Group moves between directory sections | Reverted |
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

1. Copy `.env.example` to `.env`, set `EXPO_PUBLIC_API_URL` and (if your auth backend requires it) `EXPO_PUBLIC_GPFA_WEB_ORIGIN`.
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
