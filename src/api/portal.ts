import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { ApiError, RequestCancelledError, request, requestEventStream } from './client';
import {
  createAskSseParser,
  normalizeAskConversation,
  normalizeAskMessage,
} from './ask-stream';
import { API_BASE_URL, GPFA_WEB_ORIGIN, ROUTES, USING_FIXTURE_PORTAL_DATA, USING_REMOTE_API } from './config';
import { normalizeNotifications } from './notification-normalization';
import type {
  AskAnswer,
  AskConversationPage,
  AskConversationSummary,
  AskMessage,
  AskStreamEvent,
  AddConversationMembersResponse,
  AnnualMeetingPreview,
  AnnualMeetingRegistrationInput,
  AnnualMeetingRegistrationState,
  CalendarEvent,
  ConversationDetailResponse,
  ConversationListResponse,
  DirectoryMemberProfile,
  MemberProfileActivityKind,
  MemberProfileActivityPage,
  DirectoryMemberSummary,
  DirectoryPerson,
  DirectConversationResponse,
  EditMessageResponse,
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
  HomeGroupPreview,
  HomeImmediateAction,
  HomeImmediateActionsResponse,
  HomeThreadPreview,
  JobListing,
  LibraryResource,
  MemberContentListResponse,
  MemberContentMutationResponse,
  MemberContentQuery,
  MemberContentTargetInput,
  MemberContentTargetType,
  MemberRepost,
  Member,
  MemberEmailPreferenceKey,
  MemberEmailPreferences,
  MemberMentionActivity,
  OwnProfile,
  OwnProfileUpdateInput,
  MemberUpdates,
  MemberNotificationsResponse,
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
  MobileEventPreview,
  NewPostInput,
  NewsStory,
  NewsFeedFacets,
  NewsFeedItem,
  NewsFeedPage,
  NewsFeedRequest,
  PodcastEpisode,
  PodcastTranscriptSegment,
  Poll,
  PollOption,
  Relevance,
  RedirectResponse,
  RenameConversationResponse,
  Reply,
  ResourceHubData,
  ResourceArtifact,
  ResourceType,
  RsvpChoice,
  SendMessageInput,
  SendMessageResponse,
  LeaveConversationResponse,
  StatusResponse,
  Thread,
  UnsendMessageResponse,
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
  WorkingGroupResourceType,
  WorkingGroupResourceModerationFilter,
  WorkingGroupResourceModerationResponse,
  WorkingGroupResourceModerationSubmission,
  WorkingGroupResourceReviewInput,
  WorkingGroupResourceReviewResponse,
  WorkingGroupResourceUploadFinalizeInput,
  WorkingGroupResourceUploadFinalizeResponse,
  WorkingGroupResourceUploadPrepareInput,
  WorkingGroupResourceUploadPrepareResponse,
  WorkingGroupTagUsageResponse,
  WorkingGroupThreadFeed,
  WorkingGroupsData,
} from './types';
import type { OrgSector, WgRuleClass } from '../ds/tokens';
import {
  isMessageWithinEditWindow,
  messageContentError,
  normalizeMessageContent,
  replaceConversationLastMessage,
} from '../lib/messages';
import {
  ANNUAL_MEETING,
  ASK_CONVERSATIONS,
  ASK_MESSAGES,
  DIRECTORY_PEOPLE,
  findAnswer,
  GROUPS,
  JOBS,
  LIBRARY,
  MEMBER_UPDATES,
  MEMBER,
  MEMBER_ORGS,
  MESSAGE_CONVERSATIONS,
  MESSAGE_ITEMS,
  NEWS_STORIES,
  NEXT_EVENT,
  NOTIFICATIONS,
  PODCASTS,
  PODCAST_TRANSCRIPTS,
  MOBILE_EVENTS,
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

let fixtureAskConversations = ASK_CONVERSATIONS.map((conversation) => ({ ...conversation }));
const fixtureAskMessages: Record<string, AskMessage[]> = Object.fromEntries(
  Object.entries(ASK_MESSAGES).map(([id, messages]) => [
    id,
    messages.map((message) => ({ ...message, sources: [...message.sources] })),
  ])
);
let fixtureAskSequence = 100;

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
    groups: HomeGroupPreview[];
    threads: HomeThreadPreview[];
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

interface WorkingGroupMembershipResponse {
  status: 'success';
  membership: WorkingGroupMembership | null;
}

interface MemberDirectoryResponse {
  status: 'success';
  members: MemberDirectoryRow[];
}

interface DirectoryMemberSummaryResponse {
  status: 'success';
  summary: DirectoryMemberSummary;
}

interface MemberDirectoryRow {
  id: string;
  name: string;
  mentionHandle: string;
  role: string;
  organization: string;
  initials?: string;
  photo?: string;
  orgId?: string;
  orgSlug?: string;
  isCurrentMember?: boolean;
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
  member: OwnProfile;
}

interface EmailPreferencesResponse {
  status: 'success';
  preferences: MemberEmailPreferences;
}

interface MemberMentionsResponse {
  status: 'success';
  items: MemberMentionActivity[];
}

interface MemberHandleResponse {
  status: 'success';
  mentionHandle: string;
  href: string;
}

interface AvatarPrepareResponse {
  storagePath: string;
  signedUrl: string;
}

interface AvatarResponse {
  status: 'success';
  imageUrl: string | null;
}

interface PodcastsApiResponse {
  status: 'success';
  episodes: Array<Omit<PodcastEpisode, 'date' | 'mins' | 'duration' | 'durationSeconds' | 'peaks' | 'showNotes' | 'transcriptEndpoint' | 'transcriptUrl'> & {
    date: string;
    duration?: string;
    durationSeconds?: number;
    peaks?: number[][];
    showNotes?: string;
    transcriptEndpoint?: string;
    transcriptUrl?: string;
  }>;
}

interface PodcastTranscriptApiResponse {
  revisionId: string;
  segments: PodcastTranscriptSegment[] | null;
}

interface EventsApiResponse {
  status: 'success';
  events: Array<{
    id: string;
    contentItemId: string | null;
    title: string;
    startsAt: string;
    dateLabel?: string;
    datePrecision?: 'day' | 'datetime';
    endsAt?: string;
    timezone?: string;
    location: string;
    format: MobileEventPreview['format'];
    type?: string;
    status: MobileEventPreview['status'];
    lifecycleStatus: string;
    rsvpStatus: 'attending' | 'not_attending' | null;
    attendeeCount: number;
    attendees?: Array<{ id?: string; name: string; org?: string }>;
    memberJoinUrl?: string;
    summary?: string;
    agenda: Array<{ time: string; title: string; speakers?: string; moderator?: string }>;
    url: string;
  }>;
}

interface UpdatesApiResponse {
  status: 'success';
  announcements: Array<{
    id: string;
    notificationId: string;
    title: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  }>;
  surveys: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'active' | 'closed';
    closesAt: string;
    hasStarted: boolean;
    hasResponded: boolean;
    questions: Array<{
      id: string;
      text: string;
      context?: string;
      options: Array<{ id: string; label: string; isOther: boolean }>;
      statements: Array<{ id: string; text: string }>;
    }>;
    answers: MemberUpdates['surveys'][number]['answers'];
  }>;
}

interface AnnualMeetingRegistrationContextApi {
  draftId: string;
  meetingTitle: string;
  acceptsNewRegistrations: boolean;
  allowsMemberEdits: boolean;
  formFields: Array<{
    id: string;
    type: AnnualMeetingPreview['formFields'][number]['type'];
    label: string;
    helpText: string;
    required: boolean;
    options: Array<{ id: string; label: string }>;
  }>;
  registration: null | {
    status: 'pending' | 'approved' | 'waitlisted' | 'declined';
    updatedAt: string;
    answers: AnnualMeetingPreview['answers'];
  };
}

interface AnnualMeetingApiResponse {
  status: 'success';
  page: {
    draftId: string;
    title: string;
    subtitle: string;
    startDate: string | null;
    endDate: string | null;
    timezone: string | null;
    summaryMarkdown: string;
    agendaDays: Array<{
      id: string;
      date: string;
      title: string;
      sessions: Array<{
        startTime: string;
        endTime?: string | null;
        title: string;
        descriptionMarkdown: string;
        locationLabel?: string | null;
      }>;
    }>;
    locations: Array<{
      name: string;
      descriptionMarkdown: string;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      region?: string | null;
      postalCode?: string | null;
      country?: string | null;
    }>;
  };
  registration: AnnualMeetingRegistrationContextApi;
}

