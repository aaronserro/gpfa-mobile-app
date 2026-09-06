# API Contract

How the GPFA mobile app expects to talk to a backend, and what you need to do to
plug one in.

Everything here describes code that exists today. The app can run on local
fixtures or the authenticated member API without changing screen components.

---

## 1. The switch

The app decides where data comes from with one backend URL. Remote auth also
needs the Supabase project URL and public publishable key so the native client
can refresh and revoke its own session without sending refresh tokens through
the GPFA API:

```bash
# .env  (see .env.example)
EXPO_PUBLIC_API_URL=https://api.example.org
EXPO_PUBLIC_GPFA_WEB_ORIGIN=http://192.168.1.25:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

| `EXPO_PUBLIC_API_URL` | Behaviour |
| --- | --- |
| unset / empty | **Fixture mode.** Data comes from `src/data/fixtures.ts`. Sign-in accepts any credentials. Fixture-supported mutations are local; durable member blocking is unavailable. |
| set | **Remote mode.** Every read and write hits your server. Sign-in posts real credentials and stores a token. |

`EXPO_PUBLIC_GPFA_WEB_ORIGIN` is optional and is sent to sign-in as
`webOrigin` when set. It is also the preferred origin for the browser-based
password-recovery page. Use HTTPS in production. During development, use your
Mac's reachable LAN IP or an HTTPS tunnel for real devices; `localhost` points
at the phone itself.

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

1. On launch, reads the stored access token, refresh token, and expiry from
  SecureStore. A missing or nearly expired access token is refreshed before
  the app restores the signed-in state.
2. Sign-in `POST`s to `/api/members/sign-in` with `{ email, password }`, and
  includes `webOrigin` when `EXPO_PUBLIC_GPFA_WEB_ORIGIN` is set, **without** an
   `Authorization` header.
3. On success, atomically stores the access token, refresh token, and expiry,
  then enters the app.
4. Every later request sends `Authorization: Bearer <token>`.
5. Before an authenticated request, an access token within 60 seconds of expiry
  is refreshed directly through Supabase Auth. A `401` also triggers one
  refresh and one retry. This applies uniformly to every authenticated member
  endpoint; individual portal calls do not bypass session recovery. Concurrent
  callers share one refresh operation.
6. A `403`, rejected refresh token, or second `401` clears the session and
  returns the user to sign-in. Network failures and Supabase `5xx` responses
  remain retryable and do not erase credentials.
7. User-initiated sign-out asks Supabase Auth to revoke this device's refresh
  session, then clears local credentials even if remote revocation fails.

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

### 3.3 Password recovery browser handoff

The signed-out screen opens `${AUTH_BASE_URL}/forgot-password` in the system
browser. A syntactically valid email already entered in the app is normalized,
URL-encoded, and included only as an optional `email` prefill. Invalid or empty
input still opens the unprefilled page.

Native does not call the forgot-password or reset-password APIs and receives no
recovery token. The browser page validates the email again, submits the public
rate-limited request, and keeps account-state responses uniform. Supabase's
callback session and the HMAC-bound `gpfa_password_recovery` httpOnly grant
cookie remain browser-only. Password reset completes in that browser context;
the member then returns to the app and signs in with the new password.

Production builds require an HTTPS `AUTH_BASE_URL`. Development builds may use
a reachable HTTP LAN origin. Missing, malformed, credential-bearing, or unsafe
origins fail closed and show a retryable native error instead of opening a
fallback URL.

### 3.4 Refresh and revocation boundary

The refresh token is sent only to the configured Supabase Auth
`/auth/v1/token?grant_type=refresh_token` endpoint. Rotated access and refresh
tokens replace the stored session as one payload before queued requests resume.
GPFA member API routes receive only the current access token.

Sign-out calls Supabase Auth `/auth/v1/logout?scope=local` with the current
access token. This revokes the current device's refresh session; already-issued
JWT access tokens remain subject to their normal short expiry. The app does not
currently list or control sessions on other devices.

`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be a public publishable/anonymous
client key. A secret or service-role key must never be embedded in a mobile
build.

### 3.5 Foreground realtime

Remote mode uses the current access token to join two private Supabase
Realtime broadcast topics:

- `working-group:{slug}` listens for `working_group_feed_changed` with
  `{ eventId, groupSlug, itemType, itemId, changeType, occurredAt }`.
- `member:{memberId}:messaging` listens for `conversation.created`,
  `conversation.member_left`, `conversation.members_added`,
  `conversation.renamed`, `message.created`, `message.updated`, and
  `reaction.changed`. Messaging payloads contain identifiers and, for a newly
  created message, its ordinal; they never contain message content.

Broadcasts are invalidation hints, not trusted records. The app fetches the
canonical member API response before updating feed cards, conversation
metadata, messages, edits, or reactions. Existing Realtime policies remain the
authorization boundary for private topics, and the member API remains the
authorization boundary for catch-up reads.

