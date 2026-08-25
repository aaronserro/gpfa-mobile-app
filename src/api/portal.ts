import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { request, requestStream } from './client';
import { API_BASE_URL, GPFA_WEB_ORIGIN, ROUTES, USING_FIXTURE_PORTAL_DATA, USING_REMOTE_API } from './config';
import type {
  AskAnswer,
  AddConversationMembersResponse,
  CalendarEvent,
  ConversationDetailResponse,
  ConversationListResponse,
  DirectoryPerson,
  DirectConversationResponse,
  FeedEntry,
  ForumAttachment,
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
  ForumUploadFile,
  Group,
  GroupConversationResponse,
  GroupMember,
  JobListing,
  LibraryResource,
  MemberContentListResponse,
  MemberContentMutationResponse,
  MemberContentQuery,
  MemberContentTargetInput,
  MemberContentTargetType,
  MemberRepost,
  Member,
  MemberNotification,
  MemberPollCreateInput,
  MemberPollCreateResponse,
  MemberPollResponse,
  MemberPollsResponse,
  MemberPollUpdateInput,
  MemberPollVoteInput,
  MemberOrg,
  MessagingParticipant,
  MessageItem,
  MessageReaction,
  MessageReactionInput,
  MessageReactionResponse,
  MessageWindowQuery,
  MessageResponse,
  NewPostInput,
  NewsStory,
  PodcastEpisode,
  Poll,
  PollOption,
  Relevance,
  RedirectResponse,
  RenameConversationResponse,
  Reply,
  ResourceHubData,
  ResourceType,
  RsvpChoice,
  SendMessageInput,
  SendMessageResponse,
  LeaveConversationResponse,
  StatusResponse,
  Thread,
  WorkingGroupMembership,
  WorkingGroupCoLead,
  WorkingGroupEventRsvpInput,
  WorkingGroupDetailAttachment,
  WorkingGroupDetailReply,
  WorkingGroupFeedItem,
  WorkingGroupFeedItemResponse,
  WorkingGroupFeedQuery,
  WorkingGroupFeedResponse,
  WorkingGroupResourceSubmissionInput,
  WorkingGroupResourceSubmissionResponse,
  WorkingGroupResourceUploadFinalizeInput,
  WorkingGroupResourceUploadFinalizeResponse,
  WorkingGroupResourceUploadPrepareInput,
  WorkingGroupResourceUploadPrepareResponse,
  WorkingGroupTagUsageResponse,
  WorkingGroupThreadFeed,
} from './types';
import type { OrgSector, WgRuleClass } from '../ds/tokens';
import {
  DIRECTORY_PEOPLE,
  findAnswer,
  GROUPS,
  JOBS,
  LIBRARY,
  MEMBER,
  MEMBER_ORGS,
  MESSAGE_CONVERSATIONS,
  MESSAGE_ITEMS,
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

// Private messaging must follow the authenticated member backend whenever it
// exists; mixing remote identities with fixture conversations is unsafe.
const USING_MESSAGE_FIXTURES = !USING_REMOTE_API;

let fixtureMessageConversations = MESSAGE_CONVERSATIONS.map(cloneConversation);
const fixtureMessageItems: Record<string, MessageItem[]> = Object.fromEntries(
  Object.entries(MESSAGE_ITEMS).map(([id, messages]) => [id, messages.map(cloneMessage)])
);

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

interface MemberDirectoryResponse {
  status: 'success';
  members: MemberDirectoryRow[];
}

interface MemberDirectoryRow {
  id: string;
  name: string;
  role: string;
  organization: string;
  initials?: string;
  photo?: string;
  orgId?: string;
  orgSlug?: string;
}

interface DirectoryOrganizationsResponse {
  status: 'success';
  organizations: DirectoryOrganizationRow[];
}

interface DirectoryOrganizationRow {
  id: string;
  slug: string;
  abbreviation: string;
  name: string;
  country: string;
  sector: string;
  description?: string;
  memberCount: number;
}

interface CurrentMemberResponse {
  status: 'success';
  member: Member;
}

/** The signed-in member. Everything that shows "who am I" reads this. */
export function getMe(): Promise<Member> {
  if (!USING_REMOTE_API) return local(MEMBER);
  return request<CurrentMemberResponse>(ROUTES.me).then((response) => response.member);
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

export function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (!notificationIds.length) return local(undefined);
  if (!USING_REMOTE_API) return local(undefined);
  return request<MessageResponse>(ROUTES.notificationsRead, {
    method: 'POST',
    body: { notificationIds },
  }).then(() => undefined);
}

export function dismissNotifications(notificationIds: string[]): Promise<void> {
  if (!notificationIds.length) return local(undefined);
  if (!USING_REMOTE_API) return local(undefined);
  return request<MessageResponse>(ROUTES.notificationsDismiss, {
    method: 'POST',
    body: { notificationIds },
  }).then(() => undefined);
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
  return request<unknown>(ROUTES.news).then(normalizeNewsStories);
}

export function getLibrary(): Promise<ResourceHubData> {
  if (!USING_REMOTE_API) {
    return local({
      resources: LIBRARY,
      newsRadar: NEWS_STORIES.filter((story) => story.kind === 'radar'),
    });
  }
  return request<unknown>(ROUTES.library).then(normalizeResourceHubData);
}

export function getWorkingGroupResources(slug: string, groupId?: string): Promise<LibraryResource[]> {
  if (!USING_REMOTE_API) {
    return local(LIBRARY.filter((resource) => resourceMatchesWorkingGroup(resource, slug, groupId)));
  }
  return request<unknown>(ROUTES.workingGroupResourceSubmissions(slug)).then(normalizeLibraryResources);
}

/** Newest first — the screen features the first entry and never re-sorts it. */
export function getPodcasts(): Promise<PodcastEpisode[]> {
  if (USING_PORTAL_FIXTURES) return local(PODCASTS);
  return request<PodcastEpisode[]>(ROUTES.podcasts);
}

/** Open roles on the member job board. The screen sorts and filters them. */
export function getJobs(): Promise<JobListing[]> {
  if (!USING_REMOTE_API) return local(JOBS);
  return request<unknown>(`${ROUTES.jobs}${queryString({ pageSize: 100 })}`).then(normalizeJobListings);
}

/**
 * Member institutions, alphabetical by `name` — the directory index groups
 * consecutive entries by initial letter and never re-sorts them.
 */
export function getMemberOrgs(): Promise<MemberOrg[]> {
  if (!USING_REMOTE_API) return local(MEMBER_ORGS);
  return request<DirectoryOrganizationsResponse>(ROUTES.directoryOrgs).then((response) =>
    response.organizations.map(directoryOrganizationToMemberOrg)
  );
}

/** Every named individual in the directory, flat. `orgId` joins to a MemberOrg. */
export function getDirectoryPeople(): Promise<DirectoryPerson[]> {
  if (!USING_REMOTE_API) return local(DIRECTORY_PEOPLE);
  return request<MemberDirectoryResponse>(ROUTES.directoryPeople).then((response) =>
    response.members.flatMap((member) => {
      // Organization cards are keyed by slug. Profiles without one remain out
      // of the organization roster rather than being attached to the wrong org.
      if (!member.orgSlug) return [];
      return [{
        id: member.id,
        orgId: member.orgSlug,
        name: member.name,
        role: member.role,
        initials: member.initials,
        photoUrl: member.photo,
      }];
    })
  );
}

export function getMessageConversations(): Promise<ConversationListResponse> {
  if (USING_MESSAGE_FIXTURES) {
    return local({
      status: 'success',
      conversations: fixtureMessageConversations.map(cloneConversation),
      totalUnread: fixtureMessageConversations.reduce((total, item) => total + item.unreadCount, 0),
    });
  }
  return request<ConversationListResponse>(ROUTES.messageConversations);
}

export function getMessageConversation(
  conversationId: string,
  query: MessageWindowQuery = { limit: 50 }
): Promise<ConversationDetailResponse> {
  if (USING_MESSAGE_FIXTURES) {
    const summary = fixtureMessageConversations.find((item) => item.id === conversationId);
    if (!summary) return Promise.reject(new Error('Conversation unavailable.'));
    const allMessages = fixtureMessageItems[conversationId] ?? [];
    const limit = Math.min(50, Math.max(1, query.limit ?? 50));
    const eligible = allMessages.filter((message) =>
      query.beforeOrdinal !== undefined
        ? message.ordinal < query.beforeOrdinal
        : query.afterOrdinal !== undefined
          ? message.ordinal > query.afterOrdinal
          : true
    );
    const window = query.afterOrdinal !== undefined
      ? eligible.slice(0, limit)
      : eligible.slice(Math.max(0, eligible.length - limit));
    const messages = window.map(cloneMessage);
    return local({
      status: 'success',
      conversation: {
        id: summary.id,
        kind: summary.kind,
        title: summary.title,
        participants: summary.participants.map((participant) => ({ ...participant })),
        lastReadOrdinal: summary.lastReadOrdinal,
      },
      messages,
      latestOrdinal: allMessages.at(-1)?.ordinal ?? 0,
    });
  }
  return request<ConversationDetailResponse>(
    `${ROUTES.messageConversation(conversationId)}${queryString(query)}`
  );
}

export function resolveDirectMessageConversation(memberId: string): Promise<DirectConversationResponse> {
  if (USING_MESSAGE_FIXTURES) {
    const existing = fixtureMessageConversations.find(
      (conversation) =>
        conversation.kind === 'direct' &&
        conversation.participants.some((participant) => participant.id === memberId)
    );
    const person = DIRECTORY_PEOPLE.find((candidate) => candidate.id === memberId);
    if (!person) return Promise.reject(new Error('Member unavailable.'));
    const org = MEMBER_ORGS.find((candidate) => candidate.id === person.orgId);
    return local({
      status: 'success',
      conversationId: existing?.id ?? null,
      recipient: directoryPersonToMessagingParticipant(person, org?.short ?? null),
    });
  }
  return request<DirectConversationResponse>(ROUTES.directMessageConversation(memberId));
}

export function resolveGroupMessageConversation(
  participantIds: string[]
): Promise<GroupConversationResponse> {
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.length < 2 || uniqueIds.length > 7) {
    return Promise.reject(new Error('Choose between two and seven members for a group message.'));
  }
  if (USING_MESSAGE_FIXTURES) {
    const expected = [...uniqueIds].sort().join(',');
    const existing = fixtureMessageConversations.find((conversation) => {
      if (conversation.kind !== 'group') return false;
      const actual = conversation.participants
        .filter((participant) => !participant.isCurrentMember && !participant.hasLeft)
        .map((participant) => participant.id)
        .sort()
        .join(',');
      return actual === expected;
    });
    return local({ status: 'success', conversationId: existing?.id ?? null });
  }
  return request<GroupConversationResponse>(
    `${ROUTES.groupMessageConversation}${queryString({ to: uniqueIds.join(',') })}`
  );
}