interface AnnualMeetingRegistrationResponse {
  status: 'success';
  context: AnnualMeetingRegistrationContextApi;
}

/** The signed-in member. Everything that shows "who am I" reads this. */
export function getMe(): Promise<OwnProfile> {
  if (!USING_REMOTE_API) return local(fixtureOwnProfile);
  return request<CurrentMemberResponse>(ROUTES.me).then((response) => response.member);
}

let fixtureOwnProfile: OwnProfile = {
  ...MEMBER,
  avatarUrl: null,
  country: 'Canada',
  bio: 'Treasury and liquidity leader focused on institutional collaboration.',
  skills: ['Liquidity management', 'Securities lending'],
  mentionHandle: 'robert-goobie',
  organizationSlug: 'hoopp',
};

let fixtureEmailPreferences: MemberEmailPreferences = {
  workingGroupPosts: true,
  siteEvents: true,
  siteAnnouncements: true,
  surveyEmails: true,
  marketingCampaigns: false,
};

export function updateOwnProfile(input: OwnProfileUpdateInput): Promise<OwnProfile> {
  if (!USING_REMOTE_API) {
    fixtureOwnProfile = {
      ...fixtureOwnProfile,
      name: input.fullName,
      firstName: input.fullName.trim().split(/\s+/)[0] ?? '',
      role: input.roleTitle || undefined,
      country: input.country,
      bio: input.bio,
      skills: [...input.skills],
    };
    return local(fixtureOwnProfile);
  }
  return request<CurrentMemberResponse>(ROUTES.me, { method: 'PATCH', body: input })
    .then((response) => response.member);
}

export function getMemberEmailPreferences(): Promise<MemberEmailPreferences> {
  if (!USING_REMOTE_API) return local({ ...fixtureEmailPreferences });
  return request<EmailPreferencesResponse>(ROUTES.memberEmailPreferences)
    .then((response) => response.preferences);
}

export function updateMemberEmailPreference(
  preference: MemberEmailPreferenceKey,
  enabled: boolean
): Promise<MemberEmailPreferences> {
  if (!USING_REMOTE_API) {
    fixtureEmailPreferences = { ...fixtureEmailPreferences, [preference]: enabled };
    return local({ ...fixtureEmailPreferences });
  }
  return request<EmailPreferencesResponse>(ROUTES.memberEmailPreferences, {
    method: 'PATCH',
    body: { preference, enabled },
  }).then((response) => response.preferences);
}

export function getMemberMentions(): Promise<MemberMentionActivity[]> {
  if (!USING_REMOTE_API) return local([]);
  return request<MemberMentionsResponse>(ROUTES.memberMentions)
    .then((response) => response.items);
}

export function updateMemberHandle(mentionHandle: string): Promise<string> {
  if (!USING_REMOTE_API) {
    fixtureOwnProfile = { ...fixtureOwnProfile, mentionHandle };
    return local(mentionHandle);
  }
  return request<MemberHandleResponse>(ROUTES.memberHandle, {
    method: 'PATCH',
    body: { mentionHandle },
  }).then((response) => response.mentionHandle);
}

export function requestPasswordChange(): Promise<void> {
  if (!USING_REMOTE_API) return local(undefined);
  return request<StatusResponse>(ROUTES.memberChangePassword, { method: 'POST' })
    .then(() => undefined);
}

export async function uploadMemberAvatar(input: {
  uri: string;
  byteSize: number;
}): Promise<string> {
  if (!USING_REMOTE_API) {
    fixtureOwnProfile = { ...fixtureOwnProfile, avatarUrl: input.uri };
    return input.uri;
  }

  const prepared = await request<AvatarPrepareResponse>(ROUTES.memberAvatarPrepare, {
    method: 'POST',
    body: { filename: 'profile-photo.jpg', byteSize: input.byteSize, contentType: 'image/jpeg' },
  });
  await putLocalFileToSignedUrl({
    uri: input.uri,
    signedUrl: prepared.signedUrl,
    contentType: 'image/jpeg',
  });
  return request<AvatarResponse>(ROUTES.memberAvatarFinalize, {
    method: 'POST',
    body: { storagePath: prepared.storagePath, contentType: 'image/jpeg' },
  }).then((response) => {
    if (!response.imageUrl) throw new Error('The uploaded photo could not be loaded.');
    return response.imageUrl;
  });
}

export function removeMemberAvatar(): Promise<void> {
  if (!USING_REMOTE_API) {
    fixtureOwnProfile = { ...fixtureOwnProfile, avatarUrl: null };
    return local(undefined);
  }
  return request<StatusResponse>(ROUTES.memberAvatar, { method: 'DELETE' }).then(() => undefined);
}

export function importLinkedInMemberAvatar(): Promise<string> {
  if (!USING_REMOTE_API) return local(fixtureOwnProfile.avatarUrl ?? '');
  return request<AvatarResponse>(ROUTES.memberAvatarLinkedIn, {
    method: 'POST',
    body: { includeName: false },
  }).then((response) => {
    if (!response.imageUrl) throw new Error('LinkedIn does not have a profile photo to import.');
    return response.imageUrl;
  });
}