Sockets run only while the app is active. They close when the app backgrounds
and rejoin with bounded backoff after foregrounding or a channel failure. A
successful join triggers a canonical catch-up so events missed during launch,
network loss, token refresh, or background execution are recovered. Fixture
mode does not open sockets. Background push delivery is not part of this
contract.

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
| `GET` | `/api/members/blocks` | Profile settings → Blocked Members | `BlockedMembersResponse` |
| `POST` | `/api/members/blocks` | Profile/direct-chat Block action | `{ status: "success" }` |
| `DELETE` | `/api/members/blocks/:targetMemberId` | Settings/direct-chat Unblock action | `{ status: "success" }` |
| `GET` | `/api/members/messages` | Directory → Messages inbox | `ConversationListResponse` |
| `GET` | `/api/members/messages/direct/:memberId` | Directory member → direct-message draft | `DirectConversationResponse` |
| `GET` | `/api/members/messages/group?to=:memberIds` | New group message member selection | `GroupConversationResponse` |
| `GET` | `/api/members/messages/conversations/:conversationId` | Message thread | `ConversationDetailResponse` |
| `POST` | `/api/members/messages/conversations/:conversationId/read` | Message thread read cursor | `{ status, conversationId, lastReadOrdinal }` |
| `POST` | `/api/members/messages/conversations/:conversationId/members` | Group conversation Manage → Add members | `{ status, conversationId, participantIds }` |
| `DELETE` | `/api/members/messages/conversations/:conversationId/leave` | Group conversation Manage → Leave | `{ status, conversationId }` |
| `PATCH` | `/api/members/messages/conversations/:conversationId/title` | Group conversation Manage → Rename | `{ status, conversationId, title }` |
| `POST` | `/api/members/messages/send` | Message composer | `SendMessageResponse` |
| `PATCH` | `/api/members/messages/:messageId` | Own-message edit action | `{ status, conversationId, message }` |
| `DELETE` | `/api/members/messages/:messageId` | Own-message unsend action | `{ status, conversationId, message }` |
| `POST` | `/api/members/messages/reactions` | Message reaction picker | `{ status, conversationId, messageId, emoji, active }` |
| `GET` | `/api/members/working-groups/:slug/feed` | Group detail infinite feed | `WorkingGroupFeedResponse` |
| `GET` | `/api/members/working-groups/:slug/feed/items/:itemType/:itemId` | Prepared route | `{ status, item: WorkingGroupFeedItem }` |
| `GET` | `/api/members/working-groups/:slug/tag-usage` | Create post tag suggestions | `WorkingGroupTagUsageResponse` |
| `GET` | `/api/members/working-groups/:slug/resource-submissions` | Group detail Resources tab | `{ status: "success", resources: ResourceItem[], newsRadar: [] }` |
| `POST`/`DELETE` | `/api/members/working-groups/:slug/subscription` | Group header + About tab | ignored |
| `POST` | `/api/members/working-groups/:slug/resource-submissions/uploads/prepare` | Resource submission attachment prepare | `WorkingGroupResourceUploadPrepareResponse` |
| `PUT` | signed storage URL from prepare | Resource submission attachment upload | non-error status |
| `POST` | `/api/members/working-groups/:slug/resource-submissions/uploads/finalize` | Resource submission attachment finalize | `WorkingGroupResourceUploadFinalizeResponse` |
| `POST` | `/api/members/working-groups/:slug/resource-submissions` | Resource submission metadata | `WorkingGroupResourceSubmissionResponse` |
| `GET` | `/api/admin/resource-submissions?groupSlug=:slug&status=all` | Co-lead resource moderation queue | `{ status: "success", submissions: WorkingGroupResourceModerationSubmission[] }`; bearer required, co-lead scoped to `groupSlug` |
| `PATCH` | `/api/admin/resource-submissions/:id/status` | Co-lead approve/reject/request-changes action | `{ status, reviewerNotes? }` → `{ status: "success", approvedContentItemId? }`; server authorizes against the submission's group |
| `DELETE` | `/api/admin/resource-submissions/:id/status` | Co-lead removal of an approved resource | `{ status: "success" }`; archives published content while preserving submission history |
| `POST` | `/api/members/working-groups/events/rsvp` | Event detail RSVP | `{ status, message }` |
| `POST` | `/api/members/forum/threads` | Create post sheet | `multipart/form-data` → `{ status, redirectTo }` |
| `PATCH`/`DELETE` | `/api/members/forum/threads/:threadId` | Post detail edit/delete controls | `{ status }` |
| `PATCH` | `/api/members/forum/threads/:threadId/status` | Post detail status controls | `{ status, threadStatus }` |
| `POST` | `/api/members/forum/replies` | Post detail reply composer | `{ status, message }` |
| `DELETE` | `/api/members/forum/replies/:replyId` | Post detail own-reply deletion | `{ status }` |
| `POST` | `/api/members/forum/uploads/prepare` | Thread/reply attachment prepare | `ForumUploadPrepareResponse` |
| `PUT` | signed storage URL from forum prepare | Thread/reply attachment upload | non-error status |
| `POST` | `/api/members/forum/uploads/finalize` | Thread/reply attachment finalize | `ForumUploadFinalizeResponse` |
| `GET` | `/api/content-assets/:assetId` | Open thread/reply attachment | file response; bearer required for member assets |
| `POST` | `/api/members/forum/summarize` | Post detail summarize action | `ForumSummarizeResponse` |
| `POST` | `/api/members/forum/reports` | Report a thread or reply | `{ status: "success", reportId }` |
| `GET` | `/api/members/forum/reports?groupSlug=:slug` | Co-lead moderation queue | `{ status: "success", reports: ForumModerationQueueItem[] }` |
| `PATCH` | `/api/members/forum/reports/:reportId` | Dismiss or remove reported content | `{ status: "success" }` |
| `POST` | `/api/members/forum/moderation/remove` | Direct co-lead content removal | `{ status: "success" }` |
| `GET`/`POST` | `/api/members/polls` | Poll detail/create poll | `MemberPollsResponse` / `{ status, pollId }` |
| `GET`/`PUT`/`DELETE` | `/api/members/polls/:id` | Post detail poll editor, close, and delete actions | `MemberPollResponse` / `{ status }` |
| `POST` | `/api/members/polls/vote` | Submit or replace one complete poll response | `{ status, message }` |
| `GET`/`POST`/`DELETE` | `/api/members/upvotes` | Feed/detail upvote actions | member content list / mutation response |
| `GET`/`POST`/`DELETE` | `/api/members/saved-content` | Feed/detail repost actions + profile Reposts | member content list / mutation response |
| `GET` | `/api/members/profile` | Greeting, avatars, authorship | `{ status: "success", member: Member }` |
| `GET` | `/api/members/home/immediate-actions` | Home masthead + What You Missed | `{ status: "success", masthead, actions }`, mapped to `HomeImmediateActionsResponse` |
| `GET` | `/me/saved` | Member profile → Saved | `LibraryResource[]`, newest first |
| `GET` | `/groups` | Home, Groups drawer | legacy `Group[]` shape, not used while `/api/members/working-groups` is configured |
| `GET` | `/events/next` | Home calendar card | `CalendarEvent \| null` |
| `GET` | `/posts` | Groups feed | `FeedEntry[]` |
| `GET` | `/api/members/news` | News screen + Home digest | `{ status: "success", items, relatedThreads }`, mapped to `NewsStory[]`, newest first |
| `GET` | `/api/members/events` | Home calendar + More → Events | `{ status: "success", events: PortalEvent[] }`, including raw dates, timezone, attendee roster, and details URL; mapped to `MobileEventPreview[]` |
| `POST` | `/api/members/events/rsvp` | Event detail RSVP | `{ contentItemId, status }` → `{ status, message }` |
| `GET` | `/api/members/announcements` | Home actions + More → Updates | `{ status, announcements, surveys }`, including survey question/statement matrices and the caller's saved answers |
| `POST` | `/api/members/surveys/:id/response` | Survey final submission | `{ answers: MobileSurveyAnswer[] }` → `{ status: "success" }` |
| `PATCH` | `/api/members/surveys/:id/response` | Prepared survey progress save | `{ resumeStepKey, answer?, feedback? }` → `{ status: "success" }` |
| `GET` | `/api/members/annual-meeting` | Home + More → Annual Meeting | `{ status, page, registration }`, mapped to `AnnualMeetingPreview` |
| `GET`/`POST` | `/api/members/annual-meeting/registration` | Registration load/save | safe member context / `{ draftId, expectedUpdatedAt?, answers }` |
| `GET` | `/api/members/annual-meeting/assets/:assetId` | Protected meeting materials | private file response; bearer required |
| `GET` | `/api/members/resources` | Resources → Library + News Radar | `{ status: "success", resources: ResourceItem[], newsRadar: RadarFeedItem[] }`, mapped to `ResourceHubData`. Called whenever `EXPO_PUBLIC_API_URL` is set, even if `EXPO_PUBLIC_FIXTURE_PORTAL_DATA=true`. |
| `GET` | `/api/members/podcasts?waveform=mobile` | Resources → Podcasts + playback source metadata | `{ status: "success", episodes: PodcastEpisode[] }`, newest first; includes distinct `showNotes`, optional `people[].memberHref`, a JSON `transcriptEndpoint`, and plain-text `transcriptUrl`; protected episodes include a short-lived signed `audioUrl` and `audioExpiresAt`; waveforms are capped at 48 amplitudes |
| `GET` | `/api/members/podcasts/:slug/transcript` | Episode sheet | `{ revisionId: string, segments: PodcastTranscriptSegment[] \| null }`; active-member bearer required; `?download=1` returns the plain-text export |
| `GET` | signed Supabase Storage URL from the podcast catalog | Native playback for member-only podcast audio | Audio response with Storage byte-range support; no GPFA bearer header |
| `GET` | `/api/content-assets/:assetId` | Legacy protected podcast/file playback | Audio/file response; bearer supplied only for this trusted same-origin route |
| `GET` | `/api/members/job-postings?pageSize=100` | Resources → Job board | paginated postings mapped to `JobListing[]` |
| `GET` | `/api/members/directory/organizations` | Directory index + profile | `{ status, organizations }`, mapped to `MemberOrg[]` |
| `GET` | `/api/members/directory?limit=500` | Directory search + organization profiles | `{ status, members }`, mapped to `DirectoryPerson[]` |
| `GET` | `/api/members/directory/profiles/:memberId` | Self, directory, organization, and linked podcast profiles | `{ status: "success", profile: DirectoryMemberProfile }`; active-member bearer required; RSVP events are omitted unless `isSelf` is true |
| `GET` | `/api/members/directory/profiles/:memberId/activity?kind=:kind&page=:page` | Profile Posts, Replies, and Reposts tabs | `MemberProfileActivityPage`; `kind` is `posts`, `replies`, or `reposts`; 10 items per page |
| local only | Ask suggestions | Ask GPFA empty state | `string[]` from fixtures/static prompts |
| `GET` | `/api/members/knowledge/conversations` | Ask GPFA history | `{ status: "success", conversations: AskConversationSummary[] }`, newest first, latest 20 |
| `GET` | `/api/members/knowledge/conversations/:id?before=:cursor` | Ask GPFA saved conversation | `{ status, conversation, messages, hasEarlier, earlierCursor }` mapped to `AskConversationPage` |
| `POST` | `/api/members/knowledge/messages/stream` | Ask GPFA | Incremental SSE mapped to `AskStreamEvent`; `askGpfa()` remains an assembled compatibility wrapper |
| `POST` | `/posts` | Composer | `Thread` |
| `POST` | `/posts/:id/replies` | Post detail | `Reply` |
| `POST`/`DELETE` | `/posts/:id/upvote` | Feed + detail | ignored |
| `POST`/`DELETE` | `/posts/:id/save` | Feed + detail bookmark | ignored |
| `POST`/`DELETE` | `/posts/:id/replies/:replyId/upvote` | Post detail | ignored |
| `POST`/`DELETE` | `/groups/:id/subscribe` | Legacy group subscription route | ignored |
| `POST` | `/posts/:id/vote` | Poll | ignored |
| `POST` | `/posts/:id/rsvp` | Event post | ignored |

### Home dashboard source map

Home loads each band independently so a slow or failed route does not block the
rest of the dashboard. Pull-to-refresh refetches all of these sources:

| Dashboard band | Repository function | Route |
| --- | --- | --- |
| Masthead + What You Missed | `getHomeImmediateActions()` | `/api/members/home/immediate-actions` |
| Upcoming | `getEvents()` | `/api/members/events` |
| Your Groups | `getWorkingGroups()` | `/api/members/working-groups` |
| Industry News | `getNews()` | `/api/members/news` |
| Library | `getLibrary()` | `/api/members/resources` |
| Podcast | `getPodcasts()` | `/api/members/podcasts?waveform=mobile` |

Declared in `ROUTES` but **not called**: `/auth/logout`, `/auth/session`,
`/posts/:id`. The post detail screen reads from the already-loaded feed rather
than fetching one post.