export function sendMemberMessage(input: SendMessageInput): Promise<SendMessageResponse> {
  const content = input.content.replace(/\r\n/g, '\n').trim();
  if (!content || content.length > 4_000) {
    return Promise.reject(new Error('Messages must be between 1 and 4,000 characters.'));
  }
  if (!USING_MESSAGE_FIXTURES) {
    return request<SendMessageResponse>(ROUTES.sendMessage, { method: 'POST', body: { ...input, content } });
  }

  const selectedPeople = (input.participantIds ?? []).map((participantId) =>
    DIRECTORY_PEOPLE.find((candidate) => candidate.id === participantId)
  );
  const conversationId = input.conversationId ?? `conversation-${Date.now()}`;
  let summary = fixtureMessageConversations.find((item) => item.id === conversationId);
  const conversationCreated = !summary;

  if (!summary) {
    if (!selectedPeople.length || selectedPeople.some((person) => !person)) {
      return Promise.reject(new Error('Choose available members to message.'));
    }
    const participants = selectedPeople.map((person) => {
      const selected = person!;
      const org = MEMBER_ORGS.find((candidate) => candidate.id === selected.orgId);
      return directoryPersonToMessagingParticipant(selected, org?.short ?? null);
    });
    summary = {
      id: conversationId,
      kind: participants.length === 1 ? 'direct' : 'group',
      title: null,
      participants: [
        currentMemberMessagingParticipant(),
        ...participants,
      ],
      lastMessage: null,
      lastMessageAt: new Date().toISOString(),
      lastReaction: null,
      lastReadOrdinal: 0,
      unreadCount: 0,
    };
    fixtureMessageConversations = [summary, ...fixtureMessageConversations];
    fixtureMessageItems[conversationId] = [];
  }

  const messages = fixtureMessageItems[conversationId] ?? [];
  const message: MessageItem = {
    id: `message-${Date.now()}`,
    conversationId,
    senderId: MEMBER.id,
    content,
    clientNonce: input.clientNonce,
    ordinal: (messages.at(-1)?.ordinal ?? 0) + 1,
    createdAt: new Date().toISOString(),
    kind: 'text',
    reactions: [],
  };
  messages.push(message);
  fixtureMessageItems[conversationId] = messages;
  fixtureMessageConversations = fixtureMessageConversations
    .map((item) =>
      item.id === conversationId
        ? { ...item, lastMessage: message, lastMessageAt: message.createdAt, lastReadOrdinal: message.ordinal }
        : item
    )
    .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt));

  return local({ status: 'success', conversationId, conversationCreated, message: cloneMessage(message) });
}