/** The server-authored Home greeting and unfinished member actions. */
export function getHomeImmediateActions(): Promise<HomeImmediateActionsResponse> {
  if (!USING_REMOTE_API) return local(homeImmediateActionsFixture());
  return request<HomeImmediateActionsResponse>(ROUTES.homeImmediateActions);
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
export function getNotifications(): Promise<MemberNotificationsResponse> {
  if (!USING_REMOTE_API) {
    return local({ memberCreatedAt: null, notifications: NOTIFICATIONS });
  }
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

export function getWorkingGroups(): Promise<WorkingGroupsData> {
  if (!USING_REMOTE_API) return local(workingGroupsFixture());
  return request<WorkingGroupsResponse>(ROUTES.workingGroups).then((response) => ({
    groups: normalizeWorkingGroups(response),
    home: response.home,
  }));
}

export function getGroups(): Promise<Group[]> {
  return getWorkingGroups().then((data) => data.groups);
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

export function getNewsFeedPage(input: NewsFeedRequest = {}): Promise<NewsFeedPage> {
  if (USING_PORTAL_FIXTURES) return local(createFixtureNewsFeedPage(input));

  const params = new URLSearchParams();
  if (input.topic) params.set('topic', input.topic);
  if (input.source) params.set('source', input.source);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  if (input.snapshotAt) params.set('snapshotAt', input.snapshotAt);
  if (input.story) params.set('story', input.story);
  const query = params.toString();

  return request<unknown>(`${ROUTES.news}${query ? `?${query}` : ''}`).then(
    normalizeNewsFeedPage
  );
}

export function getEvents(): Promise<MobileEventPreview[]> {
  if (USING_PORTAL_FIXTURES) return local(MOBILE_EVENTS);
  return request<EventsApiResponse>(ROUTES.events).then((response) =>
    response.events.map(normalizeEvent)
  );
}

export function setEventRsvp(
  contentItemId: string,
  status: 'attending' | 'not_attending'
): Promise<void> {
  if (USING_PORTAL_FIXTURES) return local(undefined);
  return request<MessageResponse>(ROUTES.eventRsvp, {
    method: 'POST',
    body: { contentItemId, status },
  }).then(() => undefined);
}

export function getMemberUpdates(): Promise<MemberUpdates> {
  if (USING_PORTAL_FIXTURES) return local(MEMBER_UPDATES);
  return request<UpdatesApiResponse>(ROUTES.updates).then(normalizeMemberUpdates);
}

export function submitSurveyResponse(
  surveyId: string,
  answers: MemberUpdates['surveys'][number]['answers']
): Promise<void> {
  if (USING_PORTAL_FIXTURES) return local(undefined);
  return request<StatusResponse>(ROUTES.surveyResponse(surveyId), {
    method: 'POST',
    body: { answers },
  }).then(() => undefined);
}

export function getAnnualMeeting(): Promise<AnnualMeetingPreview | null> {
  if (USING_PORTAL_FIXTURES) return local(ANNUAL_MEETING);
  return request<AnnualMeetingApiResponse>(ROUTES.annualMeeting)
    .then(normalizeAnnualMeeting)
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    });
}

export function saveAnnualMeetingRegistration(
  input: AnnualMeetingRegistrationInput
): Promise<AnnualMeetingRegistrationState> {
  if (USING_PORTAL_FIXTURES) {
    return local({
      registrationStatus: 'Registered',
      registrationOpen: ANNUAL_MEETING.registrationOpen,
      allowsMemberEdits: ANNUAL_MEETING.allowsMemberEdits,
      expectedUpdatedAt: new Date().toISOString(),
      answers: input.answers,
    });
  }
  return request<AnnualMeetingRegistrationResponse>(ROUTES.annualMeetingRegistration, {
    method: 'POST',
    body: input,
  }).then((response) => normalizeAnnualMeetingRegistration(response.context));
}

function normalizeEvent(event: EventsApiResponse['events'][number]): MobileEventPreview {
  const startsAt = new Date(event.startsAt);
  const agenda = event.agenda.map((item) => ({
    time: item.time,
    title: item.title,
    detail: [item.speakers, item.moderator ? `Moderator: ${item.moderator}` : null]
      .filter(Boolean)
      .join(' · ') || undefined,
  }));
  return {
    id: event.id,
    contentItemId: event.contentItemId,
    startsAt: event.startsAt,
    ...(event.endsAt ? { endsAt: event.endsAt } : {}),
    ...(event.timezone ? { timezone: event.timezone } : {}),
    ...(event.datePrecision ? { datePrecision: event.datePrecision } : {}),
    detailsUrl: absoluteResourceHref(event.url) ?? event.url,
    month: Number.isNaN(startsAt.getTime()) ? '—' : startsAt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: Number.isNaN(startsAt.getTime()) ? '—' : startsAt.toLocaleDateString('en-US', { day: '2-digit' }),
    title: event.title,
    dateLabel: event.dateLabel ?? formatLongDate(event.startsAt),
    timeLabel: formatEventTime(event.startsAt, event.endsAt),
    location: event.location,
    format: event.format,
    type: event.type ?? 'Member event',
    status: event.status,
    rsvp: event.rsvpStatus === 'not_attending' ? 'not-attending' : event.rsvpStatus ?? 'not-responded',
    registrationOpen: event.lifecycleStatus === 'registration_open' || event.lifecycleStatus === 'live',
    summary: event.summary ?? '',
    attendeeCount: event.attendeeCount,
    attendees: event.attendees ?? [],
    joinUrl: event.memberJoinUrl,
    agenda,
  };
}

function normalizeMemberUpdates(response: UpdatesApiResponse): MemberUpdates {
  return {
    announcements: response.announcements.map((announcement) => {
      const body = markdownParagraphs(announcement.body);
      return {
        id: announcement.id,
        notificationId: announcement.notificationId,
        title: announcement.title,
        summary: body[0] ?? '',
        body,
        dateLabel: formatShortDate(announcement.createdAt),
        unread: announcement.readAt == null,
      };
    }),
    surveys: response.surveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      description: survey.description ?? '',
      closesLabel: `CLOSES ${formatShortDate(survey.closesAt)}`,
      status: survey.status === 'closed'
        ? 'closed'
        : survey.hasResponded
          ? 'submitted'
          : survey.hasStarted
            ? 'in-progress'
            : 'not-started',
      questions: survey.questions.map((question) => ({
        id: question.id,
        prompt: question.text,
        context: question.context,
        options: question.options,
        statements: question.statements,
      })),
      answers: survey.answers,
    })),
  };
}

function normalizeAnnualMeeting(response: AnnualMeetingApiResponse): AnnualMeetingPreview {
  const primaryLocation = response.page.locations[0];
  return {
    draftId: response.page.draftId,
    title: response.page.title,
    subtitle: response.page.subtitle,
    dateLabel: formatDateRange(response.page.startDate, response.page.endDate),
    location: primaryLocation?.name ?? 'Location forthcoming',
    timezone: response.page.timezone ?? 'Timezone forthcoming',
    summary: plainMarkdown(response.page.summaryMarkdown),
    ...normalizeAnnualMeetingRegistration(response.registration),
    formFields: response.registration.formFields,
    agenda: response.page.agendaDays.map((day, index) => ({
      id: day.id,
      label: day.title || `Day ${index + 1}`,
      date: formatLongDate(day.date).toUpperCase(),
      sessions: day.sessions.map((session) => ({
        time: session.endTime ? `${session.startTime}–${session.endTime}` : session.startTime,
        title: session.title,
        detail: plainMarkdown(session.descriptionMarkdown),
        location: session.locationLabel ?? '',
      })),
    })),
    logistics: response.page.locations.map((location) => ({
      title: location.name,
      detail: [
        plainMarkdown(location.descriptionMarkdown),
        [location.addressLine1, location.addressLine2, location.city, location.region, location.postalCode, location.country]
          .filter(Boolean)
          .join(', '),
      ].filter(Boolean).join('\n'),
    })),
  };
}

function normalizeAnnualMeetingRegistration(
  context: AnnualMeetingRegistrationContextApi
): AnnualMeetingRegistrationState {
  const registration = context.registration;
  return {
    registrationStatus: registration?.status === 'waitlisted'
      ? 'Waitlisted'
      : registration
        ? 'Registered'
        : 'Not registered',
    registrationOpen: registration ? context.allowsMemberEdits : context.acceptsNewRegistrations,
    allowsMemberEdits: context.allowsMemberEdits,
    expectedUpdatedAt: registration?.updatedAt ?? null,
    answers: registration?.answers ?? [],
  };
}

function markdownParagraphs(value: string): string[] {
  return value.split(/\n\s*\n/).map(plainMarkdown).filter(Boolean);
}

function plainMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'DATE TBA'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function formatLongDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date forthcoming'
    : date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return 'Dates forthcoming';
  if (!end || start === end) return formatLongDate(start);
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Dates forthcoming';
  const startLabel = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const endLabel = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${startLabel}–${endLabel}`;
}

function formatEventTime(start: string, end?: string): string {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'Time forthcoming';
  const startLabel = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!end) return startLabel;
  const endDate = new Date(end);
  return Number.isNaN(endDate.getTime())
    ? startLabel
    : `${startLabel}–${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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
  if (!USING_REMOTE_API) return local(PODCASTS);
  return request<PodcastsApiResponse>(ROUTES.podcasts).then(normalizePodcasts);
}

/** Refresh one episode before an expiring signed URL is handed to native audio. */
export function refreshPodcastEpisode(slug: string): Promise<PodcastEpisode> {
  return getPodcasts().then((episodes) => {
    const episode = episodes.find((candidate) => candidate.slug === slug);
    if (!episode) throw new Error('This episode is no longer available.');
    return episode;
  });
}

function normalizePodcasts(response: PodcastsApiResponse): PodcastEpisode[] {
  return response.episodes.map((episode) => {
    const {
      date,
      peaks,
      showNotes,
      transcriptEndpoint,
      transcriptUrl: providedTranscriptUrl,
      ...mobileEpisode
    } = episode;
    const publishedAt = new Date(date);
    const compactPeaks = compactPodcastPeaks(peaks?.[0]);
    const normalizedShowNotes = showNotes?.trim();
    const normalizedTranscriptEndpoint = absoluteResourceHref(transcriptEndpoint);
    const transcriptUrl = absoluteResourceHref(providedTranscriptUrl);
    return {
      ...mobileEpisode,
      duration: mobileEpisode.duration ?? '',
      durationSeconds: mobileEpisode.durationSeconds ?? 0,
      date: Number.isNaN(publishedAt.getTime())
        ? date
        : publishedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...(Number.isNaN(publishedAt.getTime())
        ? {}
        : { mins: Math.max(0, Math.round((Date.now() - publishedAt.getTime()) / 60000)) }),
      ...(compactPeaks ? { peaks: compactPeaks } : {}),
      ...(normalizedShowNotes ? { showNotes: normalizedShowNotes } : {}),
      ...(normalizedTranscriptEndpoint
        ? { transcriptEndpoint: normalizedTranscriptEndpoint }
        : {}),
      ...(transcriptUrl ? { transcriptUrl } : {}),
    };
  });
}

