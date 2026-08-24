/**
 * Where the app gets its data.
 *
 * Set EXPO_PUBLIC_API_URL to point at a backend; leave it unset and the app
 * runs on the local fixtures. Expo inlines EXPO_PUBLIC_* variables at build
 * time, so this is a build-time switch — restart the dev server after changing
 * it. See .env.example.
 *
 * Note the value must be reachable *from the phone*: `localhost` resolves to
 * the device itself, so use the machine's LAN address or a tunnel in dev.
 */
const raw = process.env.EXPO_PUBLIC_API_URL ?? '';

const rawWebOrigin = process.env.EXPO_PUBLIC_GPFA_WEB_ORIGIN ?? '';

const rawFixturePortalData = process.env.EXPO_PUBLIC_FIXTURE_PORTAL_DATA ?? '';

/** Base URL with any trailing slash removed, or '' when unset. */
export const API_BASE_URL = raw.trim().replace(/\/+$/, '');

/** Web app origin used by the member sign-in route when needed by backend auth. */
export const GPFA_WEB_ORIGIN = rawWebOrigin.trim().replace(/\/+$/, '');

/** Host used for member auth routes. */
export const AUTH_BASE_URL = GPFA_WEB_ORIGIN || API_BASE_URL;

/** True once a backend is configured; false means fixtures. */
export const USING_REMOTE_API = API_BASE_URL.length > 0;

/** True when auth is remote but portal screens should keep using fixtures. */
export const USING_FIXTURE_PORTAL_DATA = rawFixturePortalData.trim().toLowerCase() === 'true';

/** Abort a request that hasn't responded in this long. */
export const REQUEST_TIMEOUT_MS = 15000;

/** Ask GPFA can spend longer retrieving context and generating an answer. */
export const AI_REQUEST_TIMEOUT_MS = 60000;

/**
 * Paths are collected here so a backend whose routes differ can be adapted in
 * one place rather than across the call sites.
 */
export const ROUTES = {
  login: '/api/members/sign-in',
  logout: '/auth/logout',
  session: '/auth/session',
  notifications: '/api/members/notifications',
  notificationsRead: '/api/members/notifications/read',
  notificationsDismiss: '/api/members/notifications/dismiss',
  workingGroups: '/api/members/working-groups',
  workingGroupMembership: (slug: string) => `/api/members/working-groups/${slug}/membership`,
  workingGroupCoLeads: (slug: string) => `/api/members/working-groups/${slug}/co-leads`,
  workingGroupFeed: (slug: string) => `/api/members/working-groups/${slug}/feed`,
  workingGroupFeedItem: (slug: string, itemType: string, itemId: string) =>
    `/api/members/working-groups/${slug}/feed/items/${itemType}/${itemId}`,
  workingGroupTagUsage: (slug: string) => `/api/members/working-groups/${slug}/tag-usage`,
  workingGroupSubscription: (slug: string) => `/api/members/working-groups/${slug}/subscription`,
  workingGroupResourceSubmissions: (slug: string) =>
    `/api/members/working-groups/${slug}/resource-submissions`,
  workingGroupResourceUploadPrepare: (slug: string) =>
    `/api/members/working-groups/${slug}/resource-submissions/uploads/prepare`,
  workingGroupResourceUploadFinalize: (slug: string) =>
    `/api/members/working-groups/${slug}/resource-submissions/uploads/finalize`,
  workingGroupEventRsvp: '/api/members/working-groups/events/rsvp',
  forumThreads: '/api/members/forum/threads',
  forumThread: (threadId: string) => `/api/members/forum/threads/${threadId}`,
  forumThreadStatus: (threadId: string) => `/api/members/forum/threads/${threadId}/status`,
  forumReplies: '/api/members/forum/replies',
  forumReply: (replyId: string) => `/api/members/forum/replies/${replyId}`,
  forumUploadsPrepare: '/api/members/forum/uploads/prepare',
  forumUploadsFinalize: '/api/members/forum/uploads/finalize',
  forumSummarize: '/api/members/forum/summarize',
  memberPolls: '/api/members/polls',
  memberPoll: (id: string) => `/api/members/polls/${id}`,
  memberPollVote: '/api/members/polls/vote',
  memberUpvotes: '/api/members/upvotes',
  memberSavedContent: '/api/members/saved-content',
  memberDirectory: '/api/members/directory',
  askStream: '/api/members/knowledge/messages/stream',
  me: '/api/members/profile',
  savedResources: '/me/saved',
  groups: '/groups',
  nextEvent: '/events/next',
  feed: '/posts',
  news: '/api/members/news',
  ask: '/ask',
  library: '/api/members/resources',
  podcasts: '/podcasts',
  jobs: '/api/members/job-postings',
  directoryOrgs: '/directory/orgs',
  directoryPeople: '/directory/people',
  podcastTranscript: (slug: string) => `/podcasts/${slug}/transcript`,
  post: (id: string) => `/posts/${id}`,
  replies: (id: string) => `/posts/${id}/replies`,
  upvote: (id: string) => `/posts/${id}/upvote`,
  save: (id: string) => `/posts/${id}/save`,
  subscribe: (groupId: string) => `/groups/${groupId}/subscribe`,
  vote: (id: string) => `/posts/${id}/vote`,
  rsvp: (id: string) => `/posts/${id}/rsvp`,
} as const;

/** Full sign-in URL, useful when validating Expo's inlined env on-device. */
export const SIGN_IN_URL = AUTH_BASE_URL ? `${AUTH_BASE_URL}${ROUTES.login}` : '';
