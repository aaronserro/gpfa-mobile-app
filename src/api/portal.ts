import { request } from './client';
import { ROUTES, USING_FIXTURE_PORTAL_DATA, USING_REMOTE_API } from './config';
import type {
  AskAnswer,
  CalendarEvent,
  DirectoryPerson,
  FeedEntry,
  ForumReplyInput,
  ForumSummarizeInput,
  ForumSummarizeResponse,
  ForumThreadCreateInput,
  ForumThreadStatusResponse,
  ForumThreadUpdateInput,
  ForumUploadFinalizeInput,
  ForumUploadFinalizeResponse,
  ForumUploadPrepareInput,
  ForumUploadPrepareResponse,
  Group,
  GroupMember,
  JobListing,
  LibraryResource,
  MemberContentListResponse,
  MemberContentMutationResponse,
  MemberContentQuery,
  MemberContentTargetInput,
  Member,
  MemberNotification,
  MemberPollCreateInput,
  MemberPollCreateResponse,
  MemberPollResponse,
  MemberPollsResponse,
  MemberPollUpdateInput,
  MemberPollVoteInput,
  MemberOrg,
  MessageResponse,
  NewPostInput,
  NewsStory,
  PodcastEpisode,
  RedirectResponse,
  Reply,
  RsvpChoice,
  StatusResponse,
  Thread,
  WorkingGroupMembership,
  WorkingGroupCoLead,
  WorkingGroupEventRsvpInput,
  WorkingGroupFeedItem,
  WorkingGroupFeedQuery,
  WorkingGroupFeedResponse,
  WorkingGroupResourceSubmissionInput,
  WorkingGroupResourceSubmissionResponse,
  WorkingGroupTagUsageResponse,
  WorkingGroupThreadFeed,
} from './types';
import type { WgRuleClass } from '../ds/tokens';
import {
  DIRECTORY_PEOPLE,
  findAnswer,
  GROUPS,
  JOBS,
  LIBRARY,
  MEMBER,
  MEMBER_ORGS,
  NEWS_STORIES,
  NEXT_EVENT,
  NOTIFICATIONS,
  PODCASTS,
  SAVED_RESOURCES,
  SUGGESTIONS,
} from '../data/fixtures';

/**
 * The one place that decides where portal data comes from.
 *
 * Every function returns a Promise whether or not a backend is configured, so
 * screens are written against async data from the start and nothing changes in
 * the UI when EXPO_PUBLIC_API_URL is set.
 *
 * When wiring a real backend, adapt responses here — if the server's field
 * names differ from src/api/types.ts, map them in these functions rather than
 * reshaping the UI.
 */

/** Fixtures resolve immediately but still asynchronously. */
const local = <T>(value: T): Promise<T> => Promise.resolve(value);

const USING_PORTAL_FIXTURES = !USING_REMOTE_API || USING_FIXTURE_PORTAL_DATA;

function workingGroupsRequireApi<T>(): Promise<T> {
  return Promise.reject(new Error('Working Groups require the member API. Configure EXPO_PUBLIC_API_URL to use this flow.'));
}

interface WorkingGroupsResponse {
  status: 'success';
  groups: WorkingGroupRow[];
  threads: WorkingGroupThreadSummary[];
  joinedSlugs: string[];
  home: {
    groups: Array<{ slug: string; href: string; name: string; unread: number | null }>;
    threads: WorkingGroupHomeThread[];
  };
}

interface WorkingGroupRow {
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
}

interface WorkingGroupThreadSummary {
  groupSlug: string;
  updatedAt: string;
  replies?: number;
  upvoteCount?: number;
}

interface WorkingGroupHomeThread {
  id: string;
  href: string;
  title: string;
  groupName: string;
  authorName: string;
  replies: number;
  age: string;
  unread: boolean;
  participants: Array<{ id: string; name: string; initials: string }>;
}

interface WorkingGroupMembershipResponse {
  status: 'success';
  membership: WorkingGroupMembership | null;
}

/** The signed-in member. Everything that shows "who am I" reads this. */
export function getMe(): Promise<Member> {
  if (USING_PORTAL_FIXTURES) return local(MEMBER);
  return request<Member>(ROUTES.me);
}

/**
 * What the member has bookmarked from the library, newest first — the profile's
 * Saved list. The screen does not re-sort it.
 */
export function getSavedResources(): Promise<LibraryResource[]> {
  if (USING_PORTAL_FIXTURES) return local(SAVED_RESOURCES);
  return request<LibraryResource[]>(ROUTES.savedResources);
}