To change any path, edit `ROUTES` in `src/api/config.ts` — nothing else
references URLs.

Private messaging is always remote whenever `EXPO_PUBLIC_API_URL` is set. All
twelve `/api/members/messages*` operations send the stored bearer token and ignore
`EXPO_PUBLIC_FIXTURE_PORTAL_DATA`; fixture conversations are used only when no
remote API is configured.

### Podcast playback delivery

Podcasts also always use the remote catalog whenever `EXPO_PUBLIC_API_URL` is
set. The fixture flag cannot replace remote podcast data, because fixture
episodes do not contain playable protected-audio URLs.

After active-member authentication, `/api/members/podcasts` signs each
member-only Storage object and returns the object-scoped URL with
`audioExpiresAt`. The mobile player refreshes the catalog before loading an
episode when that expiry is invalid, elapsed, or less than ten minutes away.
Signed Storage URLs are never persisted or logged, and the app never attaches
the GPFA bearer token to them. The bearer is only attached to the trusted,
same-origin `/api/content-assets/:assetId` compatibility URL.

The default web catalog may contain up to 4,000 signed min/max waveform
samples. Mobile requests `waveform=mobile`, which compacts each waveform on the
server to at most 48 nonnegative amplitude buckets. The mobile repository
validates and re-bounds that input before it reaches React Native rendering.

Transcript JSON uses the bearer-safe
`/api/members/podcasts/:slug/transcript` route rather than the cookie-oriented
member page route. A successful response includes the stable `revisionId` and
either timestamped `{ start, text }` segments or `segments: null` when no
transcript can be delivered. The repository validates this boundary: malformed
JSON and HTML redirects are load errors, not empty transcripts. When
`EXPO_PUBLIC_API_URL` is unset, transcript-enabled fixture episodes resolve
their synthetic segments from the local fixture map.

The catalog's `transcriptEndpoint` is the authenticated JSON source used for
timestamp seeking, active-line highlighting, and opt-in transcript following.
Its `transcriptUrl` is the separate `?download=1` plain-text response used by
the native save/share action. Audio export refreshes the catalog first so the
download receives a current signed Storage URL. The app sends its bearer token
only to configured GPFA API/web origins; signed Storage and third-party URLs
never receive it. Both exports use a disposable cache directory that is removed
after the platform share sheet closes or an error occurs.

Podcast guests become interactive only when the server supplies a valid
`memberHref` in the form `/members/directory/:organizationSlug/:mentionHandle`.
The app validates that route, matches it to the loaded active-member directory,
and then requests the viewer-scoped summary endpoint. External guests remain
plain text and cannot be used to probe directory membership.

### 4.1 Request/response details

**`GET /api/members/profile` → `{ status: "success", member: Member }`**

The signed-in member. Home and Groups **block on this** — `DataGate` holds the
spinner until it resolves, because the greeting, top-bar avatar, and the author
of anything the member posts all come from it. The app sends the stored bearer
token and calls this route whenever a remote API is configured, even when
`EXPO_PUBLIC_FIXTURE_PORTAL_DATA=true`, so fixture portal content never replaces
the authenticated member's identity.

```json
{
  "status": "success",
  "member": {
    "id": "member-uuid",
    "name": "Robert Goobie",
    "firstName": "Robert",
    "initials": "RG",
    "org": "HOOPP",
    "role": "Assistant VP, Treasury & Liquidity",
    "appRole": "member",
    "orgId": "organization-uuid"
  }
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

**`GET /api/members/notifications` → `MemberNotificationsResponse`**

Notifications for the signed-in member, newest first. The request includes the
stored token:

```http
Authorization: Bearer <accessToken>
```

The API returns `{ "status": "success", "memberCreatedAt": "...",
"notifications": [...] }`. The app preserves `memberCreatedAt` for realtime
membership-boundary checks and normalizes each row. It also tolerates common aliases such as `_id`, `uuid`,
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
    "target_type": "site",
    "target_id": "...",
    "content_type": "working_group_post",
    "content_id": "...",
    "content_deleted_at": null,
    "readAt": null
  }
]
```

`read: false` or a missing `read` value counts toward the bell badge. `href` is
stored from `navigation_href`. Tapping a row marks it read without dismissing it
and opens supported destinations through native state: announcements, surveys,
events, Annual Meeting, working groups, discussions, and polls. Relative member
paths are validated before use. External, malformed, traversal, and member
destinations without a native equivalent are never opened; the app reports that
the destination is unavailable.

When `content_deleted_at` is present, the app closes the notification sheet,
marks the notification read, and shows a content-specific unavailable alert.
The notification remains in history until the member explicitly dismisses it.

**`POST /api/members/notifications/read` → `{ status, readAt }`**

Marks one or more notifications as read. The app sends the stored bearer token
and this JSON body:

```json
{ "notificationIds": ["notif-cl1"] }
```

The app supports one-row and mark-all actions. It optimistically sets matching
notifications to `read: true`, which also updates the header badge without
removing the rows. If the request fails, it restores the previous state and
shows an error.

**`POST /api/members/notifications/dismiss` → `{ status, dismissedAt }`**

Dismisses one or more notifications for the signed-in member. The app sends the
same body shape as mark-read:

```json
{ "notificationIds": ["notif-cl1"] }
```

The app supports one-row dismissal and a distinct **Clear all** action. Clear
all sends the IDs in the currently loaded notification window (at most 30) in
one request; it does not imply historical deletion. The app optimistically
removes matching notifications from the sheet. If the request fails, it
restores the previous list and shows an error. Dismissing the last notification
renders the sheet's empty state. Both operations remain per-user soft dismissals;
the durable notification row is not deleted.

**Foreground realtime delivery**

When `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured, the signed-in app uses
the existing secure session's access token to subscribe to `INSERT` events on
`public.notifications`. Database RLS remains authoritative for target access.
The app validates each row, rejects notifications from before `memberCreatedAt`,
deduplicates by ID, and keeps the newest 30. A new realtime row produces an
accessible in-app banner with an Open action that uses the same native routing
as the notification sheet.

The socket exists only while the app is active. It is removed on background,
sign-out, and unmount. Foregrounding triggers a REST refresh before reconnecting,
and a 60-second foreground refresh reconciles disconnect gaps. Rows discovered
by initial load, polling, or foreground reconciliation do not replay arrival
banners. Notification titles and bodies must never be written to logs or
analytics.

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

**`GET /api/members/events` → `{ status: "success", events: PortalEvent[] }`**

The Events screen uses the active-member bearer token and maps each row into a
`MobileEventPreview`. In addition to display labels, the response must preserve
the source calendar fields and the member-visible attendee roster:

```ts
type MobileEventPreview = {
  id: string;
  contentItemId: string | null;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  datePrecision?: 'day' | 'datetime';
  detailsUrl: string;
  attendeeCount: number;
  attendees: Array<{ name: string; org?: string }>;
  // Existing title, location, format, RSVP, summary, agenda, and join fields.
};
```

The app uses these fields for the month view and generates `.ics` files on the
device. “Add to calendar” opens the system event editor with prefilled event
data; it does not request broad calendar permission. Calendar exports include
the summary and `detailsUrl`, but deliberately exclude attendee identities and
the private member meeting URL. No separate calendar-download API call is made.

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

**`GET /api/members/knowledge/conversations` → saved Ask GPFA conversations**

Requires the same active-member bearer authentication as the stream endpoint.
It returns at most the 20 most recently updated active conversations owned by
the caller:

```json
{
  "status": "success",
  "conversations": [
    { "id": "uuid", "title": "Agency-lending indemnification", "updatedAt": "2026-08-28T15:30:00.000Z" }
  ]
}
```

**`GET /api/members/knowledge/conversations/:id?before=:cursor` → `AskConversationPage`**

The first request omits `before` and returns the latest 40 messages in
chronological order. When `hasEarlier` is true, pass `earlierCursor` back
unchanged as `before` and prepend the returned messages by id. Cursors are
opaque and must not be decoded or constructed by the mobile client. Missing,
inactive, and conversations owned by another member all return `404` without
revealing ownership information.

```json
{
  "status": "success",
  "conversation": { "id": "uuid", "title": "Agency-lending indemnification", "updatedAt": "2026-08-28T15:30:00.000Z" },
  "messages": [
    { "id": "uuid", "role": "user", "text": "How do peers structure it?", "createdAt": "2026-08-28T15:29:00.000Z", "sources": [] },
    { "id": "uuid", "role": "ai", "text": "Members generally…", "createdAt": "2026-08-28T15:30:00.000Z", "sources": [] }
  ],
  "hasEarlier": false,
  "earlierCursor": null
}
```

**`POST /api/members/knowledge/messages/stream` → Server-sent events → `AskAnswer`**

```http
POST /api/members/knowledge/messages/stream
Accept: text/event-stream
Authorization: Bearer <accessToken>