export function markMessageConversationRead(conversationId: string, lastReadOrdinal: number): Promise<void> {
  if (USING_MESSAGE_FIXTURES) {
    fixtureMessageConversations = fixtureMessageConversations.map((item) =>
      item.id === conversationId ? { ...item, lastReadOrdinal, unreadCount: 0 } : item
    );
    return local(undefined);
  }
  return request(ROUTES.messageConversationRead(conversationId), {
    method: 'POST',
    body: { lastReadOrdinal },
  }).then(() => undefined);
}

export function setMessageReaction(input: MessageReactionInput): Promise<MessageReactionResponse> {
  if (!USING_MESSAGE_FIXTURES) {
    return request<MessageReactionResponse>(ROUTES.messageReactions, {
      method: 'POST',
      body: input,
    });
  }

  for (const [conversationId, messages] of Object.entries(fixtureMessageItems)) {
    const message = messages.find((candidate) => candidate.id === input.messageId);
    if (!message) continue;
    message.reactions = updateFixtureReaction(message.reactions, input.emoji, input.active);
    return local({ status: 'success', conversationId, ...input });
  }
  return Promise.reject(new Error('Message unavailable.'));
}

export function addMessageConversationMembers(
  conversationId: string,
  participantIds: string[]
): Promise<AddConversationMembersResponse> {
  if (!USING_MESSAGE_FIXTURES) {
    return request<AddConversationMembersResponse>(ROUTES.messageConversationMembers(conversationId), {
      method: 'POST',
      body: { participantIds },
    });
  }

  const summary = fixtureMessageConversations.find((item) => item.id === conversationId);
  if (!summary || summary.kind !== 'group') {
    return Promise.reject(new Error('Group conversation unavailable.'));
  }
  const existingIds = new Set(summary.participants.map((participant) => participant.id));
  const added = participantIds
    .filter((participantId) => !existingIds.has(participantId))
    .map((participantId) => DIRECTORY_PEOPLE.find((person) => person.id === participantId));
  if (added.some((person) => !person)) return Promise.reject(new Error('Member unavailable.'));
  summary.participants = [
    ...summary.participants,
    ...added.map((person) => {
      const selected = person!;
      const org = MEMBER_ORGS.find((candidate) => candidate.id === selected.orgId);
      return directoryPersonToMessagingParticipant(selected, org?.short ?? null);
    }),
  ];
  return local({ status: 'success', conversationId, participantIds });
}

export function leaveMessageConversation(conversationId: string): Promise<LeaveConversationResponse> {
  if (!USING_MESSAGE_FIXTURES) {
    return request<LeaveConversationResponse>(ROUTES.messageConversationLeave(conversationId), {
      method: 'DELETE',
    });
  }
  const summary = fixtureMessageConversations.find((item) => item.id === conversationId);
  if (!summary || summary.kind !== 'group') {
    return Promise.reject(new Error('Group conversation unavailable.'));
  }
  fixtureMessageConversations = fixtureMessageConversations.filter((item) => item.id !== conversationId);
  return local({ status: 'success', conversationId });
}

export function renameMessageConversation(
  conversationId: string,
  title: string
): Promise<RenameConversationResponse> {
  if (!USING_MESSAGE_FIXTURES) {
    return request<RenameConversationResponse>(ROUTES.messageConversationTitle(conversationId), {
      method: 'PATCH',
      body: { title },
    });
  }
  const summary = fixtureMessageConversations.find((item) => item.id === conversationId);
  if (!summary || summary.kind !== 'group') {
    return Promise.reject(new Error('Group conversation unavailable.'));
  }
  const normalized = title.trim();
  summary.title = normalized || null;
  return local({ status: 'success', conversationId, title: summary.title });
}

export function getWorkingGroupDirectoryMembers(slug: string): Promise<GroupMember[]> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<GroupMember[]>();
  return request<MemberDirectoryResponse>(
    `${ROUTES.memberDirectory}${queryString({ workingGroupSlug: slug, limit: 500 })}`
  ).then((res) => res.members.map(directoryRowToGroupMember));
}

export function getAskSuggestions(): Promise<string[]> {
  return local(SUGGESTIONS);
}

export function askGpfa(question: string, conversationId?: string): Promise<AskAnswer> {
  if (!USING_REMOTE_API) {
    // Matches the design's 1100ms think before answering.
    return new Promise((resolve) => setTimeout(() => resolve(findAnswer(question)), 1100));
  }
  return requestStream(ROUTES.askStream, { body: { conversationId, message: question } }).then(askAnswerFromStream);
}

function cloneMessage(message: MessageItem): MessageItem {
  return { ...message, reactions: message.reactions.map((reaction) => ({ ...reaction })) };
}

function updateFixtureReaction(
  reactions: MessageItem['reactions'],
  emoji: MessageReaction,
  active: boolean
): MessageItem['reactions'] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing && !active) return reactions;
  if (!existing) return [...reactions, { emoji, count: 1, reactedByCurrentMember: true }];
  const count = Math.max(0, existing.count + (active ? 1 : -1));
  return count === 0
    ? reactions.filter((reaction) => reaction.emoji !== emoji)
    : reactions.map((reaction) =>
        reaction.emoji === emoji
          ? { ...reaction, count, reactedByCurrentMember: active }
          : reaction
      );
}

function cloneConversation(
  conversation: ConversationListResponse['conversations'][number]
): ConversationListResponse['conversations'][number] {
  return {
    ...conversation,
    participants: conversation.participants.map((participant) => ({ ...participant })),
    lastMessage: conversation.lastMessage ? cloneMessage(conversation.lastMessage) : null,
    lastReaction: conversation.lastReaction ? { ...conversation.lastReaction } : null,
  };
}

function directoryPersonToMessagingParticipant(
  person: DirectoryPerson,
  organizationName: string | null
): MessagingParticipant {
  return {
    id: person.id,
    name: person.name,
    avatarUrl: person.photoUrl ?? null,
    roleTitle: person.role || null,
    organizationName,
    isCurrentMember: false,
    isAvailable: true,
    hasLeft: false,
  };
}

function currentMemberMessagingParticipant(): MessagingParticipant {
  return {
    id: MEMBER.id,
    name: MEMBER.name,
    avatarUrl: null,
    roleTitle: MEMBER.role ?? null,
    organizationName: MEMBER.org,
    isCurrentMember: true,
    isAvailable: true,
    hasLeft: false,
  };
}