/** Notifications for the signed-in member, newest first. */
export function getNotifications(): Promise<MemberNotification[]> {
  if (!USING_REMOTE_API) return local(NOTIFICATIONS);
  return request<unknown>(ROUTES.notifications).then(normalizeNotifications);
}

/** The Home calendar card. Resolve null to hide it. */
export function getNextEvent(): Promise<CalendarEvent | null> {
  if (USING_PORTAL_FIXTURES) return local(NEXT_EVENT);
  return request<CalendarEvent | null>(ROUTES.nextEvent);
}

export function getGroups(): Promise<Group[]> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<Group[]>();
  return request<WorkingGroupsResponse>(ROUTES.workingGroups).then(normalizeWorkingGroups);
}

export function getWorkingGroupMembership(slug: string): Promise<WorkingGroupMembership | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupMembership | null>();
  return request<WorkingGroupMembershipResponse>(ROUTES.workingGroupMembership(slug)).then(
    (res) => res.membership
  );
}

/**
 * Every post across every group, flattened. The fixtures nest posts inside
 * groups; a backend more likely returns a flat list, hence the shared shape.
 */
export function getFeed(): Promise<FeedEntry[]> {
  if (USING_PORTAL_FIXTURES) {
    return local(GROUPS.flatMap((g) => g.threads.map((post) => ({ post, groupId: g.id }))));
  }
  return request<FeedEntry[]>(ROUTES.feed);
}

/**
 * The News Radar, newest first. Serves both the News screen and the Home
 * digest — the digest picks the `radar` entries out of the same list.
 */
export function getNews(): Promise<NewsStory[]> {
  if (USING_PORTAL_FIXTURES) return local(NEWS_STORIES);
  return request<NewsStory[]>(ROUTES.news);
}

export function getLibrary(): Promise<LibraryResource[]> {
  if (USING_PORTAL_FIXTURES) return local(LIBRARY);
  return request<LibraryResource[]>(ROUTES.library);
}

/** Newest first — the screen features the first entry and never re-sorts it. */
export function getPodcasts(): Promise<PodcastEpisode[]> {
  if (USING_PORTAL_FIXTURES) return local(PODCASTS);
  return request<PodcastEpisode[]>(ROUTES.podcasts);
}

/** Open roles on the member job board. The screen sorts and filters them. */
export function getJobs(): Promise<JobListing[]> {
  if (USING_PORTAL_FIXTURES) return local(JOBS);
  return request<JobListing[]>(ROUTES.jobs);
}

/**
 * Member institutions, alphabetical by `name` — the directory index groups
 * consecutive entries by initial letter and never re-sorts them.
 */
export function getMemberOrgs(): Promise<MemberOrg[]> {
  if (USING_PORTAL_FIXTURES) return local(MEMBER_ORGS);
  return request<MemberOrg[]>(ROUTES.directoryOrgs);
}

/** Every named individual in the directory, flat. `orgId` joins to a MemberOrg. */
export function getDirectoryPeople(): Promise<DirectoryPerson[]> {
  if (USING_PORTAL_FIXTURES) return local(DIRECTORY_PEOPLE);
  return request<DirectoryPerson[]>(ROUTES.directoryPeople);
}

export function getAskSuggestions(): Promise<string[]> {
  if (USING_PORTAL_FIXTURES) return local(SUGGESTIONS);
  return request<string[]>(`${ROUTES.ask}/suggestions`);
}

export function askGpfa(question: string): Promise<AskAnswer> {
  if (USING_PORTAL_FIXTURES) {
    // Matches the design's 1100ms think before answering.
    return new Promise((resolve) => setTimeout(() => resolve(findAnswer(question)), 1100));
  }
  return request<AskAnswer>(ROUTES.ask, { method: 'POST', body: { question } });
}

/* ── mutations ───────────────────────────────────────────────────────────── */

/**
 * The caller applies these optimistically and keeps the result in session
 * state; against fixtures they are no-ops that resolve, so the UI behaves
 * identically either way.
 */

export function createPost(input: NewPostInput): Promise<Thread | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<Thread | null>();
  const groupSlug = input.groupSlug ?? input.groupId;
  if (input.type === 'poll') {
    return createMemberPoll({
      title: input.title,
      description: input.body || null,
      tags: input.tags,
      closesAt: input.closesAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      groupSlug,
      questions: [
        {
          text: input.pollQuestion?.trim() || input.title,
          options: (input.pollOptions?.filter((option) => option.trim().length > 0) ?? []).map(
            (label) => ({ label })
          ),
        },
      ],
    }).then(() => null);
  }
  return createForumThread({
    groupSlug,
    postType: input.type,
    title: input.title,
    body: input.body,
    tags: input.tags?.join(','),
    attachmentIds: input.attachmentIds,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    location: input.location,
    registrationUrl: input.registrationUrl,
    isVirtual: input.isVirtual,
  }).then(() => null);
}