{ "conversationId": "optional-existing-conversation", "message": "How do peers structure indemnification?" }
```

The app incrementally handles `ready`, `tool_call`, `tool_result`, `text_delta`,
`done`, `persisted`, and `error` events. `ready` replaces the optimistic member
message and establishes the saved conversation. Tool events drive a safe,
server-authored research trace. Text deltas are decoded across arbitrary chunk
boundaries and flushed to the UI in small batches. `done` supplies canonical
answer Markdown and structured sources; `persisted` replaces the transient
assistant row with the durable message id. `App.tsx` owns this state and sends
the conversation id with follow-up questions. Ask suggestions remain local
until a real member suggestions endpoint exists.

Once `done` arrives, the generated answer remains usable even if the native
transport closes before `persisted`. The app attempts to reconcile that turn
from conversation history and otherwise keeps the completed answer with a
non-blocking warning that its history write was not confirmed.

Stop aborts response-body consumption before `done`. The partial assistant text
stays visible in memory and is explicitly marked unsaved; it is never written
to local storage or treated as a persisted message. The already acknowledged
member question remains durable. Source navigation only uses validated relative
member routes: supported destinations open natively, and the rest open on the
configured trusted GPFA web origin. Model-authored Markdown links are inert.

Starting a new conversation only clears the selected id. It does not create an
empty database row; the first streamed question creates the conversation. The
last active conversation id is stored per member in AsyncStorage and reloaded
from this API after restart. Message bodies and sources are never persisted in
that local preference.

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

**`GET /api/members/directory/organizations` → `{ status, organizations }`**

The repository maps each organization summary to `MemberOrg`. The route returns
them A–Z by `name`; mobile preserves that order.

```json
{
  "id": "healthcare-of-ontario-pension-plan",
  "slug": "healthcare-of-ontario-pension-plan",
  "abbreviation": "HOOPP",
  "name": "Healthcare of Ontario Pension Plan",
  "country": "Canada",
  "sector": "Public Pension Fund",
  "description": "Ontario healthcare sector pension plan…",
  "memberCount": 7,
  "previewMembers": []
}
```

**`GET /api/members/directory?limit=500` → `{ status, members }`**

The response is flat. Mobile maps `orgSlug` to `DirectoryPerson.orgId`, matching
the slug used as `MemberOrg.id`; members without an organization slug are not
placed in an organization roster.

```json
{
  "status": "success",
  "members": [
    {
      "id": "member-uuid",
      "name": "Robert Goobie",
      "role": "Assistant VP, Treasury & Liquidity",
      "orgSlug": "healthcare-of-ontario-pension-plan"
    }
  ]
}
```

Order matters: a profile lists its people **in the order you send them**, so put
the ones that should lead first. The index's people search sorts by name
instead, and only runs once the member types something.

**Upvote / vote / RSVP** — the app checks for a non-error status, shows visible
mutation feedback, and reconciles canonical detail when needed.

- Upvote / repost / subscribe: `POST` to set, `DELETE` to unset. Reposts use
  `/api/members/saved-content`; “saved content” is the storage/API name, not the
  mobile UI label.
- Reply creation uses the forum reply route and then refetches the canonical
  item detail. Reply deletion is available only when the canonical reply has an
  id and its `author.id` matches the signed-in member.
- Poll participation keeps selections in memory until every canonical question
  has one answer, then sends the complete ordered answer set through
  `/api/members/polls/vote`. The app blocks another write while pending and
  reloads canonical detail after success; the server remains authoritative for
  completeness, option membership, subscription, and lifecycle constraints.
- Working-group event RSVP maps `yes`/`no` UI choices to the route's canonical
  attendance statuses.

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
| `POST /api/members/forgot-password` | Current via browser handoff / Public, rate-limited. Source: `members/forgot-password/route.ts`. | The mobile app does not call this route. The browser form submits its validated email. | Uniform recovery response that does not disclose account state. | Native opens `/forgot-password` with an optional email prefill. Rate limiting and all recovery submission errors remain in the browser flow. |
| `POST /api/members/reset-password` | Current via browser handoff / Browser session plus recovery grant. Source: `members/reset-password/route.ts`. | Browser form password fields; authorization comes from the callback session and bound httpOnly recovery-grant cookie, not a mobile-supplied reset token. | `{ status: "success" }` after the authorized password change. | Invalid/expired grants fail closed. Native never receives the grant or calls this route. |
| `POST /api/members/change-password` | Current / Member bearer-ready. Source: `members/change-password/route.ts`. | No body. | `{ status: "success", message }`. | Sends a verified recovery link to the authenticated profile email. Rate limits return `429`; auth errors return `401`. |
| `POST /api/auth/verify-email-link` | Deferred / Public token flow. Source: `auth/verify-email-link/route.ts`. | JSON `{ token }`. | `{ status: "success" }`. | No pagination. Invalid token returns error; include only when mobile owns email verification. |

#### Member profile and onboarding

The current-member read powers the mobile greeting, avatar, authorship, and
account settings. Profile and avatar changes refresh this authoritative read.

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/profile` | Current / Member bearer-ready. Source: `members/profile/route.ts`. | No body. | `{ status: "success", member: { id, name, firstName, initials, org, role?, orgId?, avatarUrl, country, bio, skills, mentionHandle, organizationSlug } }`. | No pagination. Uses the current authenticated member only and returns `Cache-Control: private, no-store`. Auth errors return `401`; malformed or unavailable profile data returns `500`. |
| `PATCH /api/members/profile` | Current / Member bearer-ready. Source: `members/profile/route.ts`. | JSON `{ fullName, roleTitle, country, bio, skills }`. | `{ status: "success", member }`. | Invalid body returns `400` with field errors; unauthenticated/inactive returns `401`; write failures return `500`. |
| `PATCH /api/members/profile/handle` | Current / Member bearer-ready. | JSON `{ mentionHandle }`. | `{ status: "success", mentionHandle, href }`. | Invalid handles return `400`; collisions return `409`. The member id always comes from authentication. |
| `GET /api/members/email-preferences` | Current / Member bearer-ready. | No body. | `{ status: "success", preferences }`. | Returns all five boolean preferences with `Cache-Control: private, no-store`. |
| `PATCH /api/members/email-preferences` | Current / Member bearer-ready. | JSON `{ preference, enabled }`. | `{ status: "success", preferences }`. | Updates exactly one validated preference and returns the complete authoritative state. |
| `GET /api/members/mentions` | Current / Member bearer-ready. | No body. | `{ status: "success", items }`. | Durable received-mention history, newest first. Empty state is `items: []`; notification dismissal does not remove these records. |
| `GET /api/members/onboarding/state` | Deferred / active member, migration needed. Source: `members/onboarding/state/route.ts`. | No body. | Current onboarding step/state payload. | No pagination. Empty state is the server-defined incomplete/completed state, not a guessed client fallback. |
| `POST /api/members/onboarding/profile` | Deferred / active member, migration needed. Source: `members/onboarding/profile/route.ts`. | JSON profile details matching `MemberProfileDetailsSchema`. | `{ status: "success" }`. | No pagination. Validation `400`; inactive/unauthenticated `401`. |
| `POST /api/members/onboarding/password` | Deferred / active member, migration needed. Source: `members/onboarding/password/route.ts`. | JSON password payload. | `{ status: "success" }`. | No pagination. Validation `400`; auth errors `401`. |
| `POST /api/members/onboarding/complete` | Deferred / active member, migration needed. Source: `members/onboarding/complete/route.ts`. | No body. | `{ status: "success" }`. | No pagination. Missing active profile fails closed. |
| `POST /api/members/avatar/prepare` | Current / Member bearer-ready. Source: `members/avatar/prepare/route.ts`. | JSON `{ filename, byteSize, contentType: "image/jpeg" }`. | `{ storagePath, signedUrl }`. | Mobile normalizes selected photos to a 512×512 JPEG below 512 KB before preparing the upload. |
| `POST /api/members/avatar/finalize` | Current / Member bearer-ready. Source: `members/avatar/finalize/route.ts`. | JSON `{ storagePath, contentType: "image/jpeg" }`. | `{ status: "success", imageUrl }`. | The server verifies ownership, bytes, size, and moderation before persisting. |
| `DELETE /api/members/avatar` | Current / Member bearer-ready. Source: `members/avatar/route.ts`. | No body. | `{ status: "success" }`. | Empty state is no avatar; UI falls back to initials. |
| `POST /api/members/avatar/linkedin` | Current / Member bearer-ready. Source: `members/avatar/linkedin/route.ts`. | JSON `{ includeName: false }` from mobile. | `{ status: "success", imageUrl, imported, fullName }`. | Mobile imports only the linked identity photo; no-body web callers preserve the existing name-and-photo behavior. |

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
| `GET /api/members/working-groups/:slug/feed/items/:itemType/:itemId` | Current / Member bearer-ready. Source: `members/working-groups/[slug]/feed/items/[itemType]/[itemId]/route.ts`. | Path `slug`, `itemType`, `itemId`. | `WorkingGroupFeedItemResponse`: `{ status: "success", item, detail }`. Thread details include full thread body, attachments, replies, participants, saved/upvoted counts, and `permissions: { canReply, canEdit, canDelete, canChangeStatus, canReport, canModerate }`. Replies include required `deleted` and `removed` booleans. Poll details include full poll, results, current member answers, saved/upvoted counts, and currently omit `canReport` and `canModerate`. | No pagination. Unknown, mismatched, removed, or inaccessible root items return `404`; invalid params return `400`; auth errors return `401`. A removed reply remains in the response as an empty structural tombstone with `deleted: true` and `removed: true`. |
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
| `DELETE /api/members/forum/replies/:replyId` | Current / Member bearer-ready. Source: `members/forum/replies/[replyId]/route.ts`. | Path `replyId`; no body. | `{ status: "success" }`. | No pagination. The mobile UI exposes this only for canonical replies whose `author.id` matches the signed-in member. The route remains authoritative and currently permits authors to delete their own replies while the discussion is open. |
| `POST /api/members/forum/uploads/prepare` | Current / Member bearer-ready. Source: `members/forum/uploads/prepare/route.ts`. | JSON `{ groupSlug, fileName, contentType, byteSize }`. | `ForumUploadPrepareResponse`: upload `assetId`, bucket, storage path, signed URL, expected content type/size. | Used by thread and reply composers. Validate type/size before issuing URL; maximum 25MB. |
| `PUT signedUrl` | Current / signed storage URL. | Raw file body with the prepared `Content-Type`; no bearer header. | Any non-error storage response. | Mobile does not finalize or create the thread/reply after a failed upload. |
| `POST /api/members/forum/uploads/finalize` | Current / Member bearer-ready. Source: `members/forum/uploads/finalize/route.ts`. | JSON `{ groupSlug, assetId, fileName, contentType, byteSize }`. | `ForumUploadFinalizeResponse`: persisted asset metadata. | Used by thread and reply composers. Reject mismatched upload metadata; storage errors `500`. |
| `GET /api/content-assets/:assetId` | Current / Public for public assets; member bearer-ready for member assets. Source: `content-assets/[id]/route.ts`. | Path `assetId`; bearer token for protected forum files. | Inline response for safe media/PDF types, attachment response for Office/other files. | Mobile downloads to cache and opens the native document/share sheet. Unauthorized and missing assets intentionally return `404`. |
| `POST /api/members/forum/summarize` | Current / Member bearer-ready. Source: `members/forum/summarize/route.ts`. | `multipart/form-data` with `threadId`, `groupSlug`. | `ForumSummarizeResponse`: `{ status, message, summary }`. | No pagination. Must verify readable group content; rate-limit/AI errors should return clear `status: "error"` messages. |
| `POST /api/members/forum/reports` | Current / Member bearer required. | JSON `ForumContentReportInput`: `{ targetType: "thread" | "reply", targetId, category, details? }`. Categories are `spam`, `harassment`, `off_topic`, `sensitive_information`, `misleading`, and `other`; details are trimmed and limited to 1,000 characters. | `{ status: "success", reportId }`. | The route derives group, thread, and author from the target. Active subscribed members may report another member's live content. Self, duplicate-pending, deleted, and removed targets fail with `409`; validation `400`; auth `401`; permission `403`; rate limit `429`. |
| `GET /api/members/forum/reports?groupSlug=:slug` | Current / Exact-group co-lead or active global admin bearer required. | Required `groupSlug` query. | `{ status: "success", reports }`, where each report contains `id`, `workingGroupSlug`, `workingGroupName`, `targetType`, `targetId`, `threadId`, `category`, nullable `details`, `reporter`, `author`, nullable `targetTitle`, `targetBody`, and `createdAt`. `reporter` and `author` contain `id`, `name`, and nullable `mentionHandle`. | Pending only, oldest first. Empty state is `reports: []`. The mobile repository rejects malformed required fields rather than inventing fallback moderation data. Auth `401`; wrong-group/non-moderator `403`; invalid query `400`. Reporter identity is private to this endpoint. |
| `PATCH /api/members/forum/reports/:reportId` | Current / Report-scoped co-lead or active global admin bearer required. | JSON `{ decision: "dismiss" | "remove" }`. | `{ status: "success" }`. | The server derives the report's group and rechecks authority transactionally. Dismiss closes one report. Remove tombstones the target and resolves every pending report for it. Validation `400`; auth `401`; permission `403`; stale/resolved report or target `409`; unknown report `404`. |
| `POST /api/members/forum/moderation/remove` | Current / Target-scoped co-lead or active global admin bearer required. | JSON `{ targetType: "thread" | "reply", targetId }`. | `{ status: "success" }`. | Direct removal has no report prerequisite. The server derives the group and rechecks authority. Removed threads disappear; removed replies remain empty `Reply removed by a co-lead` tombstones. Validation `400`; auth `401`; permission `403`; removed/stale target `409`; unknown target `404`. |