function directoryOrganizationToMemberOrg(organization: DirectoryOrganizationRow): MemberOrg {
  return {
    id: organization.slug,
    name: organization.name,
    fullName: organization.name,
    short: organization.abbreviation,
    sector: directoryOrgSector(organization.sector),
    country: organization.country,
    members: organization.memberCount,
    blurb: organization.description,
  };
}

function directoryOrgSector(value: string): OrgSector {
  const normalized = value.toLowerCase();
  if (normalized.includes('pension') || normalized.includes('superannuation')) {
    return 'Pension Fund';
  }
  if (normalized.includes('sovereign')) return 'Sovereign Wealth Fund';
  if (normalized.includes('insurance')) return 'Insurance Asset Manager';
  return 'Asset Manager';
}

/* ── mutations ───────────────────────────────────────────────────────────── */

/**
 * The caller applies these optimistically and keeps the result in session
 * state; against fixtures they are no-ops that resolve, so the UI behaves
 * identically either way.
 */

export async function createPost(input: NewPostInput): Promise<Thread | null> {
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
  const uploadedAttachmentIds = await uploadForumFiles(groupSlug, input.files ?? []);
  const created = await createForumThread({
    groupSlug,
    postType: input.type,
    title: input.title,
    body: input.body,
    tags: input.tags?.join(','),
    attachmentIds: [...(input.attachmentIds ?? []), ...uploadedAttachmentIds],
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    location: input.location,
    registrationUrl: input.registrationUrl,
    isVirtual: input.isVirtual,
  });
  const threadId = created?.redirectTo.split('/').filter(Boolean).at(-1);
  if (!threadId) return null;

  const detail = await getWorkingGroupFeedItemDetail(groupSlug, input.type, threadId);
  return workingGroupFeedItemResponseToEntry(detail, input.groupId).post;
}

export function createReply(
  postId: string,
  text: string,
  groupSlug?: string,
  parentPostId?: string | null,
  files: ForumUploadFile[] = []
): Promise<Reply | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<Reply | null>();
  const resolvedGroupSlug = groupSlug ?? '';
  return uploadForumFiles(resolvedGroupSlug, files).then((attachmentIds) =>
    createForumReply({
      threadId: postId,
      groupSlug: resolvedGroupSlug,
      body: text,
      parentPostId,
      attachmentIds,
    }).then(() => ({
      a: '',
      org: '',
      time: '',
      text,
      attachments: attachmentIds.map((id, index) => ({
        id,
        name: files[index]?.name ?? 'Attachment',
        contentType: files[index]?.mimeType,
        byteSize: files[index]?.size,
        href: absoluteResourceHref(`/api/content-assets/${id}`),
      })),
    }))
  );
}

export function setUpvote(
  targetId: string,
  upvoted: boolean,
  targetType: MemberContentTargetType = 'thread'
): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  const body = { targetType, targetId };
  return (upvoted ? createMemberUpvote(body) : deleteMemberUpvote(body)).then(() => undefined);
}

/** Add or remove a post from the member's reposts. */
export function setReposted(
  targetId: string,
  reposted: boolean,
  targetType: MemberContentTargetType = 'thread'
): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  const body = { targetType, targetId };
  return (reposted ? createMemberSavedContent(body) : deleteMemberSavedContent(body)).then(() => undefined);
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
    snapshotAt: res.snapshotAt,
    totalMatching: res.totalMatching,
  }));
}

export function getWorkingGroupFeedItem(
  slug: string,
  itemType: string,
  itemId: string
): Promise<WorkingGroupFeedItem | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupFeedItem | null>();
  return getWorkingGroupFeedItemDetail(slug, itemType, itemId).then((res) => res.item);
}

export function getWorkingGroupFeedItemDetail(
  slug: string,
  itemType: string,
  itemId: string
): Promise<WorkingGroupFeedItemResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupFeedItemResponse>();
  return request<WorkingGroupFeedItemResponse>(
    ROUTES.workingGroupFeedItem(slug, itemType, itemId)
  );
}

export function workingGroupFeedItemResponseToEntry(
  response: WorkingGroupFeedItemResponse,
  groupId: string
): FeedEntry {
  const post = workingGroupFeedItemToThread(response.item);
  const detail = response.detail;

  if (detail.kind === 'thread') {
    const thread = detail.thread as Record<string, unknown>;
    const attachments = detail.thread.attachments ?? [];
    const firstAttachment = attachments[0];

    return {
      groupId,
      post: {
        ...post,
        title: firstString(thread.title) ?? post.title,
        body: firstString(thread.body) ?? post.body,
        upvotes: numberFrom(thread.upvoteCount, post.upvotes),
        attachments: attachments.map(workingGroupDetailAttachmentToForumAttachment),
        file: firstAttachment ? attachmentTitle(firstAttachment) : post.file,
        fileMeta: firstAttachment ? attachmentMeta(firstAttachment) : post.fileMeta,
        canReply: detail.permissions.canReply,
        canEdit: detail.permissions.canEdit,
        canDelete: detail.permissions.canDelete,
        canChangeStatus: detail.permissions.canChangeStatus,
        replies: detail.replies.map(workingGroupDetailReplyToReply),
      },
    };
  }

  const poll = detail.poll as Record<string, unknown>;
  return {
    groupId,
    post: {
      ...post,
      title: firstString(poll.title) ?? post.title,
      body: firstString(poll.description, poll.body) ?? post.body,
      upvotes: numberFrom(poll.upvoteCount, post.upvotes),
      poll: workingGroupPollDetailToPoll(detail, post.poll),
      canReply: detail.permissions.canReply,
      canEdit: detail.permissions.canEdit,
      canDelete: detail.permissions.canDelete,
      canChangeStatus: detail.permissions.canChangeStatus,
      replies: [],
    },
  };
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
  return uploadWorkingGroupResourceFiles(slug, input.files ?? []).then((attachmentIds) =>
    request<WorkingGroupResourceSubmissionResponse>(ROUTES.workingGroupResourceSubmissions(slug), {
      method: 'POST',
      body: workingGroupResourceSubmissionFormData(input, attachmentIds),
    })
  );
}

export function prepareWorkingGroupResourceUpload(
  slug: string,
  input: WorkingGroupResourceUploadPrepareInput
): Promise<WorkingGroupResourceUploadPrepareResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupResourceUploadPrepareResponse | null>();
  return request<WorkingGroupResourceUploadPrepareResponse>(ROUTES.workingGroupResourceUploadPrepare(slug), {
    method: 'POST',
    body: input,
  });
}