/** Collapse the server's detailed signed min/max waveform into native UI bars. */
export function compactPodcastPeaks(value: unknown, maxPoints = 48): number[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || maxPoints < 1) return undefined;
  const amplitudes: number[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return undefined;
    amplitudes.push(Math.min(1, Math.abs(candidate)));
  }

  const count = Math.min(maxPoints, amplitudes.length);
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * amplitudes.length) / count);
    const end = Math.max(start + 1, Math.floor(((index + 1) * amplitudes.length) / count));
    return Math.max(...amplitudes.slice(start, end));
  });
}

export function getPodcastTranscript(slug: string): Promise<PodcastTranscriptSegment[]> {
  if (!USING_REMOTE_API) {
    return local(
      (PODCAST_TRANSCRIPTS[slug] ?? []).map((segment) => ({ ...segment }))
    );
  }
  return request<unknown>(ROUTES.podcastTranscript(slug)).then(
    (value) => parsePodcastTranscriptResponse(value).segments ?? []
  );
}

function parsePodcastTranscriptResponse(value: unknown): PodcastTranscriptApiResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The transcript response was not valid JSON data.');
  }

  const response = value as Record<string, unknown>;
  if (typeof response.revisionId !== 'string' || !response.revisionId.trim()) {
    throw new Error('The transcript response is missing its revision.');
  }
  if (response.segments === null) {
    return { revisionId: response.revisionId, segments: null };
  }
  if (!Array.isArray(response.segments)) {
    throw new Error('The transcript response is missing its segments.');
  }

  const segments = response.segments.map((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('The transcript response contains an invalid segment.');
    }
    const segment = candidate as Record<string, unknown>;
    if (
      typeof segment.start !== 'number' ||
      !Number.isFinite(segment.start) ||
      segment.start < 0 ||
      typeof segment.text !== 'string' ||
      !segment.text.trim()
    ) {
      throw new Error('The transcript response contains an invalid segment.');
    }
    return { start: segment.start, text: segment.text };
  });

  return { revisionId: response.revisionId, segments };
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
        mentionHandle: member.mentionHandle,
        name: member.name,
        role: member.role,
        initials: member.initials,
        photoUrl: member.photo,
      }];
    })
  );
}