#### Polls

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/polls` | Current / Member bearer-ready. Source: `members/polls/route.ts`. | Query `groupSlug?`, `cursor?`, `limit?`. | `MemberPollsResponse`: `{ status, polls, resultsByPoll, answersByPoll, member }`. | Cursor pagination where supplied; default server order is newest/relevant poll order. Empty state is `polls: []`. Invalid query `400`; auth `401`. |
| `POST /api/members/polls` | Current / Member bearer-ready. Source: same route. | JSON `MemberPollCreateInput`: `title`, `description?`, `tags?`, `closesAt`, `groupSlug?`, `questions[]`. | `{ status: "success", pollId }`. | No pagination. Validate at least one question and options; contributor auth required for group polls. |
| `GET /api/members/polls/:id` | Current / Member bearer-ready. Source: `members/polls/[id]/route.ts`. | Path `id`. | `MemberPollResponse`: `{ status, poll }`. | Loads the canonical mobile poll editor. Unknown/inaccessible polls return a permission-safe error. |
| `PUT /api/members/polls/:id` | Current / Member bearer-ready. Source: same route. | JSON `MemberPollUpdateInput`. | `{ status: "success" }`. | The mobile editor sends full questions/options only before the first response; afterward it sends metadata only. Closing sends `{ status: "closed" }`. Closed polls cannot reopen. Validation `400`; lifecycle conflicts `409`. |
| `DELETE /api/members/polls/:id` | Current / Member bearer-ready. Source: same route. | Path `id`; no body. | `{ status: "success" }`. | Used by the confirmed destructive mobile poll action. The server remains authoritative for ownership and active membership. |
| `POST /api/members/polls/vote` | Current / Member bearer-ready. Source: `members/polls/vote/route.ts`. | JSON `{ pollId, groupSlug?, answers: [{ questionId, optionId }] }`; `answers` must contain exactly one valid option for every canonical question. | `{ status: "success", message }`. | No pagination. A later complete submission may replace the member's selections while the poll is open. The server enforces active group subscription, completeness, option ownership, and lifecycle; validation `400`; closed/inaccessible poll errors fail closed. |

#### Reposts (saved content) and upvotes

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/saved-content` | Current / Member bearer-ready. Source: `members/saved-content/route.ts`. | Query `targetType?`, `targetId?`, `groupSlug?`, `limit?`, `offset?`. | `MemberContentListResponse`: `{ status, items, meta }`. | Offset pagination. Newest repost first. The profile reads every page, then hydrates those references from the existing WG feeds so all visible reposts are shown as cards. Empty state is `items: []`, `meta.count: 0`. Invalid filters `400`; auth `401`. |
| `POST /api/members/saved-content` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`; target types are `thread`, `event`, `announcement`, `poll`. | `MemberContentMutationResponse`: `{ status, message, targetType, targetId }`. | No pagination. Idempotent repost semantics. Must verify visibility/subscription for group content. |
| `DELETE /api/members/saved-content` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`. | `MemberContentMutationResponse`. | No pagination. Empty state is target not reposted. Mobile rolls back optimistic state on failure. |
| `GET /api/members/upvotes` | Current / Member bearer-ready. Source: `members/upvotes/route.ts`. | Query `targetType?`, `targetId?`, `groupSlug?`, `limit?`, `offset?`. | `MemberContentListResponse`. | Offset pagination. Newest upvote first. Empty state is `items: []`. |
| `POST /api/members/upvotes` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`; first-pass targets are `thread`, `event`, `announcement`, `poll`. Reply upvotes are a mobile route dependency to verify before relying on persistence. | `MemberContentMutationResponse`. | No pagination. Idempotent upvote preferred; must verify visibility. |
| `DELETE /api/members/upvotes` | Current / Member bearer-ready. Source: same route. | JSON `{ targetType, targetId }`. | `MemberContentMutationResponse`. | No pagination. Empty state is target not upvoted. |

#### Resources, library, podcasts, jobs, directory, news, and events

The GPFA web routes below exist, but some mobile surfaces still point at legacy
placeholder paths. Remap `ROUTES` and adapt the response in `portal.ts` before
treating the remaining deferred routes as remote-ready.

| Workflow | Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- | --- |
| Resources/library | `GET /api/members/resources` | Current / Member bearer-ready. Source: `members/resources/route.ts`. | No query params. | `{ status: "success", resources: ResourceItem[], newsRadar: RadarFeedItem[] }`. Each resource includes an explicit `artifact` (`file`, `external`, or `none`) and maps to `ResourceHubData`. | Server-defined resource and radar order; no pagination. File artifacts may include `fileName`, `contentType`, and `byteSize`, plus server-derived `previewable`. Empty state `resources: []`, `newsRadar: []`. `401` inactive; `500` load failure. |
| Podcasts | `GET /api/members/podcasts?waveform=mobile` | Current / Member bearer-ready. Source: `members/podcasts/route.ts`. | Optional `waveform=mobile`; omitted returns the detailed web waveform and any other value returns `400`. | `{ status: "success", episodes: PodcastEpisode[] }`. | Newest/catalog order from server. No pagination. Empty state `episodes: []`. Each playable episode supplies `audioUrl`; protected audio also supplies `audioExpiresAt`; mobile waveforms contain at most 48 amplitudes. Missing audio remains browsable but is shown as unavailable. |
| Jobs | `GET /api/members/job-postings` | Current / Member bearer-ready. Source: `members/job-postings/route.ts`. | Query `page?` default `1`, `pageSize?` default `20`, max `100`. Mobile requests `pageSize=100`. | Active job-posting page from `getCachedActiveJobPostings`. Maps `jobPostings` to `JobListing[]`. | Page-based pagination from the API; mobile loads the first page for the Resources hub and Job board card count. Empty page is an empty jobs array with total metadata. Invalid pagination `400`; auth `401`; load failure `500`. |
| Jobs write | `POST /api/members/job-postings`, `PATCH/DELETE /api/members/job-postings/:jobId` | Excluded first pass / Organization admin. Sources: job posting routes. | JSON job posting payload for create/update; path `jobId` for update/delete. | `{ status: "success", jobPosting }` or `{ status: "success" }`. | Org-admin mobile workflow does not exist; exclude until it does. |
| Directory people | `GET /api/members/directory?limit=500` | Current / Member bearer-ready. Source: `members/directory/route.ts`. | Mobile requests `limit=500`; route also accepts `query?`, `workingGroupSlug?`, and `region?`. | `{ status: "success", members: DirectoryMember[] }`, mapped to `DirectoryPerson[]` using `orgSlug` as the organization join. | Sorted by `full_name` ascending before optional region filter. Empty state `members: []`. Invalid/internal query failures return `500`; auth `401`. |
| Directory detail | `GET /api/members/directory/:memberId` | Current / Member bearer-ready; prepared but not currently called by mobile. Source: `members/directory/[memberId]/route.ts`. | Path `memberId`. | `{ status: "success", summary }` with role, region, organization, and viewer-scoped activity counts. | No pagination. Invalid id `400`; unknown/inaccessible profile `404`; auth `401`. |
| Directory profile | `GET /api/members/directory/profiles/:memberId` | Current / Member bearer-ready. | Active member UUID in the path. | `{ status: "success", profile }` with public identity, organization, skills, working groups, and `isSelf`; `events` is owner-only. | No pagination. Missing, inactive, and locked targets all return permission-safe `404`; auth `401`; responses are private/no-store. |
| Directory profile activity | `GET /api/members/directory/profiles/:memberId/activity` | Current / Member bearer-ready. | Query `kind=posts|replies|reposts`, `page` defaults to `1`. | `{ status: "success", kind, items, page, pageSize, totalItems, hasMore }`; activity items carry native `groupSlug`, `targetType`, and `targetId` navigation identity. | 10 items per page, newest first. Empty state `items: []`; invalid query `400`; unavailable member `404`; auth `401`. |
| Directory organizations | `GET /api/members/directory/organizations` | Current / Member bearer-ready. Source: `members/directory/organizations/route.ts`. | No query params. | `{ status: "success", organizations }`, mapped to `MemberOrg[]`. | Server order is A-Z. Empty state `organizations: []`. Auth `401`; load failure `500`. |
| News feed | `GET /api/members/news` | Current / Member bearer-ready. Source: `members/news/route.ts`. | Query `topic?` (`All` or canonical topic slug), `source?=all|gpfa|industry`, `limit?` 1-30, `cursor?`, `snapshotAt?` ISO timestamp, `story?` radar UUID or `article:<slug>`. | `NewsFeedPage`: `{ status: "success", items: (RadarNewsStory | GpfaNewsStory)[], relatedThreads, nextCursor, snapshotAt, totalMatching, totalAvailable, facets, facetRows, selectedItem }`. | Reuse the first response's `snapshotAt` for every appended page. `story` hydrates stable reader state even when the item is outside the returned page; a missing/deleted item yields `selectedItem: null`. Empty state `items: []`. Invalid filters `400`; auth `401`; load failure `500`. Responses are private/no-store. |
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
| `POST /api/members/knowledge/messages/stream` | Current / Member bearer-ready. Source: `members/knowledge/messages/stream/route.ts`. | JSON `{ conversationId?: uuid, message }`, message 1-5000 chars. | Incremental SSE: `ready`, zero or more `tool_call`, `tool_result`, `text_delta`, then `done`, followed by `persisted` or `error`. `done` includes canonical Markdown, `sourceState`, and structured sources. | No page pagination in stream. Rate limit: 20 member requests/hour. Validation `400`; auth `401`; missing conversation `404`; rate limit `429`; model/persistence failures return error events or error JSON. Cancellation before `done` preserves only an unsaved in-memory partial assistant response. |

#### Member blocking

Member blocking is server-authoritative and available only in remote mode. All
three routes require an active-member bearer session and return private,
no-store responses. The target member id is untrusted input; the server derives
the actor from authentication and owns all authorization and pair locking.

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/blocks` | Current / Member bearer-ready. Source: `members/blocks/route.ts`. | Optional opaque `cursor`; optional `limit` is server-bounded. | `BlockedMembersResponse`: `{ status: "success", members, nextCursor }`. An active row includes `{ memberId, availability: "active", name, avatarUrl, organizationName, blockedAt }`; an inactive target includes only `{ memberId, availability: "unavailable", blockedAt }`. | Actor-owned active blocks only, newest first. Empty state is `members: []`, `nextCursor: null`. Invalid pagination `400`; auth `401`; load failure `500`. |
| `POST /api/members/blocks` | Current / Member bearer-ready, rate-limited. Source: `members/blocks/route.ts`. | JSON `{ targetMemberId }`. | `{ status: "success" }`. | Idempotent for an existing actor-owned block. Invalid/self target `400`; unavailable target uses generic `404`; auth `401`; rate limit `429`. No notification is created. |
| `DELETE /api/members/blocks/:targetMemberId` | Current / Member bearer-ready, rate-limited. Source: `members/blocks/[targetMemberId]/route.ts`. | Target UUID in the path; no body. | `{ status: "success" }`. | Idempotently ends only the caller's ordered block. A reciprocal block remains active and private. Invalid or unauthorized target uses generic `400`/`404`; auth `401`; rate limit `429`. |