export function createReply(
  postId: string,
  text: string,
  groupSlug?: string,
  parentPostId?: string | null
): Promise<Reply | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<Reply | null>();
  return createForumReply({
    threadId: postId,
    groupSlug: groupSlug ?? '',
    body: text,
    parentPostId,
  }).then(() => null);
}

export function setUpvote(targetId: string, upvoted: boolean, targetType = 'thread'): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  const body = { targetType, targetId };
  return (upvoted ? createMemberUpvote(body) : deleteMemberUpvote(body)).then(() => undefined);
}

/** Bookmark a post to the member's saved list. */
export function setSaved(targetId: string, saved: boolean, targetType = 'thread'): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  const body = { targetType, targetId };
  return (saved ? createMemberSavedContent(body) : deleteMemberSavedContent(body)).then(() => undefined);
}

/**
 * Upvote a reply. Replies without an `id` have no address, so the toggle stays
 * on the device and no request is made.
 */
export function setReplyUpvote(
  postId: string,
  replyId: string | undefined,
  upvoted: boolean
): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  if (!replyId) return workingGroupsRequireApi<void>();
  const body = { targetType: 'reply', targetId: replyId };
  return (upvoted ? createMemberUpvote(body) : deleteMemberUpvote(body)).then(() => undefined);
}

/** Subscribe to a working group's digest, or unsubscribe from it. */
export function setSubscribed(slug: string, subscribed: boolean): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  return request<void>(ROUTES.workingGroupSubscription(slug), {
    method: subscribed ? 'POST' : 'DELETE',
  });
}

export function getWorkingGroupCoLeads(slug: string): Promise<WorkingGroupCoLead[]> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupCoLead[]>();
  return request<{ status: 'success'; members: WorkingGroupCoLead[] }>(
    ROUTES.workingGroupCoLeads(slug)
  ).then((res) => res.members);
}

export function getWorkingGroupCoLeadMembers(slug: string): Promise<GroupMember[]> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<GroupMember[]>();
  return getWorkingGroupCoLeads(slug).then((members) =>
    members.map((member) => ({
      name: member.name,
      role: member.role,
      org: member.organization,
      initials: member.initials,
      isLead: true,
    }))
  );
}

export function getWorkingGroupFeed(
  slug: string,
  query: WorkingGroupFeedQuery = {}
): Promise<WorkingGroupFeedResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupFeedResponse>();
  return request<WorkingGroupFeedResponse>(`${ROUTES.workingGroupFeed(slug)}${queryString(query)}`);
}

export function getWorkingGroupThreadFeed(
  slug: string,
  groupId: string,
  query: WorkingGroupFeedQuery = {}
): Promise<WorkingGroupThreadFeed> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupThreadFeed>();
  return getWorkingGroupFeed(slug, query).then((res) => ({
    items: res.items.map((item) => ({ post: workingGroupFeedItemToThread(item), groupId })),
    nextCursor: res.nextCursor,
    totalMatching: res.totalMatching,
  }));
}

export function getWorkingGroupFeedItem(
  slug: string,
  itemType: string,
  itemId: string
): Promise<WorkingGroupFeedItem | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupFeedItem | null>();
  return request<{ status: 'success'; item: WorkingGroupFeedItem }>(
    ROUTES.workingGroupFeedItem(slug, itemType, itemId)
  ).then((res) => res.item);
}

export function getWorkingGroupTagUsage(
  slug: string,
  query: { query?: string; limit?: number } = {}
): Promise<WorkingGroupTagUsageResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupTagUsageResponse>();
  return request<WorkingGroupTagUsageResponse>(`${ROUTES.workingGroupTagUsage(slug)}${queryString(query)}`);
}

export function submitWorkingGroupResource(
  slug: string,
  input: WorkingGroupResourceSubmissionInput
): Promise<WorkingGroupResourceSubmissionResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupResourceSubmissionResponse | null>();
  return request<WorkingGroupResourceSubmissionResponse>(ROUTES.workingGroupResourceSubmissions(slug), {
    method: 'POST',
    body: input,
  });
}

