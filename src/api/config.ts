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

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const rawSupabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Base URL with any trailing slash removed, or '' when unset. */
export const API_BASE_URL = raw.trim().replace(/\/+$/, '');

/** Web app origin used by the member sign-in route when needed by backend auth. */
export const GPFA_WEB_ORIGIN = rawWebOrigin.trim().replace(/\/+$/, '');

/** Host used for member auth routes. */
export const AUTH_BASE_URL = GPFA_WEB_ORIGIN || API_BASE_URL;

const FORGOT_PASSWORD_PATH = '/forgot-password';

export type ForgotPasswordUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'missing_origin' | 'invalid_origin' | 'insecure_origin' };

function normalizedPrefillEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length === 0 ||
    normalized.length > 320 ||
    /[\s\u0000-\u001f\u007f]/.test(normalized) ||
    !/^[^@]+@[^@]+\.[^@]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

/** Builds the browser-only recovery page URL from a trusted configured origin. */
export function buildForgotPasswordUrl(
  baseUrl: string,
  email = '',
  allowInsecureHttp = false
): ForgotPasswordUrlResult {
  const configuredOrigin = baseUrl.trim();
  if (!configuredOrigin) return { ok: false, reason: 'missing_origin' };

  let origin: URL;
  try {
    origin = new URL(configuredOrigin);
  } catch {
    return { ok: false, reason: 'invalid_origin' };
  }

  if (
    origin.username ||
    origin.password ||
    (origin.pathname !== '/' && origin.pathname !== '') ||
    origin.search ||
    origin.hash
  ) {
    return { ok: false, reason: 'invalid_origin' };
  }
  if (origin.protocol !== 'https:' && !(allowInsecureHttp && origin.protocol === 'http:')) {
    return { ok: false, reason: 'insecure_origin' };
  }

  const destination = new URL(FORGOT_PASSWORD_PATH, `${origin.origin}/`);
  const normalizedEmail = normalizedPrefillEmail(email);
  if (normalizedEmail) destination.searchParams.set('email', normalizedEmail);
  return { ok: true, url: destination.toString() };
}

export function forgotPasswordUrl(email = ''): ForgotPasswordUrlResult {
  return buildForgotPasswordUrl(AUTH_BASE_URL, email, __DEV__);
}

/** Supabase Auth host used only for token refresh and current-session revocation. */
export const SUPABASE_URL = rawSupabaseUrl.trim().replace(/\/+$/, '');

/** Public client key sent to Supabase Auth. This is safe to embed in the app. */
export const SUPABASE_PUBLISHABLE_KEY = rawSupabasePublishableKey.trim();

/** True once a backend is configured; false means fixtures. */
export const USING_REMOTE_API = API_BASE_URL.length > 0;

/** True when auth is remote but portal screens should keep using fixtures. */
export const USING_FIXTURE_PORTAL_DATA = rawFixturePortalData.trim().toLowerCase() === 'true';

/** Abort a request that hasn't responded in this long. */
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * Ask GPFA's server route can run for 60 seconds. Leave transport headroom so
 * native clients do not abort while the completed answer is being persisted.
 */
export const AI_REQUEST_TIMEOUT_MS = 75000;

/**
 * Paths are collected here so a backend whose routes differ can be adapted in
 * one place rather than across the call sites.
 */