/** Viewer-scoped details for an active directory member. */
export function getDirectoryMemberSummary(
  mentionHandle: string
): Promise<DirectoryMemberSummary> {
  if (!USING_REMOTE_API) {
    const person = DIRECTORY_PEOPLE.find((candidate) => candidate.mentionHandle === mentionHandle);
    if (!person) return Promise.reject(new Error('Member profile unavailable.'));
    const organization = MEMBER_ORGS.find((candidate) => candidate.id === person.orgId);
    return local({
      id: person.id,
      roleTitle: person.role || null,
      region: organization?.country ?? null,
      organization: organization?.name ?? null,
      organizationSlug: organization?.id ?? null,
      threadCount: 0,
      replyCount: 0,
      sharedGroupCount: 0,
    });
  }
  return request<DirectoryMemberSummaryResponse>(ROUTES.directoryMember(mentionHandle)).then(
    (response) => response.summary
  );
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} response is invalid.`);
  }
  return value as Record<string, unknown>;
}

function normalizeDirectoryMemberProfile(value: unknown): DirectoryMemberProfile {
  const response = requireRecord(value, 'Member profile');
  const profile = requireRecord(response.profile, 'Member profile');
  const organization = requireRecord(profile.organization, 'Member organization');
  const requiredStrings = [
    profile.id,
    profile.mentionHandle,
    profile.fullName,
    profile.roleTitle,
    profile.country,
    profile.memberSince,
    organization.id,
    organization.name,
    organization.abbreviation,
    organization.slug,
    organization.country,
    organization.organizationType,
  ];
  if (
    response.status !== 'success' ||
    requiredStrings.some((item) => typeof item !== 'string' || !item.trim()) ||
    (profile.avatarUrl !== null && typeof profile.avatarUrl !== 'string') ||
    (profile.bio !== null && typeof profile.bio !== 'string') ||
    typeof profile.isSelf !== 'boolean' ||
    !Array.isArray(profile.skills) ||
    !profile.skills.every((item) => typeof item === 'string') ||
    !Array.isArray(profile.workingGroups) ||
    (profile.events !== undefined && !Array.isArray(profile.events))
  ) {
    throw new Error('Member profile response is invalid.');
  }
  if (
    ![organization.assetsLabel, organization.description].every(
      (item) => item === null || typeof item === 'string'
    ) ||
    !profile.workingGroups.every((candidate) => {
      const group = requireRecord(candidate, 'Member working group');
      return (
        [group.slug, group.name, group.description, group.leadLabel, group.role, group.joinedAt].every(
          (item) => typeof item === 'string'
        ) &&
        (group.cardImageUrl === undefined || typeof group.cardImageUrl === 'string') &&
        typeof group.memberCount === 'number' &&
        typeof group.postCount === 'number'
      );
    }) ||
    (Array.isArray(profile.events) &&
      !profile.events.every((candidate) => {
        const event = requireRecord(candidate, 'Member event');
        return (
          [event.id, event.title, event.startsAt, event.location, event.sourceLabel, event.formatLabel, event.lifecycleLabel].every(
            (item) => typeof item === 'string'
          ) &&
          ['member_event', 'working_group_event'].includes(String(event.source)) &&
          ['upcoming', 'past'].includes(String(event.timing)) &&
          typeof event.canUpdateRsvp === 'boolean'
        );
      }))
  ) {
    throw new Error('Member profile response contains invalid nested data.');
  }
  return profile as unknown as DirectoryMemberProfile;
}

function normalizeMemberProfileActivity(value: unknown): MemberProfileActivityPage {
  const response = requireRecord(value, 'Member activity');
  if (
    response.status !== 'success' ||
    !['posts', 'replies', 'reposts'].includes(String(response.kind)) ||
    !Array.isArray(response.items) ||
    typeof response.page !== 'number' ||
    typeof response.pageSize !== 'number' ||
    typeof response.totalItems !== 'number' ||
    typeof response.hasMore !== 'boolean'
  ) {
    throw new Error('Member activity response is invalid.');
  }
  for (const candidate of response.items) {
    const item = requireRecord(candidate, 'Member activity item');
    if (
      typeof item.activityId !== 'string' ||
      !['post', 'reply', 'repost'].includes(String(item.kind)) ||
      typeof item.targetId !== 'string' ||
      typeof item.groupSlug !== 'string' ||
      typeof item.groupName !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.excerpt !== 'string' ||
      typeof item.createdAt !== 'string'
    ) {
      throw new Error('Member activity response contains an invalid item.');
    }
  }
  return {
    kind: response.kind,
    items: response.items,
    page: response.page,
    pageSize: response.pageSize,
    totalItems: response.totalItems,
    hasMore: response.hasMore,
  } as MemberProfileActivityPage;
}

function fixtureDirectoryMemberProfile(memberId: string): DirectoryMemberProfile | null {
  const person = DIRECTORY_PEOPLE.find((candidate) =>
    memberId === MEMBER.id
      ? candidate.mentionHandle === 'robert-goobie'
      : candidate.id === memberId
  );
  if (!person?.mentionHandle) return null;
  const organization = MEMBER_ORGS.find((candidate) => candidate.id === person.orgId);
  if (!organization) return null;
  const isSelf = person.mentionHandle === 'robert-goobie';
  return {
    id: memberId === MEMBER.id ? MEMBER.id : person.id,
    mentionHandle: person.mentionHandle,
    fullName: person.name,
    roleTitle: person.role,
    country: organization.country,
    avatarUrl: person.photoUrl ?? null,
    bio: isSelf
      ? 'Treasury and liquidity leader focused on practical peer collaboration across global pension funds.'
      : null,
    memberSince: '2023-01-01T00:00:00.000Z',
    skills: isSelf ? ['Liquidity management', 'Collateral', 'Securities finance'] : [],
    organization: {
      id: organization.id,
      name: organization.name,
      abbreviation: organization.short,
      slug: organization.id,
      country: organization.country,
      organizationType: organization.sector,
      assetsLabel: null,
      description: organization.blurb ?? null,
    },
    workingGroups: [],
    isSelf,
    ...(isSelf ? { events: [] } : {}),
  };
}

/** Full, safe profile for an active directory member, addressed by member UUID. */
export function getDirectoryMemberProfile(memberId: string): Promise<DirectoryMemberProfile> {
  if (!USING_REMOTE_API) {
    const profile = fixtureDirectoryMemberProfile(memberId);
    return profile ? local(profile) : Promise.reject(new Error('Member profile unavailable.'));
  }
  return request<unknown>(ROUTES.directoryMemberProfile(memberId)).then(
    normalizeDirectoryMemberProfile
  );
}

/** Ten-item activity page for a member profile tab. */
export function getDirectoryMemberProfileActivity(
  memberId: string,
  kind: MemberProfileActivityKind,
  page = 1
): Promise<MemberProfileActivityPage> {
  if (!USING_REMOTE_API) {
    if (!fixtureDirectoryMemberProfile(memberId)) {
      return Promise.reject(new Error('Member profile unavailable.'));
    }
    return local({ kind, items: [], page, pageSize: 10, totalItems: 0, hasMore: false });
  }
  return request<unknown>(ROUTES.directoryMemberProfileActivity(memberId, kind, page)).then(
    normalizeMemberProfileActivity
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
  const content = normalizeMessageContent(input.content);
  const contentError = messageContentError(content);
  if (contentError) return Promise.reject(new Error(contentError));
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
    editedAt: null,
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

export function editMemberMessage(messageId: string, value: string): Promise<EditMessageResponse> {
  const content = normalizeMessageContent(value);
  const contentError = messageContentError(content);
  if (contentError) return Promise.reject(new Error(contentError));
  if (!USING_MESSAGE_FIXTURES) {
    return request<EditMessageResponse>(ROUTES.message(messageId), {
      method: 'PATCH',
      body: { content },
    });
  }

  const located = findEditableFixtureMessage(messageId);
  if ('error' in located) return Promise.reject(located.error);
  if (located.message.content === content) {
    return local({
      status: 'success',
      conversationId: located.conversationId,
      message: cloneMessage(located.message),
    });
  }

  const message: MessageItem = {
    ...located.message,
    content,
    editedAt: new Date().toISOString(),
  };
  replaceFixtureMessage(located.conversationId, message);
  return local({ status: 'success', conversationId: located.conversationId, message: cloneMessage(message) });
}

export function unsendMemberMessage(messageId: string): Promise<UnsendMessageResponse> {
  if (!USING_MESSAGE_FIXTURES) {
    return request<UnsendMessageResponse>(ROUTES.message(messageId), { method: 'DELETE' });
  }

  const located = findEditableFixtureMessage(messageId);
  if ('error' in located) return Promise.reject(located.error);
  const message: MessageItem = {
    ...located.message,
    content: `${MEMBER.name} unsent a message`,
    editedAt: null,
    kind: 'system',
    reactions: [],
  };
  replaceFixtureMessage(located.conversationId, message);
  return local({ status: 'success', conversationId: located.conversationId, message: cloneMessage(message) });
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

export function getAskConversations(): Promise<AskConversationSummary[]> {
  if (!USING_REMOTE_API) {
    return local(fixtureAskConversations.map((conversation) => ({ ...conversation })));
  }
  return request<unknown>(ROUTES.askConversations).then((payload) => {
    const conversations = recordFrom(payload).conversations;
    if (!Array.isArray(conversations)) throw new Error('Ask GPFA conversation history is invalid.');
    return conversations.map(normalizeAskConversation);
  });
}

export function getAskConversation(
  conversationId: string,
  before?: string | null
): Promise<AskConversationPage> {
  if (!USING_REMOTE_API) return local(fixtureAskConversationPage(conversationId, before));
  const path = `${ROUTES.askConversation(conversationId)}${queryString({ before: before ?? undefined })}`;
  return request<unknown>(path).then(normalizeAskConversationPage);
}

export async function streamAskGpfa({
  question,
  conversationId,
  signal,
  onEvent,
}: {
  question: string;
  conversationId?: string;
  signal?: AbortSignal;
  onEvent: (event: AskStreamEvent) => void;
}): Promise<void> {
  if (!USING_REMOTE_API) {
    const answer = prepareFixtureAskAnswer(question, conversationId);
    if (!answer.conversation || !answer.userMessage || !answer.assistantMessage || !answer.conversationId) {
      throw new Error('Ask GPFA fixture persistence failed.');
    }
    const events: AskStreamEvent[] = [
      { type: 'ready', conversationId: answer.conversationId, conversationTitle: answer.conversation.title, userMessage: answer.userMessage },
      { type: 'tool_call', name: 'search_content_catalog', summary: 'Searching the GPFA content catalog' },
      { type: 'tool_result', name: 'search_content_catalog', summary: 'Reviewed the GPFA content catalog' },
      ...answer.text.match(/.{1,28}/gs)!.map((text) => ({ type: 'text_delta' as const, text })),
      { type: 'done', answer: { content: answer.text, sources: answer.sources, sourceState: answer.sourceState ?? 'ready' } },
      { type: 'persisted', conversation: answer.conversation, assistantMessage: answer.assistantMessage },
    ];
    for (const event of events) {
      await abortableDelay(event.type === 'text_delta' ? 24 : 180, signal);
      if (event.type === 'persisted') persistFixtureAskAssistant(answer);
      onEvent(event);
    }
    return;
  }
  const parser = createAskSseParser(onEvent);
  await requestEventStream(ROUTES.askStream, {
    body: { conversationId, message: question },
    signal,
    onChunk: (chunk) => parser.push(chunk),
  });
  parser.finish();
}

export async function askGpfa(question: string, conversationId?: string): Promise<AskAnswer> {
  let streamedText = '';
  let result: AskAnswer | null = null;
  await streamAskGpfa({
    question,
    conversationId,
    onEvent(event) {
      if (event.type === 'ready') {
        result = { text: '', sources: [], conversationId: event.conversationId, userMessage: event.userMessage };
      } else if (event.type === 'text_delta') {
        streamedText += event.text;
      } else if (event.type === 'done') {
        result = { ...(result ?? { sources: [] }), text: event.answer.content, sources: event.answer.sources, sourceState: event.answer.sourceState };
      } else if (event.type === 'persisted') {
        result = {
          ...(result ?? { text: streamedText, sources: [] }),
          text: event.assistantMessage.text,
          sources: event.assistantMessage.sources,
          sourceState: event.assistantMessage.sourceState,
          conversationId: event.conversation.id,
          conversation: event.conversation,
          assistantMessage: event.assistantMessage,
        };
      } else if (event.type === 'error') {
        throw new Error(event.message);
      }
    },
  });
  if (!result || !(result as AskAnswer).text.trim()) throw new Error('Ask GPFA did not return an answer.');
  return result;
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new RequestCancelledError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new RequestCancelledError());
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function normalizeAskConversationPage(value: unknown): AskConversationPage {
  const record = recordFrom(value);
  if (!Array.isArray(record.messages) || typeof record.hasEarlier !== 'boolean') {
    throw new Error('Ask GPFA conversation history is invalid.');
  }
  const earlierCursor = record.earlierCursor;
  if (earlierCursor !== null && earlierCursor !== undefined && typeof earlierCursor !== 'string') {
    throw new Error('Ask GPFA conversation cursor is invalid.');
  }
  if (record.hasEarlier && typeof earlierCursor !== 'string') {
    throw new Error('Ask GPFA conversation cursor is missing.');
  }
  return {
    conversation: normalizeAskConversation(record.conversation),
    messages: record.messages.map(normalizeAskMessage),
    hasEarlier: record.hasEarlier,
    earlierCursor: typeof earlierCursor === 'string' ? earlierCursor : null,
  };
}

function fixtureAskConversationPage(conversationId: string, before?: string | null): AskConversationPage {
  const conversation = fixtureAskConversations.find((item) => item.id === conversationId);
  const messages = fixtureAskMessages[conversationId];
  if (!conversation || !messages) throw new Error('Conversation not found.');
  const parsedEnd = before?.startsWith('fixture:') ? Number(before.slice('fixture:'.length)) : messages.length;
  if (!Number.isInteger(parsedEnd) || parsedEnd < 0 || parsedEnd > messages.length) {
    throw new Error('The message cursor is invalid.');
  }
  const start = Math.max(0, parsedEnd - 40);
  return {
    conversation: { ...conversation },
    messages: messages.slice(start, parsedEnd).map((message) => ({
      ...message,
      sources: message.sources.map((source) => ({ ...source })),
    })),
    hasEarlier: start > 0,
    earlierCursor: start > 0 ? `fixture:${start}` : null,
  };
}

function prepareFixtureAskAnswer(question: string, requestedConversationId?: string): AskAnswer {
  fixtureAskSequence += 1;
  const sequence = fixtureAskSequence;
  const createdAt = new Date(Date.UTC(2026, 7, 29, 12, sequence)).toISOString();
  const answer = findAnswer(question);
  const conversationId = requestedConversationId ?? `30000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  let conversation = fixtureAskConversations.find((item) => item.id === conversationId);
  if (!conversation) {
    conversation = { id: conversationId, title: question.trim().slice(0, 80), updatedAt: createdAt };
    fixtureAskConversations = [conversation, ...fixtureAskConversations];
    fixtureAskMessages[conversationId] = [];
  } else {
    conversation.updatedAt = createdAt;
    fixtureAskConversations = [conversation, ...fixtureAskConversations.filter((item) => item.id !== conversationId)];
  }
  const userMessage: AskMessage = {
    id: `40000000-0000-4000-8000-${String(sequence * 2).padStart(12, '0')}`,
    role: 'user',
    text: question,
    createdAt,
    sources: [],
  };
  const assistantMessage: AskMessage = {
    id: `40000000-0000-4000-8000-${String(sequence * 2 + 1).padStart(12, '0')}`,
    role: 'ai',
    text: answer.text,
    createdAt,
    sources: answer.sources.map((source) => ({ ...source })),
    sourceState: answer.sourceState,
  };
  fixtureAskMessages[conversationId].push(userMessage);
  return {
    text: answer.text,
    sources: answer.sources.map((source) => ({ ...source })),
    sourceState: answer.sourceState,
    conversationId,
    conversation: { ...conversation },
    userMessage,
    assistantMessage,
  };
}