An active block has bilateral effects: the pair disappear from each other's
directory, organization-roster, profile, and non-group mention-candidate
surfaces. Existing authored working-group content remains visible, but blocked
author profile links are omitted. Existing direct-message history and the
caller's read cursor remain available; direct send, edit, unsend, and reaction
writes fail with generic unavailable responses. Existing group conversations,
messages, reactions, mentions, and alerts remain unchanged, while creating or
extending a group roster containing any blocked pair fails without naming the
pair.

There is no inbound-block endpoint, blocker identity field, block-created
notification, or administrative override. A successful Unblock ends only the
caller's row and must always be followed by canonical directory and messaging
refreshes; the client must not assume `canSend` became true. Fixture mode
returns an empty block list and rejects Block/Unblock mutations rather than
inventing durable success.

#### Member messaging

Messaging appears as the second section inside the Directory tab. All routes are
private, require an active-member bearer session, and fail closed when the
caller cannot see a participant or conversation.

Every conversation summary and detail includes two required server-owned
capabilities: `canSend` and `blockedByCurrentMember`. Mobile rejects responses
that omit or malform either boolean; it never invents a permissive default.
`blockedByCurrentMember` reports only the caller's own active block so the app
can offer Unblock. It does not reveal whether the other member blocked the
caller.