export const ROUTES = {
  login: '/api/members/sign-in',
  notifications: '/api/members/notifications',
  notificationsRead: '/api/members/notifications/read',
  notificationsDismiss: '/api/members/notifications/dismiss',
  homeImmediateActions: '/api/members/home/immediate-actions',
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
  workingGroupResourceModeration: '/api/admin/resource-submissions',
  workingGroupResourceModerationStatus: (submissionId: string) =>
    `/api/admin/resource-submissions/${submissionId}/status`,
  workingGroupEventRsvp: '/api/members/working-groups/events/rsvp',
  forumThreads: '/api/members/forum/threads',
  forumThread: (threadId: string) => `/api/members/forum/threads/${threadId}`,
  forumThreadStatus: (threadId: string) => `/api/members/forum/threads/${threadId}/status`,
  forumReplies: '/api/members/forum/replies',
  forumReply: (replyId: string) => `/api/members/forum/replies/${replyId}`,
  forumUploadsPrepare: '/api/members/forum/uploads/prepare',
  forumUploadsFinalize: '/api/members/forum/uploads/finalize',
  forumSummarize: '/api/members/forum/summarize',
  forumReports: '/api/members/forum/reports',
  forumReport: (reportId: string) => `/api/members/forum/reports/${encodeURIComponent(reportId)}`,
  forumModerationRemove: '/api/members/forum/moderation/remove',
  memberPolls: '/api/members/polls',
  memberPoll: (id: string) => `/api/members/polls/${id}`,
  memberPollVote: '/api/members/polls/vote',
  memberUpvotes: '/api/members/upvotes',
  memberMentions: '/api/members/mentions',
  memberEmailPreferences: '/api/members/email-preferences',
  memberSkills: '/api/members/skills',
  memberHandle: '/api/members/profile/handle',
  memberAvatar: '/api/members/avatar',
  memberAvatarPrepare: '/api/members/avatar/prepare',
  memberAvatarFinalize: '/api/members/avatar/finalize',
  memberAvatarLinkedIn: '/api/members/avatar/linkedin',
  memberChangePassword: '/api/members/change-password',
  memberSavedContent: '/api/members/saved-content',
  memberDirectory: '/api/members/directory',
  memberBlocks: '/api/members/blocks',
  memberBlock: (targetMemberId: string) =>
    `/api/members/blocks/${encodeURIComponent(targetMemberId)}`,
  messageConversations: '/api/members/messages',
  message: (messageId: string) =>
    `/api/members/messages/${encodeURIComponent(messageId)}`,
  messageConversation: (conversationId: string) =>
    `/api/members/messages/conversations/${conversationId}`,
  messageConversationRead: (conversationId: string) =>
    `/api/members/messages/conversations/${conversationId}/read`,
  messageConversationMembers: (conversationId: string) =>
    `/api/members/messages/conversations/${conversationId}/members`,
  messageConversationLeave: (conversationId: string) =>
    `/api/members/messages/conversations/${conversationId}/leave`,
  messageConversationTitle: (conversationId: string) =>
    `/api/members/messages/conversations/${conversationId}/title`,
  directMessageConversation: (memberId: string) =>
    `/api/members/messages/direct/${memberId}`,
  groupMessageConversation: '/api/members/messages/group',
  sendMessage: '/api/members/messages/send',
  messageReactions: '/api/members/messages/reactions',
  askConversations: '/api/members/knowledge/conversations',
  askConversation: (conversationId: string) =>
    `/api/members/knowledge/conversations/${conversationId}`,
  askStream: '/api/members/knowledge/messages/stream',
  me: '/api/members/profile',
  savedResources: '/me/saved',
  groups: '/groups',
  nextEvent: '/events/next',
  feed: '/posts',
  news: '/api/members/news',
  events: '/api/members/events',
  eventRsvp: '/api/members/events/rsvp',
  updates: '/api/members/announcements',
  surveyResponse: (id: string) => `/api/members/surveys/${id}/response`,
  annualMeeting: '/api/members/annual-meeting',
  annualMeetingRegistration: '/api/members/annual-meeting/registration',
  ask: '/ask',
  library: '/api/members/resources',
  podcasts: '/api/members/podcasts?waveform=mobile',
  jobs: '/api/members/job-postings',
  directoryOrgs: '/api/members/directory/organizations',
  directoryPeople: '/api/members/directory?limit=500',
  directoryMember: (mentionHandle: string) =>
    `/api/members/directory/${encodeURIComponent(mentionHandle)}`,
  directoryMemberProfile: (memberId: string) =>
    `/api/members/directory/profiles/${encodeURIComponent(memberId)}`,
  directoryMemberProfileActivity: (memberId: string, kind: string, page: number) =>
    `/api/members/directory/profiles/${encodeURIComponent(memberId)}/activity?kind=${encodeURIComponent(kind)}&page=${page}`,
  podcastTranscript: (slug: string) => `/api/members/podcasts/${slug}/transcript`,
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