function persistFixtureAskAssistant(answer: AskAnswer) {
  if (!answer.conversationId || !answer.assistantMessage) {
    throw new Error('Ask GPFA fixture persistence failed.');
  }
  const messages = fixtureAskMessages[answer.conversationId];
  if (!messages) throw new Error('Ask GPFA fixture conversation is missing.');
  if (!messages.some((message) => message.id === answer.assistantMessage?.id)) {
    messages.push(answer.assistantMessage);
  }
}

function cloneMessage(message: MessageItem): MessageItem {
  return { ...message, reactions: message.reactions.map((reaction) => ({ ...reaction })) };
}

function findEditableFixtureMessage(messageId: string):
  | { conversationId: string; message: MessageItem }
  | { error: Error } {
  for (const [conversationId, messages] of Object.entries(fixtureMessageItems)) {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message) continue;
    const conversation = fixtureMessageConversations.find((candidate) => candidate.id === conversationId);
    const currentParticipant = conversation?.participants.find((participant) => participant.isCurrentMember);
    // Mirror the route's permission-safe response for ownership and message-kind failures.
    if (
      !conversation ||
      !currentParticipant ||
      currentParticipant.hasLeft ||
      message.senderId !== MEMBER.id ||
      message.kind !== 'text'
    ) {
      return { error: new Error('Message unavailable.') };
    }
    if (!isMessageWithinEditWindow(message.createdAt)) {
      return { error: new Error('The edit window for this message has closed.') };
    }
    return { conversationId, message };
  }
  return { error: new Error('Message unavailable.') };
}

function replaceFixtureMessage(conversationId: string, next: MessageItem): void {
  fixtureMessageItems[conversationId] = (fixtureMessageItems[conversationId] ?? []).map((message) =>
    message.id === next.id ? next : message
  );
  fixtureMessageConversations = replaceConversationLastMessage(fixtureMessageConversations, next);
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
      questions: input.pollQuestions ?? [],
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
      id: member.id,
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

export function getWorkingGroupResourceModeration(
  groupSlug: string,
  status: WorkingGroupResourceModerationFilter = 'all'
): Promise<WorkingGroupResourceModerationResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupResourceModerationResponse>();
  const query = queryString({ groupSlug, status: status === 'removed' ? 'approved' : status });
  return request<ApiWorkingGroupResourceModerationResponse>(
    `${ROUTES.workingGroupResourceModeration}${query}`
  ).then((response) => {
    const submissions = response.submissions.map(mapWorkingGroupResourceModerationSubmission);
    return {
      status: response.status,
      submissions:
        status === 'removed'
          ? submissions.filter((submission) => submission.isRemoved)
          : status === 'approved'
            ? submissions.filter((submission) => !submission.isRemoved)
            : submissions,
    };
  });
}

interface ApiWorkingGroupResourceModerationPerson {
  id: string;
  full_name: string;
  role_title: string;
}

interface ApiWorkingGroupResourceModerationResponse {
  status: 'success';
  submissions: Array<{
    id: string;
    working_group_slug: string;
    title: string;
    resource_type: WorkingGroupResourceType;
    status: WorkingGroupResourceModerationSubmission['status'];
    is_removed: boolean;
    submitted_at: string;
    reviewed_at: string | null;
    summary: string | null;
    contributor_notes: string | null;
    source_url: string | null;
    tags: string[];
    reviewer_notes: string | null;
    submitter: ApiWorkingGroupResourceModerationPerson | null;
    reviewer: ApiWorkingGroupResourceModerationPerson | null;
    files: Array<{
      id: string;
      original_filename: string;
      content_type: string;
      byte_size: number;
      download_url: string | null;
    }>;
  }>;
}

function mapWorkingGroupResourceModerationSubmission(
  submission: ApiWorkingGroupResourceModerationResponse['submissions'][number]
): WorkingGroupResourceModerationSubmission {
  const mapPerson = (person: ApiWorkingGroupResourceModerationPerson | null) =>
    person
      ? { id: person.id, fullName: person.full_name, roleTitle: person.role_title }
      : null;

  return {
    id: submission.id,
    workingGroupSlug: submission.working_group_slug,
    title: submission.title,
    resourceType: submission.resource_type,
    status: submission.status,
    isRemoved: submission.is_removed,
    submittedAt: submission.submitted_at,
    reviewedAt: submission.reviewed_at,
    summary: submission.summary,
    contributorNotes: submission.contributor_notes,
    sourceUrl: submission.source_url,
    tags: submission.tags,
    reviewerNotes: submission.reviewer_notes,
    submitter: mapPerson(submission.submitter),
    reviewer: mapPerson(submission.reviewer),
    files: submission.files.map((file) => ({
      id: file.id,
      originalFilename: file.original_filename,
      contentType: file.content_type,
      byteSize: file.byte_size,
      downloadUrl: file.download_url,
    })),
  };
}

export function reviewWorkingGroupResourceSubmission(
  submissionId: string,
  input: WorkingGroupResourceReviewInput
): Promise<WorkingGroupResourceReviewResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<WorkingGroupResourceReviewResponse>();
  return request<WorkingGroupResourceReviewResponse>(ROUTES.workingGroupResourceModerationStatus(submissionId), {
    method: 'PATCH',
    body: input,
  });
}