export function setWorkingGroupEventRsvp(input: WorkingGroupEventRsvpInput): Promise<MessageResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MessageResponse | null>();
  return request<MessageResponse>(ROUTES.workingGroupEventRsvp, { method: 'POST', body: input });
}

export function createForumThread(input: ForumThreadCreateInput): Promise<RedirectResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<RedirectResponse | null>();
  return request<RedirectResponse>(ROUTES.forumThreads, { method: 'POST', body: input });
}

export function updateForumThread(threadId: string, input: ForumThreadUpdateInput): Promise<StatusResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<StatusResponse | null>();
  return request<StatusResponse>(ROUTES.forumThread(threadId), { method: 'PATCH', body: input });
}

export function deleteForumThread(threadId: string): Promise<StatusResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<StatusResponse | null>();
  return request<StatusResponse>(ROUTES.forumThread(threadId), { method: 'DELETE' });
}

export function updateForumThreadStatus(
  threadId: string,
  input: { status: 'open' | 'answered' | 'closed' }
): Promise<ForumThreadStatusResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<ForumThreadStatusResponse | null>();
  return request<ForumThreadStatusResponse>(ROUTES.forumThreadStatus(threadId), { method: 'PATCH', body: input });
}

export function createForumReply(input: ForumReplyInput): Promise<MessageResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MessageResponse | null>();
  return request<MessageResponse>(ROUTES.forumReplies, { method: 'POST', body: input });
}

export function deleteForumReply(replyId: string): Promise<StatusResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<StatusResponse | null>();
  return request<StatusResponse>(ROUTES.forumReply(replyId), { method: 'DELETE' });
}

export function prepareForumUpload(input: ForumUploadPrepareInput): Promise<ForumUploadPrepareResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<ForumUploadPrepareResponse | null>();
  return request<ForumUploadPrepareResponse>(ROUTES.forumUploadsPrepare, { method: 'POST', body: input });
}

export function finalizeForumUpload(input: ForumUploadFinalizeInput): Promise<ForumUploadFinalizeResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<ForumUploadFinalizeResponse | null>();
  return request<ForumUploadFinalizeResponse>(ROUTES.forumUploadsFinalize, { method: 'POST', body: input });
}

export function summarizeForum(input: ForumSummarizeInput): Promise<ForumSummarizeResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<ForumSummarizeResponse | null>();
  return request<ForumSummarizeResponse>(ROUTES.forumSummarize, { method: 'POST', body: input });
}

export function getMemberPolls(query: { groupSlug?: string } = {}): Promise<MemberPollsResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberPollsResponse>();
  return request<MemberPollsResponse>(`${ROUTES.memberPolls}${queryString(query)}`);
}

export function createMemberPoll(input: MemberPollCreateInput): Promise<MemberPollCreateResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberPollCreateResponse | null>();
  return request<MemberPollCreateResponse>(ROUTES.memberPolls, { method: 'POST', body: input });
}

export function getMemberPoll(id: string): Promise<MemberPollResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberPollResponse | null>();
  return request<MemberPollResponse>(ROUTES.memberPoll(id));
}

export function updateMemberPoll(id: string, input: MemberPollUpdateInput): Promise<StatusResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<StatusResponse | null>();
  return request<StatusResponse>(ROUTES.memberPoll(id), { method: 'PUT', body: input });
}

export function deleteMemberPoll(id: string): Promise<StatusResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<StatusResponse | null>();
  return request<StatusResponse>(ROUTES.memberPoll(id), { method: 'DELETE' });
}

export function voteMemberPoll(input: MemberPollVoteInput): Promise<MessageResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MessageResponse | null>();
  return request<MessageResponse>(ROUTES.memberPollVote, { method: 'POST', body: input });
}

export function getMemberUpvotes(query: MemberContentQuery = {}): Promise<MemberContentListResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberContentListResponse>();
  return request<MemberContentListResponse>(`${ROUTES.memberUpvotes}${queryString(query)}`);
}

export function createMemberUpvote(input: MemberContentTargetInput): Promise<MemberContentMutationResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberContentMutationResponse | null>();
  return request<MemberContentMutationResponse>(ROUTES.memberUpvotes, { method: 'POST', body: input });
}

export function deleteMemberUpvote(input: MemberContentTargetInput): Promise<MemberContentMutationResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberContentMutationResponse | null>();
  return request<MemberContentMutationResponse>(ROUTES.memberUpvotes, { method: 'DELETE', body: input });
}