export function finalizeWorkingGroupResourceUpload(
  slug: string,
  input: WorkingGroupResourceUploadFinalizeInput
): Promise<WorkingGroupResourceUploadFinalizeResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupResourceUploadFinalizeResponse | null>();
  return request<WorkingGroupResourceUploadFinalizeResponse>(ROUTES.workingGroupResourceUploadFinalize(slug), {
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
  return request<RedirectResponse>(ROUTES.forumThreads, { method: 'POST', body: forumThreadFormData(input) });
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

export async function uploadForumFiles(groupSlug: string, files: ForumUploadFile[]): Promise<string[]> {
  const assetIds: string[] = [];

  for (const file of files) {
    const body = new File(file.uri);
    if (!body.exists) throw new Error(`The file ${file.name} could not be read.`);
    const byteSize = file.size && file.size > 0 ? file.size : body.size;
    const contentType = file.mimeType || body.type || 'application/octet-stream';
    if (byteSize <= 0) throw new Error(`The file ${file.name} is empty.`);

    const prepared = await prepareForumUpload({
      groupSlug,
      fileName: file.name,
      contentType,
      byteSize,
    });
    if (!prepared?.signedUrl || !prepared.assetId) {
      throw new Error('The upload target is missing required details.');
    }

    const uploadResponse = await expoFetch(prepared.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': prepared.expectedContentType || contentType },
      body,
    });
    if (!uploadResponse.ok) throw new Error(`Uploading ${file.name} to storage failed.`);

    const finalized = await finalizeForumUpload({
      groupSlug,
      assetId: prepared.assetId,
      fileName: file.name,
      contentType: prepared.expectedContentType || contentType,
      byteSize: prepared.expectedByteSize || byteSize,
    });
    if (!finalized?.assetId) throw new Error(`The file ${file.name} could not be finalized.`);
    assetIds.push(finalized.assetId);
  }

  return assetIds;
}

export function summarizeForum(input: ForumSummarizeInput): Promise<ForumSummarizeResponse | null> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<ForumSummarizeResponse | null>();
  const form = new FormData();
  form.append('threadId', input.threadId);
  form.append('groupSlug', input.groupSlug);
  return request<ForumSummarizeResponse>(ROUTES.forumSummarize, { method: 'POST', body: form });
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

/**
 * Load every visible repost for the signed-in member and hydrate it with the
 * existing WG feed contract. Saved-content intentionally returns references,
 * so resolving cards stays in the mobile repository rather than changing the
 * web route solely for a native presentation concern.
 */
export async function getMemberReposts(groups: Group[]): Promise<MemberRepost[]> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<MemberRepost[]>();

  const savedRows = await getAllMemberSavedContent();
  if (savedRows.length === 0) return [];

  const savedByTarget = new Map(
    savedRows.map((row) => [`${row.target_type}:${row.target_id}`, row] as const)
  );
  const resolved = new Map<string, MemberRepost>();

  await Promise.all(
    groups.map(async (group) => {
      const slug = group.slug ?? group.id;
      let cursor: string | undefined;
      let snapshotAt: string | undefined;
      const seenCursors = new Set<string>();

      do {
        const page = await getWorkingGroupFeed(slug, {
          type: 'all',
          status: 'any',
          sort: 'newest',
          limit: 50,
          cursor,
          snapshotAt,
        });
        snapshotAt = page.snapshotAt;

        for (const item of page.items) {
          const targetType: MemberContentTargetType =
            item.postType === 'discussion' ? 'thread' : item.postType;
          const saved = savedByTarget.get(`${targetType}:${item.id}`);
          if (!saved) continue;

          resolved.set(saved.id, {
            id: saved.id,
            repostedAt: saved.created_at,
            groupName: item.groupName,
            entry: { post: workingGroupFeedItemToThread(item), groupId: group.id },
          });
        }

        if (resolved.size === savedRows.length || !page.nextCursor) break;
        if (seenCursors.has(page.nextCursor)) {
          throw new Error(`The repost feed for ${slug} returned a repeated cursor.`);
        }
        seenCursors.add(page.nextCursor);
        cursor = page.nextCursor;
      } while (cursor);
    })
  );

  return savedRows
    .map((row) => resolved.get(row.id))
    .filter((repost): repost is MemberRepost => repost !== undefined);
}

async function getAllMemberSavedContent(): Promise<MemberContentListResponse['items']> {
  const limit = 100;
  const rows: MemberContentListResponse['items'] = [];

  for (let offset = 0; ; offset += limit) {
    const page = await getMemberSavedContent({ limit, offset });
    rows.push(...page.items);
    if (page.items.length < limit) return rows;
  }
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

async function askAnswerFromStream(response: Response): Promise<AskAnswer> {
  const events = parseServerSentEvents(await responseStreamText(response));
  let streamedText = '';
  let finalAnswer: AskAnswer | null = null;
  let conversationId: string | undefined;

  for (const event of events) {
    const type = firstString(event.data.type, event.event);

    if (type === 'ready') {
      conversationId = firstString(event.data.conversationId) ?? conversationId;
      continue;
    }

    if (type === 'text_delta') {
      streamedText += firstString(event.data.text) ?? '';
      continue;
    }

    if (type === 'done') {
      const answer = recordFrom(event.data.answer);
      finalAnswer = {
        text: firstString(answer.content, answer.text) ?? streamedText,
        sources: sourceLabels(answer.sources),
        ...(conversationId ? { conversationId } : {}),
      };
      continue;
    }

    if (type === 'persisted') {
      const conversation = recordFrom(event.data.conversation);
      const message = recordFrom(event.data.assistantMessage);
      conversationId = firstString(conversation.id) ?? conversationId;
      finalAnswer = {
        text: firstString(message.text, message.content) ?? finalAnswer?.text ?? streamedText,
        sources: sourceLabels(message.sources),
        ...(conversationId ? { conversationId } : {}),
      };
      continue;
    }

    if (type === 'error') {
      throw new Error(firstString(event.data.message) ?? 'Ask GPFA could not answer.');
    }
  }

  const text = finalAnswer?.text?.trim() || streamedText.trim();
  if (!text) throw new Error('Ask GPFA did not return an answer.');
  return { text, sources: finalAnswer?.sources ?? [], ...(conversationId ? { conversationId } : {}) };
}

async function responseStreamText(response: Response): Promise<string> {
  const reader = response.body?.getReader?.();
  if (!reader || typeof TextDecoder === 'undefined') return response.text();

  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function parseServerSentEvents(text: string): Array<{ event?: string; data: Record<string, unknown> }> {
  return text
    .split(/\n\n+/)
    .map((chunk) => {
      const event = firstString(
        chunk
          .split(/\n/)
          .find((line) => line.startsWith('event:'))
          ?.slice('event:'.length)
          .trim()
      );
      const dataText = chunk
        .split(/\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trimStart())
        .join('\n');
      const data = safeRecordJson(dataText);
      return data ? { ...(event ? { event } : {}), data } : null;
    })
    .filter((event): event is { event?: string; data: Record<string, unknown> } => event !== null);
}

function safeRecordJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    return recordFrom(JSON.parse(text));
  } catch {
    return null;
  }
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function sourceLabels(value: unknown): string[] {
  return arrayOfRecords(value)
    .map((source) => firstString(source.label, source.title))
    .filter((label): label is string => !!label);
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
      cardImageUrl: row.cardImageUrl,
      unread,
      meta: row.description || `${unread} unread`,
      memberCount: row.members,
      members: [],
      joined: row.memberRole === 'member' || row.memberRole === 'co_lead' || joined.has(row.slug),
      threads,
    } satisfies Group;
  });
}