export function removeWorkingGroupApprovedResource(submissionId: string): Promise<StatusResponse> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<StatusResponse>();
  return request<StatusResponse>(ROUTES.workingGroupResourceModerationStatus(submissionId), {
    method: 'DELETE',
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
  if (!USING_REMOTE_API) {
    return local({
      status: 'success',
      items: [],
      meta: { targetType: null, targetId: null, groupSlug: null, limit: query.limit ?? 50, offset: query.offset ?? 0, count: 0 },
    });
  }
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
  answers: Array<{ questionId: string; optionId: string }>,
  groupSlug?: string
): Promise<void> {
  if (!USING_REMOTE_API) return workingGroupsRequireApi<void>();
  if (answers.length === 0) return workingGroupsRequireApi<void>();
  return voteMemberPoll({
    pollId,
    groupSlug,
    answers,
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

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
    id: member.id,
    name: member.name,
    role: member.role,
    org: member.organization,
    initials: member.initials ?? initialsFromName(member.name),
    photo: member.photo,
    mentionHandle: member.mentionHandle,
    isCurrentMember: member.isCurrentMember,
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

export function normalizeNewsFeedPage(payload: unknown): NewsFeedPage {
  const record = objectRecord(payload, 'News feed response');
  if (record.status !== 'success') throw new Error('News feed response was not successful.');
  if (!Array.isArray(record.items) || !Array.isArray(record.relatedThreads)) {
    throw new Error('News feed response is missing its item collections.');
  }

  const items = record.items.map((row, index) => normalizeNewsFeedItem(row, `items[${index}]`));
  const relatedThreads = record.relatedThreads.map((row, index) => {
    const thread = objectRecord(row, `relatedThreads[${index}]`);
    return {
      id: requiredString(thread.id, `relatedThreads[${index}].id`),
      groupSlug: requiredString(thread.groupSlug, `relatedThreads[${index}].groupSlug`),
      title: requiredString(thread.title, `relatedThreads[${index}].title`),
    };
  });
  const selectedItem = record.selectedItem === null
    ? null
    : normalizeNewsFeedItem(record.selectedItem, 'selectedItem');

  return {
    status: 'success',
    items,
    relatedThreads,
    nextCursor: nullableRequiredString(record.nextCursor, 'nextCursor'),
    snapshotAt: requiredString(record.snapshotAt, 'snapshotAt'),
    totalMatching: nonnegativeInteger(record.totalMatching, 'totalMatching'),
    totalAvailable: nonnegativeInteger(record.totalAvailable, 'totalAvailable'),
    facets: normalizeNewsFeedFacets(record.facets),
    selectedItem,
  };
}

function normalizeNewsFeedItem(value: unknown, path: string): NewsFeedItem {
  const row = objectRecord(value, path);
  const kind = requiredString(row.kind, `${path}.kind`);
  const imageUrl = optionalHttpUrl(row.imageUrl, `${path}.imageUrl`);
  const publishedAtISO = optionalString(row.publishedAtISO);

  if (kind === 'radar') {
    const relevance = requiredString(row.relevance, `${path}.relevance`);
    if (relevance !== 'low' && relevance !== 'medium' && relevance !== 'high') {
      throw new Error(`${path}.relevance is invalid.`);
    }
    return {
      kind,
      id: requiredString(row.id, `${path}.id`),
      title: requiredString(row.title, `${path}.title`),
      sourceName: requiredString(row.sourceName, `${path}.sourceName`),
      url: requiredHttpUrl(row.url, `${path}.url`),
      summary: requiredString(row.summary, `${path}.summary`),
      whyItMatters: requiredString(row.whyItMatters, `${path}.whyItMatters`),
      topic: requiredString(row.topic, `${path}.topic`),
      relevance,
      publishedAt: requiredString(row.publishedAt, `${path}.publishedAt`),
      ...(publishedAtISO ? { publishedAtISO } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(optionalString(row.tickerTag) ? { tickerTag: optionalString(row.tickerTag) } : {}),
      ...(row.relatedThreadIds === undefined
        ? {}
        : { relatedThreadIds: stringArray(row.relatedThreadIds, `${path}.relatedThreadIds`) }),
    };
  }

  if (kind !== 'gpfa') throw new Error(`${path}.kind is invalid.`);
  const articleType = requiredString(row.articleType, `${path}.articleType`);
  const articleTypes = ['GPFA Update', 'Industry Article', 'Member Announcement', 'Award'] as const;
  if (!articleTypes.includes(articleType as (typeof articleTypes)[number])) {
    throw new Error(`${path}.articleType is invalid.`);
  }
  if (typeof row.isMemberOnly !== 'boolean') throw new Error(`${path}.isMemberOnly is invalid.`);
  const body = optionalString(row.body);
  const externalUrl = optionalHttpUrl(row.externalUrl, `${path}.externalUrl`);
  const topic = optionalString(row.topic);
  return {
    kind,
    id: requiredString(row.id, `${path}.id`),
    slug: requiredString(row.slug, `${path}.slug`),
    title: requiredString(row.title, `${path}.title`),
    articleType: articleType as (typeof articleTypes)[number],
    ...(topic ? { topic } : {}),
    topics: stringArray(row.topics, `${path}.topics`),
    excerpt: requiredString(row.excerpt, `${path}.excerpt`, true),
    ...(body ? { body } : {}),
    sourceName: requiredString(row.sourceName, `${path}.sourceName`),
    publishedAt: requiredString(row.publishedAt, `${path}.publishedAt`),
    ...(publishedAtISO ? { publishedAtISO } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(externalUrl ? { externalUrl } : {}),
    isMemberOnly: row.isMemberOnly,
  };
}

function normalizeNewsFeedFacets(value: unknown): NewsFeedFacets {
  const facets = objectRecord(value, 'facets');
  const sources = objectRecord(facets.sources, 'facets.sources');
  if (!Array.isArray(facets.topics)) throw new Error('facets.topics is invalid.');
  return {
    topics: facets.topics.map((value, index) => {
      const topic = objectRecord(value, `facets.topics[${index}]`);
      return {
        value: requiredString(topic.value, `facets.topics[${index}].value`),
        count: nonnegativeInteger(topic.count, `facets.topics[${index}].count`),
      };
    }),
    sources: {
      gpfa: nonnegativeInteger(sources.gpfa, 'facets.sources.gpfa'),
      industry: nonnegativeInteger(sources.industry, 'facets.sources.industry'),
    },
    allTopicsCount: nonnegativeInteger(facets.allTopicsCount, 'facets.allTopicsCount'),
    allSourcesCount: nonnegativeInteger(facets.allSourcesCount, 'facets.allSourcesCount'),
  };
}

function createFixtureNewsFeedPage(input: NewsFeedRequest): NewsFeedPage {
  const canonical = NEWS_STORIES.map(legacyNewsStoryToFeedItem);
  const source = input.source ?? 'all';
  const topic = input.topic?.toLowerCase();
  const matching = canonical.filter((item) =>
    (source === 'all' || (source === 'gpfa' ? item.kind === 'gpfa' : item.kind === 'radar'))
    && (!topic || topic === 'all' || item.topic?.toLowerCase() === topic)
  );
  const offset = input.cursor ? Number(input.cursor.replace('fixture:', '')) : 0;
  const limit = input.limit ?? 18;
  const items = matching.slice(offset, offset + limit);
  const topicCounts = new Map<string, number>();
  canonical.forEach((item) => {
    if (item.topic) topicCounts.set(item.topic, (topicCounts.get(item.topic) ?? 0) + 1);
  });
  return {
    status: 'success',
    items,
    relatedThreads: [],
    nextCursor: offset + items.length < matching.length ? `fixture:${offset + items.length}` : null,
    snapshotAt: input.snapshotAt ?? new Date().toISOString(),
    totalMatching: matching.length,
    totalAvailable: canonical.length,
    facets: {
      topics: [...topicCounts].map(([value, count]) => ({ value, count })),
      sources: {
        gpfa: canonical.filter((item) => item.kind === 'gpfa').length,
        industry: canonical.filter((item) => item.kind === 'radar').length,
      },
      allTopicsCount: canonical.length,
      allSourcesCount: canonical.length,
    },
    selectedItem: input.story ? canonical.find((item) => item.id === input.story) ?? null : null,
  };
}

function legacyNewsStoryToFeedItem(story: NewsStory): NewsFeedItem {
  const sourceName = story.meta.split(' · ')[0] || 'GPFA';
  const publishedAt = story.publishedAt ?? story.meta.split(' · ').at(-1) ?? 'Recent';
  if (story.kind === 'radar') {
    if (!story.url) throw new Error(`Fixture radar story ${story.id} requires a URL.`);
    return {
      kind: 'radar', id: story.id, title: story.title, sourceName, url: story.url,
      summary: story.body, whyItMatters: story.body, topic: story.topic,
      relevance: story.rel ?? 'low', publishedAt,
      ...(story.ticker ? { tickerTag: story.ticker } : {}),
    };
  }
  return {
    kind: 'gpfa', id: story.id, slug: story.id, title: story.title,
    articleType: 'GPFA Update', topic: story.topic, topics: story.topics ?? [],
    excerpt: story.body, body: story.body, sourceName, publishedAt,
    isMemberOnly: story.memberOnly ?? false,
  };
}

function objectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} is invalid.`);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error(`${path} is invalid.`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function nullableRequiredString(value: unknown, path: string): string | null {
  return value === null ? null : requiredString(value, path);
}

function nonnegativeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`${path} is invalid.`);
  return value;
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${path} is invalid.`);
  }
  return value.map((item) => (item as string).trim());
}

function requiredHttpUrl(value: unknown, path: string): string {
  const resolved = absoluteResourceHref(requiredString(value, path));
  if (!resolved) throw new Error(`${path} must be an HTTP(S) URL.`);
  return resolved;
}

function optionalHttpUrl(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredHttpUrl(value, path);
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
    ...(dateLabel ? { publishedAt: dateLabel } : {}),
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
  const artifact = normalizeResourceArtifact(record.artifact);

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
    artifact,
    ...(href ? { href } : {}),
  };
}

function normalizeResourceArtifact(value: unknown): ResourceArtifact {
  if (!value || typeof value !== 'object') return { kind: 'none' };
  const artifact = value as Record<string, unknown>;
  const kind = firstString(artifact.kind);

  if (kind === 'file') {
    const href = absoluteResourceHref(firstString(artifact.href));
    if (!href) return { kind: 'none' };
    const byteSize = numberFrom(artifact.byteSize, artifact.byte_size);
    return {
      kind: 'file',
      href,
      ...(firstString(artifact.fileName, artifact.file_name)
        ? { fileName: firstString(artifact.fileName, artifact.file_name) }
        : {}),
      ...(firstString(artifact.contentType, artifact.content_type)
        ? { contentType: firstString(artifact.contentType, artifact.content_type) }
        : {}),
      ...(byteSize !== undefined && byteSize >= 0 ? { byteSize } : {}),
      previewable: artifact.previewable === true,
    };
  }

  if (kind === 'external') {
    const href = safeExternalResourceUrl(firstString(artifact.href));
    return href ? { kind: 'external', href } : { kind: 'none' };
  }

  return { kind: 'none' };
}

function safeExternalResourceUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
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
    authorId: item.author.id,
    author: item.author.name,
    initials: initialsFromName(item.author.name),
    org: authorOrg,
    time: item.dateLabel,
    state: item.lifecycle === 'closed' ? 'Closed' : item.lifecycle === 'resolved' ? 'Answered' : undefined,
    lifecycle: item.lifecycle,
    body: item.excerpt ?? '',
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
    parentPostId: reply.parentPostId,
    authorId: reply.author.id ?? undefined,
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
  const answers = arrayOfRecords(detail.answers).map((answer) => {
    const questionId = firstString(answer.questionId, answer.question_id);
    const optionId = firstString(answer.optionId, answer.option_id);
    if (!questionId || !optionId) {
      throw new Error('The poll contains an invalid member answer.');
    }
    return { questionId, optionId };
  });
  const resultByQuestion = new Map(
    arrayOfRecords(detail.results).map((result) => {
      const questionId = firstString(result.questionId, result.question_id);
      if (!questionId) throw new Error('The poll contains invalid results.');
      return [questionId, result] as const;
    })
  );
  const id = firstString(poll.id) ?? fallback?.id;
  if (!id || questions.length === 0) {
    throw new Error('The poll contains no valid questions.');
  }

  return {
    id,
    closes: poll.closedAt ? 'Closed' : firstString(poll.closesLabel, poll.closesAt) ?? fallback?.closes ?? 'Open',
    closesAt: firstString(poll.closesAt, poll.closes_at) ?? null,
    closedAt: firstString(poll.closedAt, poll.closed_at) ?? null,
    questions: questions.map((question) => {
      const questionId = firstString(question.id, question.questionId);
      const text = firstString(question.text, question.title);
      const options = arrayOfRecords(question.options);
      if (!questionId || !text || options.length < 2) {
        throw new Error('The poll contains an invalid question.');
      }
      const result = resultByQuestion.get(questionId);
      const resultOptions = arrayOfRecords(result?.options);
      return {
        id: questionId,
        text,
        options: options.map((option) => pollOptionFromDetail(option, resultOptions)),
      };
    }),
    answers,
    hasSubmitted: booleanFrom(poll.hasSubmitted, poll.has_submitted) ?? false,
    responseCount: numberFrom(poll.totalResponses, poll.total_responses) ?? 0,
  };
}