export function getMemberSavedContent(query: MemberContentQuery = {}): Promise<MemberContentListResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberContentListResponse>();
  return request<MemberContentListResponse>(`${ROUTES.memberSavedContent}${queryString(query)}`);
}

export function createMemberSavedContent(
  input: MemberContentTargetInput
): Promise<MemberContentMutationResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberContentMutationResponse | null>();
  return request<MemberContentMutationResponse>(ROUTES.memberSavedContent, { method: 'POST', body: input });
}

export function deleteMemberSavedContent(
  input: MemberContentTargetInput
): Promise<MemberContentMutationResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberContentMutationResponse | null>();
  return request<MemberContentMutationResponse>(ROUTES.memberSavedContent, { method: 'DELETE', body: input });
}

export function castVote(
  pollId: string,
  option: number,
  details?: { groupSlug?: string; questionId?: string; optionId?: string }
): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  if (!details?.questionId || !details.optionId) return workingGroupsRequireApi<void>();
  return voteMemberPoll({
    pollId,
    groupSlug: details.groupSlug,
    answers: [{ questionId: details.questionId, optionId: details.optionId }],
  }).then(() => undefined);
}

export function setRsvp(postId: string, choice: RsvpChoice, groupSlug?: string): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  if (!groupSlug) return workingGroupsRequireApi<void>();
  return setWorkingGroupEventRsvp({
    threadId: postId,
    groupSlug,
    status: choice === 'yes' ? 'attending' : 'not_attending',
  }).then(() => undefined);
}

function normalizeWorkingGroups(payload: WorkingGroupsResponse): Group[] {
  if (!payload || payload.status !== 'success' || !Array.isArray(payload.groups)) return [];

  const joined = new Set(payload.joinedSlugs ?? []);
  const homeUnread = new Map((payload.home?.groups ?? []).map((g) => [g.slug, g.unread ?? 0]));
  const homeThreads = payload.home?.threads ?? [];

  return payload.groups.map((row, index) => {
    const threadSummaries = (payload.threads ?? []).filter((t) => t.groupSlug === row.slug);
    const threads = mergeGroupThreads(row, homeThreads, threadSummaries);
    const unread = row.unread ?? homeUnread.get(row.slug) ?? 0;

    return {
      id: row.slug,
      slug: row.slug,
      n: row.name,
      short: shortGroupName(row.name),
      cls: groupRuleClass(row, index),
      unread,
      meta: row.description || `${unread} unread`,
      memberCount: row.members,
      members: [],
      joined: row.memberRole === 'member' || row.memberRole === 'co_lead' || joined.has(row.slug),
      threads,
    } satisfies Group;
  });
}

function queryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