function directoryRowToGroupMember(member: MemberDirectoryRow): GroupMember {
  return {
    name: member.name,
    role: member.role,
    org: member.organization,
    initials: member.initials ?? initialsFromName(member.name),
  };
}

function normalizeNewsStories(payload: unknown): NewsStory[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).items)
      ? ((payload as Record<string, unknown>).items as unknown[])
      : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).articles)
        ? ((payload as Record<string, unknown>).articles as unknown[])
        : [];

  return rows.map(normalizeNewsStory).filter((story): story is NewsStory => story !== null);
}

function normalizeNewsStory(row: unknown, index: number): NewsStory | null {
  if (!row || typeof row !== 'object') return null;

  const record = row as Record<string, unknown>;
  const title = firstString(record.title, record.name);
  if (!title) return null;

  const kind = firstString(record.kind) === 'gpfa' ? 'gpfa' : 'radar';
  const topics = arrayOfStrings(record.topics);
  const topic = firstString(record.topic, topics[0]) ?? 'Markets';
  const sourceName =
    firstString(
      record.sourceName,
      record.source_name,
      record.sourceLabel,
      record.source_label,
      record.source,
    ) ?? (kind === 'gpfa' ? 'GPFA' : 'News Radar');
  const dateLabel = firstString(
    record.publishedAt,
    record.published_at,
    record.date,
    record.updatedAt,
    record.updated_at,
  );
  const body =
    firstString(
      record.body,
      record.summary,
      record.excerpt,
      record.whyItMatters,
      record.why_it_matters,
    ) ?? '';
  const imageUrl = firstString(record.imageUrl, record.image_url);
  const url = absoluteResourceHref(
    firstString(record.url, record.externalUrl, record.external_url, record.href, record.link),
  );
  const threads = numberFrom(record.threads, record.threadCount, record.thread_count);
  const rel = relevanceFrom(record.relevance, record.rel);

  return {
    id: firstString(record.id, record._id, record.uuid, record.slug) ?? `story-${index}`,
    kind,
    topic,
    title,
    meta: [sourceName, dateLabel].filter(Boolean).join(' · ').toUpperCase(),
    body,
    ...(rel ? { rel } : {}),
    tag: firstString(record.tickerTag, record.ticker_tag, record.tag) ?? shortTopicTag(topic),
    ...(imageUrl ? { imageUrl } : {}),
    ...(url ? { url } : {}),
    ...(kind === 'radar'
      ? {
          ticker:
            firstString(record.ticker, record.tickerTag, record.ticker_tag, record.sourceName, record.source_name) ??
            sourceName,
        }
      : {}),
    ...(threads !== undefined ? { threads } : {}),
    ...(kind === 'gpfa'
      ? { chip: firstString(record.chip, record.articleType, record.article_type, record.type) ?? 'GPFA' }
      : {}),
    ...(kind === 'gpfa' && topics.length ? { topics } : {}),
    ...(kind === 'gpfa' && typeof record.isMemberOnly === 'boolean'
      ? { memberOnly: record.isMemberOnly }
      : {}),
  };
}

function normalizeResourceHubData(payload: unknown): ResourceHubData {
  return {
    resources: normalizeLibraryResources(payload),
    newsRadar:
      payload && typeof payload === 'object'
        ? normalizeNewsStories((payload as Record<string, unknown>).newsRadar)
        : [],
  };
}

function normalizeLibraryResources(payload: unknown): LibraryResource[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).resources)
      ? ((payload as Record<string, unknown>).resources as unknown[])
      : [];

  return rows.map(normalizeLibraryResource).filter((resource): resource is LibraryResource => resource !== null);
}

function normalizeLibraryResource(row: unknown, index: number): LibraryResource | null {
  if (!row || typeof row !== 'object') return null;

  const record = row as Record<string, unknown>;
  const title = firstString(record.title, record.name);
  if (!title) return null;

  const updatedAt = firstString(record.updatedAt, record.updated_at, record.date, record.publishedAt, record.published_at) ?? 'Recent';
  const parsedUpdatedAt = Date.parse(updatedAt);
  const href = absoluteResourceHref(
    firstString(
      record.viewerHref,
      record.viewer_href,
      record.artifactHref,
      record.artifact_href,
      record.fileUrl,
      record.file_url,
      record.externalUrl,
      record.external_url,
      record.href,
      record.url,
      record.link,
      record.sourceUrl,
      record.source_url
    )
  );

  return {
    id: firstString(record.id, record._id, record.uuid, record.slug) ?? `resource-${index}`,
    title,
    type: resourceTypeFrom(record.type, record.category),
    summary: firstString(record.summary, record.description, record.excerpt) ?? '',
    authors: firstString(record.authors, record.sourceLabel, record.source_label, record.author, record.source) ?? 'GPFA',
    updatedAt,
    ...(Number.isFinite(parsedUpdatedAt)
      ? { mins: Math.max(0, Math.round((Date.now() - parsedUpdatedAt) / 60000)) }
      : {}),
    ...(numberFrom(record.pages, record.pageCount, record.page_count) ? { pages: numberFrom(record.pages, record.pageCount, record.page_count) } : {}),
    tags: arrayOfStrings(record.tags),
    ...(href ? { href } : {}),
  };
}

function absoluteResourceHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith('/')) return value;

  const origin = GPFA_WEB_ORIGIN || API_BASE_URL;
  return origin ? `${origin}${value}` : value;
}