function pollOptionFromDetail(
  option: Record<string, unknown>,
  results: Array<Record<string, unknown>>
): PollOption {
  const id = firstString(option.id, option.optionId) ?? '';
  const label = firstString(option.label, option.text, option.title);
  if (!id || !label) throw new Error('The poll contains an invalid option.');
  const result = results.find(
    (row) => firstString(row.id, row.optionId, row.option_id) === id
  );
  return {
    id,
    label,
    votes: numberFrom(result?.votes, result?.voteCount, option.votes, option.voteCount) ?? 0,
    percentage: numberFrom(result?.percentage, option.percentage) ?? 0,
  };
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
  homeThreads: HomeThreadPreview[],
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
      authorId: thread.authorId,
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

function homeImmediateActionsFixture(): HomeImmediateActionsResponse {
  const now = new Date();
  const hour = now.getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const actions: HomeImmediateAction[] = [];
  const survey = MEMBER_UPDATES.surveys.find(
    (item) => item.status !== 'submitted' && item.status !== 'closed'
  );
  if (ANNUAL_MEETING.registrationOpen && ANNUAL_MEETING.registrationStatus === 'Not registered') {
    actions.push({
      id: 'annual-meeting-registration',
      kind: 'annual-meeting',
      title: `Register for ${ANNUAL_MEETING.title}`,
      description: `${ANNUAL_MEETING.dateLabel} · ${ANNUAL_MEETING.location}`,
      href: '/members/annual-meeting#register',
      actionLabel: 'Register now',
    });
  }
  if (survey) {
    actions.push({
      id: survey.id,
      kind: 'survey',
      title: survey.title,
      description: survey.description || survey.closesLabel,
      href: `/members/surveys/${survey.id}`,
      actionLabel: 'Answer survey',
    });
  }
  const announcement = MEMBER_UPDATES.announcements.find((item) => item.unread);
  if (announcement) {
    actions.push({
      id: announcement.id,
      kind: 'announcement',
      title: announcement.title,
      description: announcement.summary,
      href: `/members/notifications/${announcement.notificationId}`,
      actionLabel: 'Read it',
      notificationId: announcement.notificationId,
    });
  }
  return {
    status: 'success',
    masthead: {
      title: `Good ${period},`,
      italic: `${MEMBER.firstName}.`,
      edition: new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(now),
    },
    actions: actions.slice(0, 3),
  };
}

function workingGroupsFixture(): WorkingGroupsData {
  const memberIdForName = (name: string) =>
    DIRECTORY_PEOPLE.find((person) => person.name === name)?.id;
  const groups = GROUPS.map((group) => ({
    ...group,
    threads: group.threads.map((thread) => ({
      ...thread,
      authorId: thread.authorId ?? memberIdForName(thread.author),
      replies: thread.replies.map((reply) => ({
        ...reply,
        authorId: reply.authorId ?? memberIdForName(reply.a),
      })),
    })),
  }));
  const joined = groups.filter((group) => group.joined);
  return {
    groups,
    home: {
      groups: joined.map((group) => ({
        slug: group.slug ?? group.id,
        href: `/members/groups/${group.slug ?? group.id}`,
        name: group.n,
        unread: group.unread || null,
      })),
      threads: joined
        .flatMap((group) =>
          group.threads.map((thread) => ({
            id: thread.id,
            href: `/members/groups/${group.slug ?? group.id}/${thread.id}`,
            title: thread.title,
            groupName: group.n,
            authorId: thread.authorId,
            authorName: thread.author,
            replies: thread.replies.length,
            age: thread.time,
            unread: group.unread > 0,
            participants: thread.authorId
              ? [{
                  id: thread.authorId,
                  name: thread.author,
                  initials: thread.initials ?? initialsFromName(thread.author),
                }]
              : [],
          }))
        )
        .slice(0, 4),
    },
  };
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

function firstString(...values: unknown[]): string | undefined {
  return values.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim();
}

function nullableString(...values: unknown[]): string | null | undefined {
  const value = values.find((v) => v === null || typeof v === 'string');
  return typeof value === 'string' ? value.trim() : value;
}