| Method and path | Status / auth | Request | Response | Sorting, pagination, empty state, errors |
| --- | --- | --- | --- | --- |
| `GET /api/members/messages` | Current / Member bearer-ready. Source: `members/messages/route.ts`. | No query params. | `ConversationListResponse`: `{ status, conversations, totalUnread }`; each conversation requires `canSend` and `blockedByCurrentMember`. | Most recently active first. Blocked direct history remains listed but is read-only. Empty state is `conversations: []`. Auth `401`; load failure `500`. |
| `GET /api/members/messages/direct/:memberId` | Current / Member bearer-ready. Source: `members/messages/direct/[memberId]/route.ts`. | Active directory member UUID in the path. | `DirectConversationResponse`: `{ status, conversationId, recipient }`; `conversationId` is null for a new draft. | Invalid id `400`; unavailable member uses permission-safe `404`; auth `401`. |
| `GET /api/members/messages/group` | Current / Member bearer-ready. Source: `members/messages/group/route.ts`. | Query `to` contains 2-7 unique active member UUIDs. | `GroupConversationResponse`: `{ status, conversationId }`; `conversationId` is null for a new draft. | The New → Group flow resolves an exact participant set before the first send. Invalid participants `400`; inaccessible participant `404`; auth `401`. |
| `GET /api/members/messages/conversations/:conversationId` | Current / Member bearer-ready. Source: `members/messages/conversations/[conversationId]/route.ts`. | Query `beforeOrdinal?`, `afterOrdinal?`, `limit?` up to 50. Mobile requests the latest 50, loads earlier windows with `beforeOrdinal`, and checks post-mutation additions with `afterOrdinal`. | `ConversationDetailResponse`: `{ status, conversation, messages, latestOrdinal }`; `conversation` requires `canSend` and `blockedByCurrentMember`. | Messages are in ordinal order. Existing blocked direct history and read-cursor advancement remain available, while send/edit/unsend/reaction writes fail generically. Unknown/inaccessible conversation `404`; invalid cursor `400`; auth `401`. |
| `POST /api/members/messages/conversations/:conversationId/read` | Current / Member bearer-ready. Source: `members/messages/conversations/[conversationId]/read/route.ts`. | JSON `{ lastReadOrdinal }`. | `{ status: "success", conversationId, lastReadOrdinal }`. | Idempotent cursor advance. Invalid cursor `400`; conflict `409`; rate limit `429`. |
| `POST /api/members/messages/conversations/:conversationId/members` | Current / Member bearer-ready. Source: `members/messages/conversations/[conversationId]/members/route.ts`. | JSON `{ participantIds }` with 1-7 unique member UUIDs to add. | `{ status: "success", conversationId, participantIds }`. | Group-only Manage action. The active group remains capped at 8 members. Invalid input `400`; inaccessible member/conversation `404`; conflict `409`; rate limit `429`. |
| `DELETE /api/members/messages/conversations/:conversationId/leave` | Current / Member bearer-ready. Source: `members/messages/conversations/[conversationId]/leave/route.ts`. | Conversation UUID in the path. | `{ status: "success", conversationId }`. | Group-only, exposed behind a two-tap confirmation. Direct conversation conflict `409`; inaccessible conversation `404`; rate limit `429`. |
| `PATCH /api/members/messages/conversations/:conversationId/title` | Current / Member bearer-ready. Source: `members/messages/conversations/[conversationId]/title/route.ts`. | JSON `{ title }`, trimmed and capped at 80 characters; an empty title clears the custom name. | `{ status: "success", conversationId, title }`. | Group-only Manage action. Invalid title `400`; inaccessible conversation `404`; direct conversation conflict `409`; rate limit `429`. |
| `POST /api/members/messages/send` | Current / Member bearer-ready. Source: `members/messages/send/route.ts`. | JSON `{ conversationId, content, clientNonce }` or `{ participantIds, content, clientNonce }`. Exactly one target form is required. Content is trimmed and must be 1-4000 chars. | `SendMessageResponse`: `{ status, conversationId, conversationCreated, message }`. | `clientNonce` is a UUID used for idempotency. Invalid input `400`; inaccessible target `404`; conflict `409`; rate limit `429`. |
| `PATCH /api/members/messages/:messageId` | Current / Member bearer-ready. Source: `members/messages/[messageId]/route.ts`. | JSON `{ content }`. CRLF is normalized to LF, outer whitespace is trimmed, and content must be 1-4000 characters without unsupported C0 controls. | `EditMessageResponse`: `{ status: "success", conversationId, message }`; `message` is the authoritative replacement row. | Sender's own committed text message only, while the caller remains an active participant and strictly less than five minutes have elapsed since `createdAt`. Invalid input `400`; inaccessible, non-owned, or non-text message uses permission-safe `404`; closed window/conflict `409`; rate limit `429`; failure `500`. |
| `DELETE /api/members/messages/:messageId` | Current / Member bearer-ready. Source: `members/messages/[messageId]/route.ts`. | Message UUID in the path; no body. | `UnsendMessageResponse`: `{ status: "success", conversationId, message }`; `message` is the authoritative system-row replacement. | Uses the same sender, participant, text-kind, and five-minute checks as edit. Unsend retains the row id, client nonce, ordinal, sender, conversation, and creation time; changes `kind` to `system`; replaces content with “{actor} unsent a message”; clears `editedAt`; and deletes reactions. Invalid input `400`; permission-safe `404`; closed window `409`; rate limit `429`; failure `500`. |
| `POST /api/members/messages/reactions` | Current / Member bearer-ready. Source: `members/messages/reactions/route.ts`. | JSON `{ messageId, emoji, active }`; emoji is one of 👍 ❤️ 😂 😮 😢 🎉. | `{ status: "success", conversationId, messageId, emoji, active }`. | Reaction chips toggle the caller's own reaction. Invalid input `400`; inaccessible message `404`; conflict `409`; rate limit `429`. |

The five-minute check in native UI is only an affordance for hiding expired
actions; the server remains authoritative. `message.updated` Realtime payloads
contain identifiers only. Mobile fetches the canonical authorized row before
displaying an edit or unsend performed on another device.

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

The working-group create composer accepts new tags as typed hashtag tokens for
discussions, polls, announcements, and events. Tags are lowercased, normalized
to letters, numbers, and hyphens, de-duplicated in first-seen order, and limited
to eight before submission. The tag-usage endpoint supplies up to six live,
group-scoped suggestions with usage counts; those suggestions are advisory,
not an allowlist. A failed suggestion request does not block custom tags or
post creation.

Two fields deserve attention:

- **`time` is a pre-formatted string**, not ISO 8601. The app never parses it.
  If you send timestamps, format them in `portal.ts`.
- **`mins` is what actually sorts.** Without it a post sorts as age 0 and floats
  to the top of "Newest". Send `mins` **and** `time`, or compute `mins` from
  your timestamp in the mapping layer.

### `Reply`

```ts
{
  id?: string;        // canonical server id after persistence
  parentPostId?: string | null; // null/absent = top-level reply
  a: string;          // author name  ← note the terse key
  org: string;
  time: string;       // display string
  initials?: string;
  text: string;       // body; canonical mentions are embedded as @handle tokens
  up?: number;
}
```

Replies come back flat, and `parentPostId` is the authoritative relationship.
The detail screen follows that chain to its root and renders every descendant
under the root at one visual depth, matching the website. A missing, unknown,
or cyclic parent is shown as a top-level reply rather than dropped.

Mentions are independent of nesting. New-post and reply bodies use canonical
lowercase handles such as `@marcus-chen`. Autocomplete candidates come from the
active subscribed-member directory for the selected working group. The server
resolves handles from the body, persists mention records, and sends the
notification; the client never submits display names as mention identity.

### `Poll`, `PollQuestion`, `PollOption`, `PollAnswer`, `EventRow`

```ts
Poll {
  id: string;
  closes: string;
  closesAt?: string | null;
  closedAt?: string | null;
  questions: PollQuestion[];
  answers: PollAnswer[];       // current member's canonical selections
  hasSubmitted: boolean;       // participation, not merely answer presence
  responseCount: number;
}
PollQuestion { id: string; text: string; options: PollOption[] }
PollOption   { id: string; label: string; votes: number; percentage: number }
PollAnswer   { questionId: string; optionId: string }
EventRow     { icon: 'calendar' | 'pin' | 'people'; text: string }
```

Question order and option order are the order supplied by the canonical poll.
The detail response supplies nested results per question; `votes` and
`percentage` are server-derived values. Mobile does not flatten the poll or
recompute percentages from a single question.

Unsubmitted selections are local to the current app session. This scope does
not persist partial answers to the server and does not support cross-device
draft resume. Only a successful complete batch submission creates canonical
participation; the app then reloads detail to reconcile `answers`, results, and
`hasSubmitted`.

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
ResourceArtifact  { kind: 'file', href, fileName?, contentType?, byteSize?, previewable }
                | { kind: 'external', href }
                | { kind: 'none' }
LibraryResource { id, title, type: ResourceType, summary, authors,
                  updatedAt, mins?, pages?, tags: string[], artifact, href? }