function resourceTypeFrom(...values: unknown[]): ResourceType {
  const value = firstString(...values)?.toLowerCase();
  if (value === 'podcast') return 'Podcast';
  if (value === 'briefing' || value === 'presentation') return 'Briefing';
  if (value === 'template') return 'Template';
  if (value === 'external link' || value === 'external_link' || value === 'industry body') return 'External Link';
  if (value === 'explainer' || value === 'guide') return 'Explainer';
  if (value === 'event notes' || value === 'event_notes' || value === 'meeting material' || value === 'meeting_material' || value === 'agenda' || value === 'minutes') return 'Event Notes';
  return 'Working Paper';
}

function normalizeJobListings(payload: unknown): JobListing[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).jobPostings)
      ? ((payload as Record<string, unknown>).jobPostings as unknown[])
      : [];

  return rows.map(normalizeJobListing).filter((job): job is JobListing => job !== null);
}

function normalizeJobListing(row: unknown, index: number): JobListing | null {
  if (!row || typeof row !== 'object') return null;

  const record = row as Record<string, unknown>;
  const organization = recordFrom(record.organization);
  const title = firstString(record.title) ?? 'Untitled role';
  const org = firstString(organization.name, record.organizationName, record.organization_name, record.org) ?? 'Member organization';
  const location = firstString(record.location) ?? 'Location not provided';
  const compensation = firstString(record.compensation) ?? 'Compensation not provided';
  const createdAt = firstString(record.created_at, record.createdAt);
  const requirements = firstString(record.requirements);
  const description = firstString(record.description) ?? '';
  const fnKey = jobFunctionKeyFrom([title, description, requirements].filter(Boolean).join(' '));
  const orgCountry = firstString(organization.country);
  const orgMeta = ['MEMBER ORG', orgCountry].filter(Boolean).join(' · ').toUpperCase();
  const applyUrl = absoluteResourceHref(firstString(record.url));
  const mins = ageMinutes(createdAt);

  return {
    id: firstString(record.id, record.uuid) ?? `job-${index}`,
    title,
    org,
    initials: orgInitialsFromName(org),
    orgMeta: orgMeta || 'MEMBER ORG',
    source: 'member',
    fn: jobFunctionLabel(fnKey),
    fnKey,
    loc: location,
    comp: compensation,
    posted: shortDateLabel(createdAt),
    closes: booleanFrom(record.accepting_applications, record.acceptingApplications) === false ? 'Applications closed' : 'Applications open',
    ...(mins !== undefined ? { mins } : {}),
    blurb: description || 'No description provided.',
    bullets: splitJobRequirements(requirements),
    about: firstString(organization.description) ?? `${org} is a GPFA member organization.`,
    stats: jobStatsFromOrganization(organization),
    ...(applyUrl ? { applyUrl } : {}),
  };
}

function jobFunctionKeyFrom(value: string): JobListing['fnKey'] {
  const text = value.toLowerCase();
  if (/collateral|liquidity|securities lending|treasury|financing/.test(text)) return 'collateral';
  if (/risk|margin|capital|compliance/.test(text)) return 'risk';
  if (/legal|counsel|documentation|regulatory|contract/.test(text)) return 'legal';
  if (/tech|technology|data|engineer|platform|software|systems|developer/.test(text)) return 'tech';
  if (/operations|ops|settlement|trade support|middle office/.test(text)) return 'ops';
  return 'ops';
}

function jobFunctionLabel(key: JobListing['fnKey']): string {
  switch (key) {
    case 'collateral':
      return 'Collateral & liquidity';
    case 'risk':
      return 'Risk';
    case 'legal':
      return 'Legal & documentation';
    case 'tech':
      return 'Technology';
    case 'ops':
      return 'Operations';
  }
}

function splitJobRequirements(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n|(?:^|\s)[•·\-*]\s+/)
    .map((line) => line.replace(/^[•·\-*]\s*/, '').trim())
    .filter(Boolean);
}

function jobStatsFromOrganization(organization: Record<string, unknown>): JobListing['stats'] {
  return [
    ['Country', firstString(organization.country)],
    ['AUM', firstString(organization.assets_label, organization.assetsLabel)],
    ['Type', firstString(organization.organization_type, organization.organizationType)],
  ]
    .filter((stat): stat is [string, string] => Boolean(stat[1]))
    .slice(0, 3)
    .map(([label, value]) => ({ label, value }));
}

function shortDateLabel(value: string | undefined): string {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' }).format(date);
}

function ageMinutes(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.max(0, Math.round((Date.now() - time) / 60000)) : undefined;
}

function orgInitialsFromName(name: string): string {
  const compact = name.replace(/[^A-Za-z0-9]/g, '');
  if (compact.length > 0 && compact.length <= 5 && compact === compact.toUpperCase()) return compact;
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words.map((word) => word[0]).join('') : (words[0] ?? '').slice(0, 2);
  return letters.slice(0, 4).toUpperCase();
}

function normalizeWorkingGroupResourceText(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/\bwg\b/g, 'working group');
}

function resourceMatchesWorkingGroup(resource: LibraryResource, slug: string, groupId?: string): boolean {
  const tokens = [slug, groupId]
    .filter((value): value is string => !!value)
    .map((value) => normalizeWorkingGroupResourceText(value.replace(/-/g, ' ')));
  const haystack = normalizeWorkingGroupResourceText(
    [resource.title, resource.summary, resource.authors, ...resource.tags].join(' ')
  );

  return tokens.some((token) => token.length > 2 && haystack.includes(token));
}

function relevanceFrom(...values: unknown[]): Relevance | undefined {
  const value = firstString(...values)?.toLowerCase();
  return value === 'high' || value === 'medium' || value === 'low' ? value : undefined;
}

function shortTopicTag(topic: string): string {
  return topic.replace(/\s*&\s*/g, ' & ').split(/\s+/).slice(0, 2).join(' ');
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];
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
    hasReposted: item.hasReposted,
    repostCount: item.repostCount,
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
    canReply: booleanFrom(record.canReply, record.viewerCanReply),
    replies: [],
  };
}

function workingGroupDetailReplyToReply(reply: WorkingGroupDetailReply): Reply {
  return {
    id: reply.id,
    a: reply.author.name,
    org: reply.author.organization,
    time: relativeTime(reply.createdAt),
    initials: reply.author.initials,
    text: reply.body,
    attachments: reply.attachments.map(workingGroupDetailAttachmentToForumAttachment),
  };
}

function workingGroupDetailAttachmentToForumAttachment(
  attachment: WorkingGroupDetailAttachment
): ForumAttachment {
  const href = absoluteResourceHref(
    firstString(attachment.href, attachment.viewerHref, attachment.downloadUrl) ??
      `/api/content-assets/${attachment.id}`
  );
  return {
    id: attachment.id,
    name: attachmentTitle(attachment),
    contentType: attachment.contentType,
    byteSize: attachment.byteSize,
    ...(href ? { href } : {}),
  };
}