function workingGroupFeedItemToThread(item: WorkingGroupFeedItem): Thread {
  const record = item as unknown as Record<string, unknown>;
  const type = item.postType;
  const targetType = type === 'discussion' ? 'thread' : type;
  const created = Date.parse(item.createdAt);
  const mins = Number.isFinite(created) ? Math.max(0, Math.round((Date.now() - created) / 60000)) : undefined;
  const authorOrg = item.author.organizationAbbreviation ?? item.author.organization ?? item.groupName;

  return {
    id: item.id,
    groupSlug: item.groupSlug,
    targetType,
    type,
    title: item.title,
    author: item.author.name,
    initials: initialsFromName(item.author.name),
    org: authorOrg,
    time: item.dateLabel,
    state: item.lifecycle === 'closed' ? 'Closed' : item.lifecycle === 'resolved' ? 'Answered' : undefined,
    lifecycle: item.lifecycle,
    body: item.excerpt ?? '',
    poll:
      type === 'poll'
        ? {
            id: item.id,
            q: item.title,
            closes: item.closedAt ? 'Closed' : item.closesAt ?? 'Open',
            options: [],
          }
        : undefined,
    eventRows:
      type === 'event'
        ? [
            ...(item.startsAtLabel ? [{ icon: 'calendar' as const, text: item.startsAtLabel }] : []),
            ...(item.location ? [{ icon: 'pin' as const, text: item.location }] : []),
            ...(item.isVirtual ? [{ icon: 'people' as const, text: 'Virtual' }] : []),
          ]
        : undefined,
    upvotes: item.upvoteCount,
    mins,
    tags: item.tags,
    canEdit: booleanFrom(record.canEdit, record.viewerCanEdit, record.canManage),
    canDelete: booleanFrom(record.canDelete, record.viewerCanDelete, record.canManage),
    canChangeStatus: booleanFrom(record.canChangeStatus, record.viewerCanChangeStatus, record.canManage),
    replies: [],
  };
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function booleanFrom(...values: unknown[]): boolean | undefined {
  const value = values.find((candidate) => typeof candidate === 'boolean');
  return typeof value === 'boolean' ? value : undefined;
}

function mergeGroupThreads(
  row: WorkingGroupRow,
  homeThreads: WorkingGroupHomeThread[],
  summaries: WorkingGroupThreadSummary[]
): Thread[] {
  const groupHomeThreads = homeThreads.filter((thread) => slugify(thread.groupName) === slugify(row.name));
  const summaryByIndex = summaries.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const mappedHomeThreads = groupHomeThreads.map((thread, index): Thread => {
    return {
      id: thread.id,
      groupSlug: row.slug,
      targetType: 'thread',
      type: 'discussion',
      title: thread.title,
      author: thread.authorName,
      initials: thread.participants[0]?.initials,
      org: row.leadLabel || row.name,
      time: thread.age,
      mins: index,
      upvotes: summaryByIndex[index]?.upvoteCount ?? 0,
      body: row.description || 'Open this working group for the latest member discussion.',
      replies: [],
      tags: row.topic ? [row.topic] : undefined,
    };
  });

  return mappedHomeThreads;
}

function groupRuleClass(row: WorkingGroupRow, index: number): WgRuleClass {
  const key = `${row.slug} ${row.name} ${row.topic ?? ''} ${row.color}`.toLowerCase();
  if (key.includes('legal')) return 'wg-rule-legal';
  if (key.includes('risk')) return 'wg-rule-risk';
  if (key.includes('tech')) return 'wg-rule-technology';
  if (key.includes('collateral') || key.includes('liquidity')) return 'wg-rule-collateral-liquidity';
  if (key.includes('private')) return 'wg-rule-private-credit';
  if (key.includes('regional')) return 'wg-rule-regional';

  const classes: WgRuleClass[] = [
    'wg-rule-collateral-liquidity',
    'wg-rule-legal',
    'wg-rule-technology',
    'wg-rule-risk',
    'wg-rule-private-credit',
    'wg-rule-regional',
    'wg-rule-general',
  ];
  return classes[index % classes.length];
}

function shortGroupName(name: string): string {
  return name
    .replace(/\s*&\s*/g, ' & ')
    .split(/\s+/)
    .slice(0, 3)
    .join(' ');
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeNotifications(payload: unknown): MemberNotification[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).notifications)
      ? ((payload as Record<string, unknown>).notifications as unknown[])
      : [];

  return rows.map(normalizeNotification).filter((n): n is MemberNotification => n !== null);
}

function normalizeNotification(row: unknown, index: number): MemberNotification | null {
  if (typeof row === 'string') return { id: `notification-${index}`, title: row, read: false };
  if (!row || typeof row !== 'object') return null;

  const record = row as Record<string, unknown>;
  const title = firstString(record.title, record.subject, record.message, record.text);
  if (!title) return null;

  const kind = firstString(record.kind, record.type);
  const body = firstString(record.body, record.description, record.detail);
  const time = firstString(record.time, record.created_at, record.createdAt, record.date);
  const href = firstString(record.navigation_href, record.href, record.url, record.link);
  const targetType = firstString(record.target_type, record.targetType);
  const targetId = firstString(record.target_id, record.targetId);
  const contentType = firstString(record.content_type, record.contentType);
  const contentId = firstString(record.content_id, record.contentId);
  const contentDeletedAt = nullableString(record.content_deleted_at, record.contentDeletedAt);
  const read =
    typeof record.read === 'boolean'
      ? record.read
      : typeof record.isRead === 'boolean'
        ? record.isRead
        : typeof record.readAt === 'string';

  return {
    id: firstString(record.id, record._id, record.uuid) ?? `notification-${index}`,
    ...(kind ? { kind } : {}),
    title,
    ...(body ? { body } : {}),
    ...(time ? { time } : {}),
    read,
    ...(href ? { href } : {}),
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId } : {}),
    ...(contentType ? { contentType } : {}),
    ...(contentId ? { contentId } : {}),
    ...(contentDeletedAt !== undefined ? { contentDeletedAt } : {}),
  };
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim();
}

function nullableString(...values: unknown[]): string | null | undefined {
  const value = values.find((v) => v === null || typeof v === 'string');
  return typeof value === 'string' ? value.trim() : value;
}