```

`updatedAt` ("Aug 12") is a display string. `mins` is the age in minutes and is
the **only** sort key the Newest/Oldest toggle uses — omit it and ordering is
undefined. `type` drives the chip colour and the corner glyph, so send one of
the seven values above. New resource actions use `artifact`: PDFs, images, and
safe text formats use native renderers selected from `contentType` (with
`fileName` extension as a fallback). Server-approved HTML is fetched with the
same scoped credentials and parsed into a native document made from React Native
text, view, list, table, code, and image components. HTML links are inert, and
scripts, forms, iframes, canvas, arbitrary source CSS, media players, and other
browser-only content are omitted. Supported embedded images may receive bearer
credentials only when their resolved URL is a configured GPFA origin under
`/api/content-assets/`; credentials never cross origins. Unsupported or
conflicting formats use the native save/share sheet.
All files can be downloaded to temporary cache, and external links open through
the operating system without GPFA credentials. Bearer credentials are attached
only to configured GPFA origins whose path begins `/api/content-assets/`.
`href` remains a compatibility field for older callers and must not drive new
authenticated file actions.

### `PodcastPerson`, `PodcastEpisode`

```ts
PodcastPerson  { name: string; role: string; initials? }
PodcastEpisode { slug, title, date, mins?, duration, durationSeconds,
                 summary, hasTranscript, transcriptUrl?, audioUrl?, audioExpiresAt?,
                 peaks?: number[], people: PodcastPerson[] }
```

Return `/api/members/podcasts` **newest first** — the screen features `[0]` as the New
episode and never re-sorts it. `duration` is display ("38 min");
`durationSeconds` is what the transport, the resume label and the waveform fill
read, so both are required. `peaks` contain at most 48 amplitudes in 0–1; when
absent the app draws a stable set seeded from `slug`. `initials` is derived
from `name` when omitted.

`audioUrl` is the existing playback contract; mobile does not request a second
playback endpoint. The authenticated catalog replaces private podcast assets
with short-lived, object-scoped Supabase Storage URLs and supplies their
`audioExpiresAt`. Signed, public, and external HTTPS URLs are passed to
`expo-audio` without GPFA credentials. Relative `/api/content-assets/:assetId`
URLs remain a compatibility path and receive the stored bearer token through
`AudioSource.headers` only when the resolved origin exactly matches the
configured API origin. A token must never be attached to redirects, Supabase
Storage, or third-party hosts, and the resolved source object must never be
logged or persisted.

Playback uses one provider-owned native `expo-audio` player with background and
lock-screen controls. A play request replaces the source once and queues native
playback while the remote source prepares; lock-screen setup is best-effort and
must not block foreground playback. Per-episode resume positions are stored in
AsyncStorage; signed URLs, tokens, and audio source headers remain in memory
only. Signed Storage startup and seeking must be verified with byte-range
responses on physical iOS and Android devices.

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
                   countryCode?, city?, members, workingGroups?, blurb?, logoUrl? }
DirectoryPerson  { id, orgId, name, role, initials?, photoUrl? }
```

An organization carries three names, each with its own job: `name` is what the
index lists and sorts by (however the membership writes it — "HOOPP", but "Abu
Dhabi Investment Authority"); `fullName` is the formal one on the profile
masthead and defaults to `name`; `short` is the acronym in the profile's meta
line, `"HOOPP · TORONTO, CANADA"`. `countryCode` and `city` are optional because
the current member organization summary route does not return them. `sector` is
normalized at the repository boundary to one of the four literals so it always
picks a directory rule colour.

`members` is the headcount shown in the index row and the profile stat. It is
**authoritative and independent of `/directory/people`** — send 7 while
publishing 5 profiles and the screen shows both without contradicting itself.
`workingGroups` is an optional stat only; nothing joins it to `/groups`. The
current organization summary route does not return it, so mobile omits that stat.

The profile's **Open roles** stat and its Jobs tab both come from `/jobs`,
matched client-side: a listing belongs to an organization when its `org` equals
that org's `name`, `short`, or `fullName`, case-insensitively. Keep those
strings identical across the two endpoints or the roles will not appear.

`logoUrl` and `photoUrl` must be **raster** (PNG/JPG) — React Native's `Image`
cannot decode SVG, so an `.svg` URL renders as an empty box. Both are optional
and fall back to initials.

### Messaging types

```ts
MessagingParticipant { id, name, avatarUrl, roleTitle, organizationName,
                       isCurrentMember, isAvailable, hasLeft }
MessageItem           { id, conversationId, senderId, content, clientNonce,
                       ordinal, createdAt, editedAt, kind, reactions }
ConversationSummary   { id, kind, title, participants, lastMessage,
                       lastMessageAt, lastReaction, lastReadOrdinal, unreadCount }
ConversationDetail    { id, kind, title, participants, lastReadOrdinal }
```

Direct conversations contain exactly two active participants. Group
conversations contain three to eight active participants. The mobile UI can
read existing group conversations but its first compose flow starts direct
conversations with one searched directory member. `createdAt` values are ISO
timestamps, `editedAt` is an ISO timestamp or null, and `ordinal` is the stable
server ordering/read-cursor key.

### `NewPostInput`, Ask GPFA, `FeedEntry`, `RsvpChoice`

```ts
NewPostInput { groupId: string; type: PostType; title: string; body: string }
AskConversationSummary { id: string; title: string; updatedAt: string }
AskMessage   { id: string; role: 'user' | 'ai'; text: string;
               createdAt: string; sources: AskSource[]; sourceState?: AskSourceState }
AskConversationPage { conversation: AskConversationSummary; messages: AskMessage[];
                      hasEarlier: boolean; earlierCursor: string | null }
AskAnswer    { text: string; sources: AskSource[]; sourceState?: AskSourceState;
               conversationId?: string;
               conversation?: AskConversationSummary; userMessage?: AskMessage;
               assistantMessage?: AskMessage }
FeedEntry    { post: Thread; groupId: string }
RsvpChoice   'yes' | 'no'
```

---

## 6. What the client does, so your server doesn't have to

These are client-side where the table says so. Working-group activity controls
are server-backed because that feed is cursor-paginated.

| Behaviour | Where |
| --- | --- |
| Working group search (name) | `GroupsScreen.tsx` |
| Splitting the directory into subscribed / not | `GroupsScreen.tsx` |
| Working group directory sort: recommended, active, members, A-Z | `GroupsScreen.tsx` |
| Per-group search, type, status, and sort | Server-backed through `/api/members/working-groups/:slug/feed`; applied state lives in `App.tsx` |
| A group's topics list | Derived from the currently loaded canonical page in `groups/GroupView.tsx`; it is not presented as a complete feed count |
| One-level reply nesting, from `parentPostId` | `groups/PostDetail.tsx` |
| Working-group mention autocomplete and highlighting | `groups/MentionInput.tsx` |
| Poll answer draft | held in `App.tsx` until every question is answered; no partial server write |
| Poll percentages | supplied by canonical nested results and rendered per question |
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
7. **Event composition remains limited.** Poll composition supports multiple
  questions with two to eight options each; event composition still has only
  the currently exposed date/location fields.
8. **Saved is read-only.** The member profile lists `GET /me/saved`, but nothing
   adds to or removes from it — the library has no bookmark control, and the
   post bookmark writes to `/posts/:id/save`, a different list. Wiring it means
   a `POST`/`DELETE /me/saved/:id` pair and a toggle on the profile row.
9. **Session data is memory-only.** Optimistic state (`pollAnswerDrafts`,
   `upvoted`, `rsvps`, `extraReplies`, `newPosts`) lives in `App.tsx` and resets
   on reload. Poll answer drafts are intentionally not persisted until final
   submission. Server state is the source of truth after a refetch.

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
  requests use **75s** (`AI_REQUEST_TIMEOUT_MS`) because retrieval and model
  generation can take longer than ordinary JSON endpoints, and the server's
  60-second execution budget still needs native transport headroom. The stream timeout
  and caller abort signal remain attached until response-body consumption ends.
  A `401` retry is allowed only before body consumption starts.
- Read failures on Home and Groups render `DataGate`'s retry screen. Working-
  group mutation failures roll back where appropriate and render an accessible
  error notice with the server message.

---

## 10. Mutation semantics

Safe toggles remain **optimistic with rollback**. Non-idempotent writes preserve
member input until the request succeeds. Operation/target pending keys prevent
duplicate working-group writes, and every working-group success or failure
produces visible feedback.

| Action | Optimistic effect | On failure |
| --- | --- | --- |
| Create post | Prepended to feed, `mins: 0` | Removed |
| Reply | Shown optimistically while uploading/posting | Draft and selected files stay in the composer; canonical detail is refetched after success because create does not return a reply id |
| Delete own reply | Canonical reply is removed | Canonical detail is refetched and the server message is shown |
| Upvote | Count ±1, icon turns green | Reverted |
| Repost | Repeat icon turns green, label becomes "Reposted", count increases | Reverted |
| Subscribe | Group moves between directory sections | Reverted |
| Vote | Option selected, percentages shown | Cleared |
| RSVP | Button state changes | Reverted to previous |
| Poll edit/close/delete | Controls show a pending state; destructive actions require confirmation | Editor input is preserved for `400`/`409`; server message is shown |

Implications for your server:

- **Be idempotent where you can.** Double-taps happen.
- The member reply route currently returns only `{ status, message }`, so the
  app refetches canonical item detail after posting to obtain the reply id.
- **Enforce one-vote-per-org server-side.** The client guard is UX, not security.
- Treat client visibility and disabled controls as UX only. Every route must
  continue to authenticate, authorize, and validate the mutation.

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