function workingGroupPollDetailToPoll(
  detail: Extract<WorkingGroupFeedItemResponse['detail'], { kind: 'poll' }>,
  fallback: Poll | undefined
): Poll {
  const poll = detail.poll as Record<string, unknown>;
  const questions = arrayOfRecords(poll.questions);
  const question = questions[0];
  const options = arrayOfRecords(question?.options).length
    ? arrayOfRecords(question?.options)
    : arrayOfRecords(poll.options);

  return {
    id: firstString(poll.id) ?? fallback?.id,
    questionId: firstString(question?.id, question?.questionId) ?? fallback?.questionId,
    q: firstString(question?.text, question?.title, poll.title) ?? fallback?.q ?? 'Poll',
    closes: poll.closedAt ? 'Closed' : firstString(poll.closesLabel, poll.closesAt) ?? fallback?.closes ?? 'Open',
    options: options.length ? options.map((option) => pollOptionFromDetail(option, detail.results)) : fallback?.options ?? [],
  };
}

function pollOptionFromDetail(option: Record<string, unknown>, results: unknown[]): PollOption {
  const id = firstString(option.id, option.optionId) ?? '';
  return {
    ...(id ? { id } : {}),
    label: firstString(option.label, option.text, option.title) ?? 'Option',
    votes: numberFrom(option.votes, option.voteCount, option.responseCount, resultVotesForOption(id, results)) ?? 0,
  };
}

function resultVotesForOption(optionId: string, results: unknown[]): number | undefined {
  if (!optionId) return undefined;
  const row = arrayOfRecords(results).find((result) => firstString(result.optionId, result.option_id, result.id) === optionId);
  return row ? numberFrom(row.votes, row.voteCount, row.count, row.responses) : undefined;
}

function attachmentTitle(attachment: WorkingGroupDetailAttachment): string {
  return attachment.originalFilename ?? attachment.title;
}

function attachmentMeta(attachment: WorkingGroupDetailAttachment): string {
  return [attachment.contentType, formatBytes(attachment.byteSize)].filter(Boolean).join(' · ');
}

function formatBytes(bytes: number | undefined): string | undefined {
  if (!bytes || bytes < 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
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

function numberFrom(...values: unknown[]): number | undefined {
  const value = values.find((candidate) => typeof candidate === 'number' && Number.isFinite(candidate));
  return typeof value === 'number' ? value : undefined;
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object') : [];
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

function forumThreadFormData(input: ForumThreadCreateInput): FormData {
  const form = new FormData();
  form.append('groupSlug', input.groupSlug);
  form.append('postType', input.postType ?? 'discussion');
  form.append('title', input.title);
  form.append('body', input.body ?? '');
  form.append('tags', input.tags ?? '');

  if (input.postType === 'event') {
    form.append('startsAt', toIsoStringOrEmpty(input.startsAt));
    form.append('endsAt', toIsoStringOrEmpty(input.endsAt));
    form.append('timezone', input.timezone ?? '');
    form.append('location', input.location ?? '');
    form.append('registrationUrl', input.registrationUrl ?? '');
    form.append('isVirtual', input.isVirtual ? 'true' : 'false');
  }

  for (const id of input.attachmentIds ?? []) {
    form.append('attachmentIds', id);
  }

  return form;
}

async function uploadWorkingGroupResourceFiles(
  slug: string,
  files: WorkingGroupResourceSubmissionInput['files']
): Promise<string[]> {
  const uploadedIds: string[] = [];

  for (const file of files ?? []) {
    if (!file.uri) continue;

    const fileName = file.name ?? file.fileName ?? 'resource-upload';
    const contentType = file.type ?? file.mimeType ?? 'application/octet-stream';
    const byteSize = file.size ?? 0;
    if (byteSize <= 0) throw new Error(`The file ${fileName} is missing its size.`);

    const prepared = await prepareWorkingGroupResourceUpload(slug, { fileName, contentType, byteSize });
    const uploadId = uploadIdentifier(prepared);
    if (!prepared?.signedUrl || !uploadId) {
      throw new Error('The upload target is missing required details.');
    }

    await putLocalFileToSignedUrl({ uri: file.uri, signedUrl: prepared.signedUrl, contentType });

    const finalized = await finalizeWorkingGroupResourceUpload(slug, {
      assetId: prepared.assetId,
      attachmentId: prepared.attachmentId,
      fileId: prepared.fileId,
      uploadId: prepared.uploadId,
      fileName,
      contentType: prepared.expectedContentType ?? contentType,
      byteSize: prepared.expectedByteSize ?? byteSize,
    });
    const finalizedId = uploadIdentifier(finalized) ?? uploadId;
    uploadedIds.push(finalizedId);
  }

  return uploadedIds;
}

async function putLocalFileToSignedUrl({
  uri,
  signedUrl,
  contentType,
}: {
  uri: string;
  signedUrl: string;
  contentType: string;
}): Promise<void> {
  const body = new File(uri);
  if (!body.exists) throw new Error('The selected file could not be read.');
  const uploadResponse = await expoFetch(signedUrl, {
    method: 'PUT',
    headers: contentType ? { 'Content-Type': contentType } : undefined,
    body,
  });

  if (!uploadResponse.ok) throw new Error('Uploading to storage failed. Please try again.');
}

function uploadIdentifier(
  value: WorkingGroupResourceUploadPrepareResponse | WorkingGroupResourceUploadFinalizeResponse | null | undefined
): string | undefined {
  const record = recordFrom(value);
  return firstString(record.attachmentId, record.fileId, record.assetId, record.uploadId, record.id);
}

function workingGroupResourceSubmissionFormData(
  input: WorkingGroupResourceSubmissionInput,
  attachmentIds: string[] = []
): FormData {
  const form = new FormData();
  form.append('title', input.title);
  if (input.resourceType) form.append('resourceType', input.resourceType);
  if (input.sourceUrl) form.append('sourceUrl', input.sourceUrl);
  if (input.summary) form.append('summary', input.summary);
  if (input.contributorNotes) form.append('contributorNotes', input.contributorNotes);

  const tags = Array.isArray(input.tags) ? input.tags : input.tags?.split(',') ?? [];
  for (const tag of tags.map((value) => value.trim()).filter(Boolean)) {
    form.append('tags', tag);
  }

  for (const id of attachmentIds) {
    form.append('attachmentIds', id);
    form.append('assetIds', id);
    form.append('fileIds', id);
  }

  return form;
}

function toIsoStringOrEmpty(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
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
