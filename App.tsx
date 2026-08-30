import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Animated, AppState, Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Imported per weight, not from the package root — the root index re-exports
// every weight and italic, which pulls ~30 unused TTFs into the bundle.
import Inter_400Regular from '@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf';
import Inter_500Medium from '@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf';
import Inter_600SemiBold from '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf';
import Inter_700Bold from '@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf';
import JetBrainsMono_400Regular from '@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf';
import JetBrainsMono_500Medium from '@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf';
import JetBrainsMono_600SemiBold from '@expo-google-fonts/jetbrains-mono/600SemiBold/JetBrainsMono_600SemiBold.ttf';

import MemberSheet from './src/components/MemberSheet';
import NotificationArrivalBanner from './src/components/NotificationArrivalBanner';
import AskConversationHistory from './src/components/ask-gpfa/AskConversationHistory';
import type { MutationNoticeValue } from './src/components/MutationNotice';
import NotificationsSheet from './src/components/NotificationsSheet';
import PortalTabBar, { TAB_IDS, type TabId } from './src/components/PortalTabBar';
import PostComposer from './src/components/PostComposer';
import ResourceViewer from './src/components/ResourceViewer';
import PodcastNowPlayingBar from './src/components/podcast/PodcastNowPlayingBar';
import { PodcastPlayerProvider } from './src/components/podcast/PlayerProvider';
import ResourceSubmissionComposer from './src/components/groups/ResourceSubmissionComposer';
import { ThemeProvider, useTheme } from './src/ds/ThemeProvider';
import AccountScreen from './src/screens/AccountScreen';
import EmailPreferencesScreen from './src/screens/EmailPreferencesScreen';
import AskScreen from './src/screens/AskScreen';
import AnnualMeetingScreen from './src/screens/AnnualMeetingScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import EventsScreen from './src/screens/EventsScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import HomeScreen from './src/screens/HomeScreen';
import DirectoryMemberProfileScreen from './src/screens/DirectoryMemberProfileScreen';
import MentionHistoryScreen from './src/screens/MentionHistoryScreen';
import MoreScreen from './src/screens/MoreScreen';
import NewsScreen from './src/screens/NewsScreen';
import ProfileSettingsScreen from './src/screens/ProfileSettingsScreen';
import SecuritySettingsScreen from './src/screens/SecuritySettingsScreen';
import UpvoteHistoryScreen from './src/screens/UpvoteHistoryScreen';
import ResourcesScreen, { type ResourcesNavigationRequest } from './src/screens/ResourcesScreen';
import SignInScreen from './src/screens/SignInScreen';
import UpdatesScreen, {
  type UpdateSelection,
} from './src/screens/UpdatesScreen';
import {
  addMessageConversationMembers,
  castVote,
  createPost as createPostRequest,
  createReply,
  deleteForumReply,
  deleteForumThread,
  deleteMemberPoll,
  dismissNotifications,
  getAnnualMeeting,
  getAskConversation,
  getAskConversations,
  getAskSuggestions,
  getDirectoryPeople,
  getDirectoryMemberProfile,
  getDirectoryMemberProfileActivity,
  getEvents,
  getFeed,
  getHomeImmediateActions,
  getJobs,
  getMemberOrgs,
  getMemberEmailPreferences,
  getMemberMentions,
  getMemberUpvotes,
  getMemberUpdates,
  getLibrary,
  getMe,
  getNews,
  getMemberReposts,
  getMemberPoll,
  getMessageConversation,
  getMessageConversations,
    leaveMessageConversation,
  getNotifications,
  getPodcasts,
  getPodcastTranscript,
  refreshPodcastEpisode,
  getWorkingGroupCoLeadMembers,
  getWorkingGroupDirectoryMembers,
  getWorkingGroupResources,
  getWorkingGroupResourceModeration,
  getWorkingGroupTagUsage,
  getWorkingGroupThreadFeed,
  getWorkingGroupMembership,
  getWorkingGroupFeedItemDetail,
  getWorkingGroups,
  importLinkedInMemberAvatar,
  markNotificationsRead,
  markMessageConversationRead,
  requestPasswordChange,
  removeMemberAvatar,
  renameMessageConversation,
  removeWorkingGroupApprovedResource,
  resolveDirectMessageConversation,
  resolveGroupMessageConversation,
  sendMemberMessage,
  setMessageReaction,
  setEventRsvp,
  setRsvp as setRsvpRequest,
  setReposted as setRepostedRequest,
  setSubscribed as setSubscribedRequest,
  setUpvote,
  streamAskGpfa,
  submitWorkingGroupResource,
  reviewWorkingGroupResourceSubmission,
  submitSurveyResponse,
  saveAnnualMeetingRegistration,
  summarizeForum,
  updateForumThread,
  updateForumThreadStatus,
  updateMemberPoll,
  updateMemberEmailPreference,
  updateOwnProfile,
  updateMemberHandle,
  uploadMemberAvatar,
  workingGroupFeedItemResponseToEntry,
} from './src/api/portal';
import { useQuery } from './src/api/useQuery';
import { ApiError, RequestCancelledError } from './src/api/client';
import { GPFA_WEB_ORIGIN } from './src/api/config';
import { getAccessToken } from './src/api/tokens';
import { sharePodcastDownload } from './src/api/podcast-download';
import { addEventToDeviceCalendar, shareEventIcs } from './src/lib/event-device-actions';
import { memberDirectoryDestination } from './src/lib/member-directory-route';
import { notificationDestination } from './src/lib/notification-navigation';
import {
  dismissNotificationItems,
  markNotificationItemsRead,
  notificationIsBeforeMemberJoin,
  prependNotificationItem,
} from './src/lib/notification-state';
import { subscribeToNotificationInserts } from './src/api/notifications-realtime';
import { normalizeNotification } from './src/api/notification-normalization';
import { DEFAULT_WORKING_GROUP_FEED_CONTROLS } from './src/lib/workingGroupFeedControls';
import type {
  AskConversationSummary,
  AskDisplayMessage,
  AskMessage,
  AskSource,
  AskStreamEvent,
  ConversationDetail,
  ConversationSummary,
  DirectoryMemberProfile,
  AnnualMeetingPreview,
  EventRsvpState,
  FeedEntry,
  ForumAttachment,
  GroupMember,
  HomeImmediateAction,
  HomeThreadPreview,
  LibraryResource,
  Member,
  MemberProfileActivityKind,
  MemberProfileActivityItem,
  MemberEmailPreferenceKey,
  MemberPoll,
  MemberPollUpdateInput,
  MemberNotification,
  MemberOrg,
  MemberRepost,
  MobileEventPreview,
  MessageItem,
  MessageReaction,
  MessagingParticipant,
  NewPostInput,
  NewsStory,
  PodcastEpisode,
  PodcastPerson,
  Reply,
  RsvpChoice,
  Thread,
  WorkingGroupFeedItemResponse,
  WorkingGroupFeedControls,
  WorkingGroupResourceSubmissionInput,
  WorkingGroupResourceModerationSubmission,
  WorkingGroupResourceReviewInput,
} from './src/api/types';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { MemberProvider } from './src/auth/MemberProvider';
import DataGate from './src/components/DataGate';
import { openForumAttachment as openForumAttachmentFile } from './src/lib/forumAttachments';
import { mergeAskMessages } from './src/lib/ask-gpfa-core';
import { loadActiveAskConversation, saveActiveAskConversation } from './src/lib/ask-gpfa-session';
import { askSourceDestination, trustedAskSourceUrl } from './src/lib/ask-source-navigation';
import {
  advanceAskResearchPhase,
  askDurationSeconds,
  completeAskTraceRow,
  finalizeAskTrace,
} from './src/api/ask-stream';

// The design exposes these as editor props on the component.
const DEFAULT_TAB: TabId = 'home';
const DARK_MODE = false;
const SHOW_BADGES = true;

const EMPTY_WORKING_GROUPS = { groups: [], home: { groups: [], threads: [] } };

interface GroupDetailState {
  items: FeedEntry[];
  nextCursor: string | null;
  snapshotAt: string | null;
  totalMatching: number;
  coLeads: GroupMember[];
  members: GroupMember[];
  resources: LibraryResource[];
  membershipRole: 'member' | 'co_lead' | null;
  tagSuggestions: string[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
}

const EMPTY_GROUP_DETAIL: GroupDetailState = {
  items: [],
  nextCursor: null,
  snapshotAt: null,
  totalMatching: 0,
  coLeads: [],
  members: [],
  resources: [],
  membershipRole: null,
  tagSuggestions: [],
  loading: false,
  loadingMore: false,
  error: null,
};

const DEFAULT_FEED_CONTROLS: WorkingGroupFeedControls =
  DEFAULT_WORKING_GROUP_FEED_CONTROLS;

interface ResourceModerationState {
  submissions: WorkingGroupResourceModerationSubmission[];
  loading: boolean;
  error: Error | null;
}

const EMPTY_RESOURCE_MODERATION: ResourceModerationState = {
  submissions: [],
  loading: false,
  error: null,
};

type MoreView =
  | 'root'
  | 'account'
  | 'edit-profile'
  | 'email-preferences'
  | 'mentions'
  | 'upvotes'
  | 'security'
  | 'annual-meeting'
  | 'updates'
  | 'events'
  | 'resources';

function Portal() {
  const { t, preference: themePreference, setPreference: setThemePreference } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const tabTranslateX = useRef(new Animated.Value(0)).current;

  const { isSignedIn, status, signOut, signingOut } = useAuth();
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB);
  const [moreView, setMoreView] = useState<MoreView>('root');
  const [eventRequest, setEventRequest] = useState<{ id: string; n: number } | null>(null);
  const [updateRequest, setUpdateRequest] = useState<{
    selection: UpdateSelection | null;
    n: number;
  }>({ selection: null, n: 0 });
  const [previewRsvps, setPreviewRsvps] = useState<Record<string, EventRsvpState | undefined>>({});
  const [surveySubmissions, setSurveySubmissions] = useState<Record<string, boolean | undefined>>({});
  // News Radar is a branch of Home, not a tab — the design's caret returns there.
  const [newsOpen, setNewsOpen] = useState(false);
  // The Resources hub links to it too. Tracked separately so the caret goes
  // back to whichever hub opened it.
  const [resourcesNewsOpen, setResourcesNewsOpen] = useState(false);
  // The Groups tab is a directory; this is the group whose page is open.
  const [groupId, setGroupId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<Record<string, GroupDetailState | undefined>>({});
  const groupDetailsRef = useRef(groupDetails);
  const feedRequestGeneration = useRef<Record<string, number>>({});
  const [feedControls, setFeedControls] = useState<Record<string, WorkingGroupFeedControls | undefined>>({});
  const [mutationNotice, setMutationNotice] = useState<MutationNoticeValue | null>(null);
  const [pendingMutations, setPendingMutations] = useState<Record<string, boolean | undefined>>({});
  const [pollEditors, setPollEditors] = useState<Record<string, MemberPoll | undefined>>({});
  const [pollEditorErrors, setPollEditorErrors] = useState<Record<string, string | undefined>>({});
  const [postSummaries, setPostSummaries] = useState<Record<string, string | undefined>>({});
  const [summarizing, setSummarizing] = useState<Record<string, boolean | undefined>>({});
  // Replies the member posts are kept outside the static data, keyed by thread.
  const [extraReplies, setExtraReplies] = useState<Record<string, Reply[] | undefined>>({});
  const [votes, setVotes] = useState<Record<string, number | undefined>>({});
  const [upvoted, setUpvoted] = useState<Record<string, boolean | undefined>>({});
  const [reposted, setReposted] = useState<Record<string, boolean | undefined>>({});
  // Overrides on each group's own `joined`; absent means unchanged this session.
  const [subscribed, setSubscribed] = useState<Record<string, boolean | undefined>>({});
  const [rsvps, setRsvps] = useState<Record<string, RsvpChoice | undefined>>({});
  // Posts composed this session, newest first. Kept out of the static data.
  const [newPosts, setNewPosts] = useState<FeedEntry[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [resourceComposerGroupId, setResourceComposerGroupId] = useState<string | null>(null);
  const [resourceSubmitting, setResourceSubmitting] = useState(false);
  const [resourceModeration, setResourceModeration] = useState<
    Record<string, ResourceModerationState | undefined>
  >({});
  const [moderationPendingSubmissionId, setModerationPendingSubmissionId] = useState<string | null>(null);
  const [resourceViewer, setResourceViewer] = useState<{
    resource: LibraryResource;
    accessToken: string | null;
  } | null>(null);
  // The member's own profile, reached from the header avatar on any tab: the
  // quick sheet first, then the full profile over whichever tab is underneath.
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTargetId, setProfileTargetId] = useState<string | null>(null);
  const [profileActivityKind, setProfileActivityKind] = useState<MemberProfileActivityKind>('posts');
  const [profileActivityPage, setProfileActivityPage] = useState(1);
  const [pendingEmailPreference, setPendingEmailPreference] = useState<MemberEmailPreferenceKey | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<MemberNotification[]>([]);
  const [notificationMemberCreatedAt, setNotificationMemberCreatedAt] = useState<string | null>(null);
  const [notificationArrivals, setNotificationArrivals] = useState<MemberNotification[]>([]);
  const notificationIdsRef = useRef(new Set<string>());
  const [pendingNotifications, setPendingNotifications] = useState<Record<string, boolean | undefined>>({});
  const [messageConversations, setMessageConversations] = useState<ConversationSummary[]>([]);
  const [activeMessageConversationId, setActiveMessageConversationId] = useState<string | null>(null);
  const [activeMessageConversation, setActiveMessageConversation] = useState<ConversationDetail | null>(null);
  const [draftMessageRecipient, setDraftMessageRecipient] = useState<MessagingParticipant | null>(null);
  const [draftGroupParticipants, setDraftGroupParticipants] = useState<MessagingParticipant[]>([]);
  const [messageItems, setMessageItems] = useState<MessageItem[]>([]);
  const [messageConversationLoading, setMessageConversationLoading] = useState(false);
  const [messageConversationError, setMessageConversationError] = useState<Error | null>(null);
  const [messageSending, setMessageSending] = useState(false);
  const [resolvingMessageMemberId, setResolvingMessageMemberId] = useState<string | null>(null);
  const [resolvingMessageGroup, setResolvingMessageGroup] = useState(false);
  const [messageLoadingOlder, setMessageLoadingOlder] = useState(false);
  const [messageHasOlder, setMessageHasOlder] = useState(false);
  const [messageActionPending, setMessageActionPending] = useState(false);
  const [askConversations, setAskConversations] = useState<AskConversationSummary[]>([]);
  const [activeAskConversationId, setActiveAskConversationId] = useState<string | null>(null);
  const [askMessages, setAskMessages] = useState<AskDisplayMessage[]>([]);
  const [askConversationLoading, setAskConversationLoading] = useState(false);
  const [askConversationError, setAskConversationError] = useState<Error | null>(null);
  const [askSending, setAskSending] = useState(false);
  const [askLoadingEarlier, setAskLoadingEarlier] = useState(false);
  const [askHasEarlier, setAskHasEarlier] = useState(false);
  const [askEarlierCursor, setAskEarlierCursor] = useState<string | null>(null);
  const [askHistoryOpen, setAskHistoryOpen] = useState(false);
  const askRequestGeneration = useRef(0);
  const askAbortController = useRef<AbortController | null>(null);
  const askFlushText = useRef<(() => void) | null>(null);
  const restoredAskMemberId = useRef<string | null>(null);
  const askStateMemberId = useRef<string | null>(null);

  // Portal data. Member-scoped ready routes wait for sign-in; the rest can stay
  // fixture-backed while EXPO_PUBLIC_FIXTURE_PORTAL_DATA is true.
  const meQuery = useQuery(
    () => (isSignedIn ? getMe() : Promise.resolve(null)),
    [isSignedIn]
  );
  const emailPreferencesQuery = useQuery(
    () =>
      isSignedIn && moreView === 'email-preferences'
        ? getMemberEmailPreferences()
        : Promise.resolve(null),
    [isSignedIn, moreView]
  );
  const mentionsQuery = useQuery(
    () =>
      isSignedIn && moreView === 'mentions'
        ? getMemberMentions()
        : Promise.resolve([]),
    [isSignedIn, moreView]
  );
  const upvotesQuery = useQuery(
    () =>
      isSignedIn && moreView === 'upvotes'
        ? getMemberUpvotes()
        : Promise.resolve(null),
    [isSignedIn, moreView]
  );
  const groupsQuery = useQuery(
    () => (isSignedIn ? getWorkingGroups() : Promise.resolve(EMPTY_WORKING_GROUPS)),
    [isSignedIn]
  );
  const homeActionsQuery = useQuery(
    () => (isSignedIn ? getHomeImmediateActions() : Promise.resolve(undefined)),
    [isSignedIn]
  );
  const feedQuery = useQuery(getFeed, []);
  const libraryQuery = useQuery(
    () => (isSignedIn ? getLibrary() : Promise.resolve({ resources: [], newsRadar: [] })),
    [isSignedIn]
  );
  const newsQuery = useQuery(
    () => (isSignedIn ? getNews() : Promise.resolve([])),
    [isSignedIn]
  );
  const podcastQuery = useQuery(
    () => (isSignedIn ? getPodcasts() : Promise.resolve([])),
    [isSignedIn]
  );
  const jobsQuery = useQuery(getJobs, []);
  const orgsQuery = useQuery(
    () => (isSignedIn ? getMemberOrgs() : Promise.resolve([])),
    [isSignedIn]
  );
  const directoryPeopleQuery = useQuery(
    () => (isSignedIn ? getDirectoryPeople() : Promise.resolve([])),
    [isSignedIn]
  );
  const directoryProfileQuery = useQuery<DirectoryMemberProfile | null>(
    () =>
      isSignedIn && profileOpen && profileTargetId
        ? getDirectoryMemberProfile(profileTargetId)
        : Promise.resolve(null),
    [isSignedIn, profileOpen, profileTargetId]
  );
  const directoryProfileActivityQuery = useQuery(
    () =>
      isSignedIn && profileOpen && profileTargetId
        ? getDirectoryMemberProfileActivity(
            profileTargetId,
            profileActivityKind,
            profileActivityPage
          )
        : Promise.resolve(null),
    [isSignedIn, profileOpen, profileTargetId, profileActivityKind, profileActivityPage]
  );
  const messageConversationsQuery = useQuery(
    () =>
      isSignedIn
        ? getMessageConversations()
        : Promise.resolve({ status: 'success' as const, conversations: [], totalUnread: 0 }),
    [isSignedIn]
  );
  const askSuggestionsQuery = useQuery(getAskSuggestions, []);
  const askConversationsQuery = useQuery(
    () => (isSignedIn ? getAskConversations() : Promise.resolve([])),
    [isSignedIn]
  );
  const shouldLoadReposts = isSignedIn && profileSheetOpen;
  const repostsQuery = useQuery(
    () =>
      shouldLoadReposts
        ? getMemberReposts(groupsQuery.data?.groups ?? [])
        : Promise.resolve([]),
    [shouldLoadReposts, groupsQuery.data]
  );
  const notificationsQuery = useQuery(
    () =>
      isSignedIn
        ? getNotifications()
        : Promise.resolve({ memberCreatedAt: null, notifications: [] }),
    [isSignedIn]
  );
  const eventsQuery = useQuery(
    () => (isSignedIn ? getEvents() : Promise.resolve([])),
    [isSignedIn]
  );
  const updatesQuery = useQuery(
    () => (isSignedIn ? getMemberUpdates() : Promise.resolve({ announcements: [], surveys: [] })),
    [isSignedIn]
  );
  const annualMeetingQuery = useQuery(
    () => (isSignedIn ? getAnnualMeeting() : Promise.resolve(null)),
    [isSignedIn]
  );
  const [annualMeetingOverride, setAnnualMeetingOverride] = useState<AnnualMeetingPreview | null>(null);

  useEffect(() => {
    if (annualMeetingQuery.data !== undefined) {
      setAnnualMeetingOverride(annualMeetingQuery.data);
    }
  }, [annualMeetingQuery.data]);

  // DataGate blocks member-dependent screens until this query resolves.
  const member: Member = meQuery.data ?? { id: '', name: '', firstName: '', org: '' };

  useEffect(() => {
    const data = notificationsQuery.data;
    setLocalNotifications(data?.notifications ?? []);
    setNotificationMemberCreatedAt(data?.memberCreatedAt ?? null);
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (!isSignedIn) {
      setLocalNotifications([]);
      setNotificationMemberCreatedAt(null);
      setNotificationArrivals([]);
    }
  }, [isSignedIn]);

  useEffect(() => {
    notificationIdsRef.current = new Set(localNotifications.map(({ id }) => id));
  }, [localNotifications]);

  useEffect(() => {
    setMessageConversations(messageConversationsQuery.data?.conversations ?? []);
  }, [messageConversationsQuery.data]);

  useEffect(() => {
    setAskConversations(askConversationsQuery.data ?? []);
  }, [askConversationsQuery.data]);

  useEffect(() => {
    if (isSignedIn) return;
    setActiveMessageConversationId(null);
    setActiveMessageConversation(null);
    setDraftMessageRecipient(null);
    setDraftGroupParticipants([]);
    setMessageItems([]);
    askFlushText.current?.();
    askAbortController.current?.abort();
    askAbortController.current = null;
    askFlushText.current = null;
    askRequestGeneration.current += 1;
    restoredAskMemberId.current = null;
    setAskConversations([]);
    setActiveAskConversationId(null);
    setAskMessages([]);
    setAskConversationError(null);
    setAskConversationLoading(false);
    setAskSending(false);
    setAskHasEarlier(false);
    setAskEarlierCursor(null);
    setAskHistoryOpen(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (!member.id || askStateMemberId.current === member.id) return;
    askStateMemberId.current = member.id;
    askFlushText.current?.();
    askAbortController.current?.abort();
    askAbortController.current = null;
    askFlushText.current = null;
    askRequestGeneration.current += 1;
    setActiveAskConversationId(null);
    setAskMessages([]);
    setAskConversationError(null);
    setAskHasEarlier(false);
    setAskEarlierCursor(null);
    setAskHistoryOpen(false);
  }, [member.id]);

  useEffect(() => () => {
    askAbortController.current?.abort();
  }, []);

  // What another screen asked Resources to open: an episode from the
  // now-playing bar, or a posting from an organization's directory profile.
  // A sequence lets the same destination be requested twice without using a
  // React key that destroys the entire Resources navigation state.
  const [resourcesRequest, setResourcesRequest] = useState<(
    ResourcesNavigationRequest & {
      kind: 'episode' | 'podcasts' | 'job' | 'job-board';
      id: string;
      returnTab: TabId;
      returnMoreView: MoreView;
    }
  ) | null>(null);

  const openInResources = useCallback((
    kind: 'episode' | 'job',
    id: string,
    origin: ResourcesNavigationRequest['origin'] = 'return'
  ) => {
    setResourcesRequest((prev) => ({
      kind,
      id,
      sequence: (prev?.sequence ?? 0) + 1,
      origin,
      view: kind === 'episode' ? 'podcasts' : 'jobs',
      ...(kind === 'episode' ? { episodeSlug: id } : { jobId: id }),
      returnTab: tab,
      returnMoreView: moreView,
      returnWithinResources: tab === 'more' && moreView === 'resources',
    }));
    setResourcesNewsOpen(false);
    setMoreView('resources');
    setTab('more');
  }, [moreView, tab]);

  const openResource = useCallback((resource: LibraryResource) => {
    if (!resource.href) return;

    void getAccessToken().then((accessToken) => {
      setResourceViewer({ resource, accessToken });
    });
  }, []);

  const openForumAttachment = useCallback((attachment: ForumAttachment) => {
    if (!attachment.href) return;
    void getAccessToken()
      .then((accessToken) => openForumAttachmentFile(attachment, accessToken))
      .catch((cause) => {
        Alert.alert(
          'Could not open attachment',
          cause instanceof Error ? cause.message : 'The attachment could not be opened.'
        );
      });
  }, []);

  // Which organization the Directory tab should open on when another screen
  // links into it — the profile's Organization card. Counted like
  // `resourcesRequest`, so asking for the same org twice still remounts.
  const [directoryRequest, setDirectoryRequest] = useState<{
    orgId: string;
    openMessages?: boolean;
    n: number;
  } | null>(null);

  // Handed to MemberProvider, so the header avatar on every screen opens it.
  const openProfileSheet = useCallback(() => setProfileSheetOpen(true), []);

  const openNotifications = useCallback(() => {
    notificationsQuery.refetch();
    setNotificationsOpen(true);
  }, [notificationsQuery.refetch]);

  const openProfile = useCallback(() => {
    if (!meQuery.data?.id) return;
    setProfileSheetOpen(false);
    setProfileTargetId(meQuery.data.id);
    setProfileActivityKind('posts');
    setProfileActivityPage(1);
    setProfileOpen(true);
  }, [meQuery.data?.id]);

  const openDirectoryProfile = useCallback((memberId: string) => {
    setProfileTargetId(memberId);
    setProfileActivityKind('posts');
    setProfileActivityPage(1);
    setProfileOpen(true);
  }, []);

  const openOrgInDirectory = useCallback((org: MemberOrg) => {
    setDirectoryRequest((prev) => ({ orgId: org.id, n: (prev?.n ?? 0) + 1 }));
    setProfileOpen(false);
    setTab('directory');
  }, []);

  const openPodcastPerson = useCallback((person: PodcastPerson) => {
    if (!person.memberHref) return;
    const destination = memberDirectoryDestination(person.memberHref);
    const directoryPerson = destination
      ? (directoryPeopleQuery.data ?? []).find(
          (candidate) =>
            candidate.mentionHandle === destination.mentionHandle &&
            candidate.orgId === destination.organizationSlug
        )
      : null;
    if (!destination || !directoryPerson) {
      Alert.alert('Profile unavailable', 'This guest does not have an active directory profile.');
      return;
    }

    openDirectoryProfile(directoryPerson.id);
  }, [directoryPeopleQuery.data, openDirectoryProfile]);

  const downloadPodcastAudio = useCallback(async (episode: PodcastEpisode) => {
    const refreshed = await refreshPodcastEpisode(episode.slug);
    if (!refreshed.audioUrl) throw new Error('Audio is unavailable for this episode.');
    await sharePodcastDownload({
      url: refreshed.audioUrl,
      slug: refreshed.slug,
      kind: 'audio',
      accessToken: await getAccessToken(),
    });
  }, []);

  const downloadPodcastTranscript = useCallback(async (episode: PodcastEpisode) => {
    if (!episode.transcriptUrl) throw new Error('The transcript download is unavailable.');
    await sharePodcastDownload({
      url: episode.transcriptUrl,
      slug: episode.slug,
      kind: 'transcript',
      accessToken: await getAccessToken(),
    });
  }, []);

  const openAskConversation = useCallback(async (conversationId: string) => {
    askFlushText.current?.();
    askAbortController.current?.abort();
    askAbortController.current = null;
    askFlushText.current = null;
    setAskSending(false);
    const generation = ++askRequestGeneration.current;
    setActiveAskConversationId(conversationId);
    setAskMessages([]);
    setAskConversationError(null);
    setAskConversationLoading(true);
    setAskHasEarlier(false);
    setAskEarlierCursor(null);
    setAskHistoryOpen(false);
    try {
      const page = await getAskConversation(conversationId);
      if (askRequestGeneration.current !== generation) return;
      setAskMessages(page.messages);
      setAskHasEarlier(page.hasEarlier);
      setAskEarlierCursor(page.earlierCursor);
      setAskConversations((current) => [
        page.conversation,
        ...current.filter((conversation) => conversation.id !== page.conversation.id),
      ]);
      await saveActiveAskConversation(member.id, page.conversation.id);
    } catch (cause) {
      if (askRequestGeneration.current !== generation) return;
      const error = cause instanceof Error ? cause : new Error('Conversation could not be loaded.');
      setAskConversationError(error);
      if (cause instanceof ApiError && cause.status === 404) {
        setActiveAskConversationId(null);
        await saveActiveAskConversation(member.id, null);
      }
    } finally {
      if (askRequestGeneration.current === generation) setAskConversationLoading(false);
    }
  }, [member.id]);

  const startNewAskConversation = useCallback(() => {
    askFlushText.current?.();
    askAbortController.current?.abort();
    askAbortController.current = null;
    askFlushText.current = null;
    setAskSending(false);
    askRequestGeneration.current += 1;
    setActiveAskConversationId(null);
    setAskMessages([]);
    setAskConversationError(null);
    setAskConversationLoading(false);
    setAskHasEarlier(false);
    setAskEarlierCursor(null);
    setAskHistoryOpen(false);
    void saveActiveAskConversation(member.id, null);
  }, [member.id]);

  const sendAskMessage = useCallback(async (question: string) => {
    if (askAbortController.current) return;
    const generation = ++askRequestGeneration.current;
    const controller = new AbortController();
    askAbortController.current = controller;
    const startedAt = Date.now();
    const optimisticId = `optimistic-${Date.now()}`;
    const transientId = `streaming-${Date.now()}`;
    const optimisticMessage: AskMessage = {
      id: optimisticId,
      role: 'user',
      text: question,
      createdAt: new Date().toISOString(),
      sources: [],
    };
    const transientMessage: AskDisplayMessage = {
      id: transientId,
      role: 'ai',
      text: '',
      createdAt: optimisticMessage.createdAt,
      sources: [],
      stream: { status: 'generating', phase: 'thinking', trace: [], startedAt },
    };
    setAskMessages((current) => [...current, optimisticMessage, transientMessage]);
    setAskConversationError(null);
    setAskSending(true);

    let pendingText = '';
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let readyConversationId: string | null = null;
    let answerDone = false;
    let persisted = false;

    const updateTransient = (update: (message: AskDisplayMessage) => AskDisplayMessage) => {
      if (askRequestGeneration.current !== generation) return;
      setAskMessages((current) => current.map((message) => message.id === transientId ? update(message) : message));
    };
    const flushText = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = null;
      if (!pendingText) return;
      const text = pendingText;
      pendingText = '';
      updateTransient((message) => ({ ...message, text: message.text + text }));
    };
    const queueText = (text: string) => {
      pendingText += text;
      if (!flushTimer) flushTimer = setTimeout(flushText, 32);
    };
    askFlushText.current = flushText;

    const handleEvent = (event: AskStreamEvent) => {
      if (askRequestGeneration.current !== generation) return;
      if (event.type === 'ready') {
        readyConversationId = event.conversationId;
        setActiveAskConversationId(event.conversationId);
        setAskMessages((current) => current.map((message) => message.id === optimisticId ? event.userMessage : message));
        setAskConversations((current) => [
          { id: event.conversationId, title: event.conversationTitle, updatedAt: event.userMessage.createdAt },
          ...current.filter((conversation) => conversation.id !== event.conversationId),
        ]);
        void saveActiveAskConversation(member.id, event.conversationId);
        return;
      }
      if (event.type === 'tool_call') {
        updateTransient((message) => message.stream ? {
          ...message,
          stream: {
            ...message.stream,
            phase: advanceAskResearchPhase(message.stream.phase, 'searching'),
            trace: [...message.stream.trace, { id: `${transientId}-${message.stream.trace.length}`, name: event.name, summary: event.summary, status: 'pending' }],
          },
        } : message);
        return;
      }
      if (event.type === 'tool_result') {
        updateTransient((message) => message.stream ? {
          ...message,
          stream: {
            ...message.stream,
            phase: advanceAskResearchPhase(message.stream.phase, 'reviewing'),
            trace: completeAskTraceRow(message.stream.trace, event.name),
          },
        } : message);
        return;
      }
      if (event.type === 'text_delta') {
        updateTransient((message) => message.stream ? {
          ...message,
          stream: { ...message.stream, phase: advanceAskResearchPhase(message.stream.phase, 'answering') },
        } : message);
        queueText(event.text);
        return;
      }
      if (event.type === 'done') {
        answerDone = true;
        flushText();
        updateTransient((message) => message.stream ? {
          ...message,
          text: event.answer.content,
          sources: event.answer.sources,
          sourceState: event.answer.sourceState,
          stream: {
            ...message.stream,
            status: 'saving',
            phase: 'answering',
            trace: finalizeAskTrace(message.stream.trace),
            durationSeconds: askDurationSeconds(startedAt),
          },
        } : message);
        return;
      }
      if (event.type === 'persisted') {
        persisted = true;
        flushText();
        setActiveAskConversationId(event.conversation.id);
        setAskMessages((current) => current.map((message) => {
          if (message.id !== transientId) return message;
          return {
            ...event.assistantMessage,
            stream: message.stream ? { ...message.stream, status: 'complete', trace: finalizeAskTrace(message.stream.trace), durationSeconds: message.stream.durationSeconds ?? askDurationSeconds(startedAt) } : undefined,
          };
        }));
        setAskConversations((current) => [
          event.conversation,
          ...current.filter((conversation) => conversation.id !== event.conversation.id),
        ]);
        void saveActiveAskConversation(member.id, event.conversation.id);
        return;
      }
      throw new ApiError(event.message, 500);
    };

    try {
      await streamAskGpfa({
        question,
        conversationId: activeAskConversationId ?? undefined,
        signal: controller.signal,
        onEvent: handleEvent,
      });
      if (!persisted) throw new Error('Ask GPFA did not confirm that the answer was saved.');
    } catch (cause) {
      if (askRequestGeneration.current !== generation) return;
      flushText();
      if (cause instanceof RequestCancelledError) return;
      if (__DEV__) console.warn('[ask] Ask GPFA request failed', cause);
      if (answerDone && readyConversationId) {
        try {
          const page = await getAskConversation(readyConversationId);
          if (askRequestGeneration.current !== generation) return;
          setAskMessages(page.messages);
          setAskHasEarlier(page.hasEarlier);
          setAskEarlierCursor(page.earlierCursor);
          setAskConversations((current) => [page.conversation, ...current.filter((item) => item.id !== page.conversation.id)]);
          return;
        } catch {
          // Keep the completed text visible if reconciliation also fails.
        }
      }
      updateTransient((message) => message.stream ? {
        ...message,
        stream: {
          ...message.stream,
          status: 'failed',
          trace: finalizeAskTrace(message.stream.trace),
          durationSeconds: askDurationSeconds(startedAt),
        },
      } : message);
      setAskConversationError(
        cause instanceof Error ? cause : new Error('Ask GPFA is unavailable right now.')
      );
    } finally {
      if (flushTimer) clearTimeout(flushTimer);
      if (askAbortController.current === controller) askAbortController.current = null;
      if (askFlushText.current === flushText) askFlushText.current = null;
      if (askRequestGeneration.current === generation) setAskSending(false);
    }
  }, [activeAskConversationId, member.id]);

  const stopAskGeneration = useCallback(() => {
    const controller = askAbortController.current;
    if (!controller) return;
    askFlushText.current?.();
    askRequestGeneration.current += 1;
    controller.abort();
    askAbortController.current = null;
    askFlushText.current = null;
    setAskSending(false);
    setAskMessages((current) => current.map((message) => {
      if (message.stream?.status !== 'generating') return message;
      return {
        ...message,
        stream: {
          ...message.stream,
          status: 'stopped',
          trace: finalizeAskTrace(message.stream.trace),
          durationSeconds: askDurationSeconds(message.stream.startedAt),
        },
      };
    }));
  }, []);

  const loadEarlierAskMessages = useCallback(async () => {
    if (!activeAskConversationId || !askEarlierCursor || !askHasEarlier || askLoadingEarlier) return;
    const generation = askRequestGeneration.current;
    setAskLoadingEarlier(true);
    try {
      const page = await getAskConversation(activeAskConversationId, askEarlierCursor);
      if (askRequestGeneration.current !== generation) return;
      setAskMessages((current) => mergeAskMessages(current, page.messages));
      setAskHasEarlier(page.hasEarlier);
      setAskEarlierCursor(page.earlierCursor);
    } catch (cause) {
      if (askRequestGeneration.current === generation) {
        setAskConversationError(
          cause instanceof Error ? cause : new Error('Earlier messages could not be loaded.')
        );
      }
    } finally {
      if (askRequestGeneration.current === generation) setAskLoadingEarlier(false);
    }
  }, [activeAskConversationId, askEarlierCursor, askHasEarlier, askLoadingEarlier]);

  useEffect(() => {
    if (!isSignedIn || !member.id || restoredAskMemberId.current === member.id) return;
    restoredAskMemberId.current = member.id;
    let cancelled = false;
    void loadActiveAskConversation(member.id)
      .then((conversationId) => {
        if (!cancelled && conversationId) void openAskConversation(conversationId);
      })
      .catch((cause) => {
        if (!cancelled && __DEV__) console.warn('[ask] Conversation restore failed', cause);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, member.id, openAskConversation]);

  const openMessageConversation = useCallback(async (conversationId: string) => {
    setActiveMessageConversationId(conversationId);
    setActiveMessageConversation(null);
    setDraftMessageRecipient(null);
    setDraftGroupParticipants([]);
    setMessageItems([]);
    setMessageConversationError(null);
    setMessageConversationLoading(true);
    setMessageConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
      )
    );

    try {
      const response = await getMessageConversation(conversationId, { limit: 50 });
      setActiveMessageConversation(response.conversation);
      setMessageItems(response.messages);
      setMessageHasOlder(response.messages.length === 50 && (response.messages[0]?.ordinal ?? 0) > 1);
      if (response.latestOrdinal > response.conversation.lastReadOrdinal) {
        void markMessageConversationRead(conversationId, response.latestOrdinal).catch(() => undefined);
      }
    } catch (cause) {
      setMessageConversationError(
        cause instanceof Error ? cause : new Error('The conversation could not be loaded.')
      );
    } finally {
      setMessageConversationLoading(false);
    }
  }, []);

  const startMessageConversation = useCallback(
    async (memberId: string) => {
      if (resolvingMessageMemberId) return;
      setResolvingMessageMemberId(memberId);
      setMessageConversationError(null);
      try {
        const result = await resolveDirectMessageConversation(memberId);
        if (result.conversationId) {
          await openMessageConversation(result.conversationId);
          return;
        }
        setActiveMessageConversationId(null);
        setActiveMessageConversation(null);
        setDraftMessageRecipient(result.recipient);
        setDraftGroupParticipants([]);
        setMessageItems([]);
      } catch (cause) {
        setMessageConversationError(
          cause instanceof Error ? cause : new Error('That member could not be opened.')
        );
      } finally {
        setResolvingMessageMemberId(null);
      }
    },
    [openMessageConversation, resolvingMessageMemberId]
  );

  const startGroupMessageConversation = useCallback(
    async (memberIds: string[]) => {
      if (resolvingMessageGroup) return;
      setResolvingMessageGroup(true);
      setMessageConversationError(null);
      try {
        const result = await resolveGroupMessageConversation(memberIds);
        if (result.conversationId) {
          await openMessageConversation(result.conversationId);
          return;
        }

        const people = directoryPeopleQuery.data ?? [];
        const organizations = new Map((orgsQuery.data ?? []).map((org) => [org.id, org.short]));
        const participants = memberIds.map((memberId) => {
          const person = people.find((candidate) => candidate.id === memberId);
          if (!person) throw new Error('One of those members is no longer available.');
          return {
            id: person.id,
            name: person.name,
            avatarUrl: person.photoUrl ?? null,
            roleTitle: person.role || null,
            organizationName: organizations.get(person.orgId) ?? null,
            isCurrentMember: false,
            isAvailable: true,
            hasLeft: false,
          } satisfies MessagingParticipant;
        });
        setActiveMessageConversationId(null);
        setActiveMessageConversation(null);
        setDraftMessageRecipient(null);
        setDraftGroupParticipants(participants);
        setMessageItems([]);
        setMessageHasOlder(false);
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error('The group message could not be opened.');
        setMessageConversationError(error);
        throw error;
      } finally {
        setResolvingMessageGroup(false);
      }
    },
    [directoryPeopleQuery.data, openMessageConversation, orgsQuery.data, resolvingMessageGroup]
  );

  const closeMessageConversation = useCallback(() => {
    setActiveMessageConversationId(null);
    setActiveMessageConversation(null);
    setDraftMessageRecipient(null);
    setDraftGroupParticipants([]);
    setMessageItems([]);
    setMessageConversationError(null);
    setMessageHasOlder(false);
  }, []);

  const retryMessageConversation = useCallback(() => {
    if (activeMessageConversationId) {
      void openMessageConversation(activeMessageConversationId);
      return;
    }
    messageConversationsQuery.refetch();
  }, [activeMessageConversationId, messageConversationsQuery.refetch, openMessageConversation]);

  const loadOlderMessages = useCallback(async () => {
    const beforeOrdinal = messageItems[0]?.ordinal;
    if (!activeMessageConversationId || !beforeOrdinal || messageLoadingOlder || !messageHasOlder) return;
    setMessageLoadingOlder(true);
    try {
      const response = await getMessageConversation(activeMessageConversationId, {
        beforeOrdinal,
        limit: 50,
      });
      setMessageItems((current) => {
        const currentIds = new Set(current.map((message) => message.id));
        return [...response.messages.filter((message) => !currentIds.has(message.id)), ...current];
      });
      setMessageHasOlder(response.messages.length === 50 && (response.messages[0]?.ordinal ?? 0) > 1);
    } finally {
      setMessageLoadingOlder(false);
    }
  }, [activeMessageConversationId, messageHasOlder, messageItems, messageLoadingOlder]);

  const toggleMessageReaction = useCallback(
    async (messageId: string, emoji: MessageReaction, active: boolean) => {
      const previous = messageItems;
      setMessageItems((current) => updateMessageReaction(current, messageId, emoji, active));
      try {
        await setMessageReaction({ messageId, emoji, active });
      } catch (cause) {
        setMessageItems(previous);
        throw cause;
      }
    },
    [messageItems]
  );

  const renameActiveMessageConversation = useCallback(async (title: string) => {
    if (!activeMessageConversationId || activeMessageConversation?.kind !== 'group') return;
    setMessageActionPending(true);
    try {
      const response = await renameMessageConversation(activeMessageConversationId, title);
      setActiveMessageConversation((current) => current ? { ...current, title: response.title } : current);
      setMessageConversations((current) => current.map((conversation) =>
        conversation.id === activeMessageConversationId
          ? { ...conversation, title: response.title }
          : conversation
      ));
    } finally {
      setMessageActionPending(false);
    }
  }, [activeMessageConversation?.kind, activeMessageConversationId]);

  const addActiveMessageConversationMembers = useCallback(async (participantIds: string[]) => {
    if (!activeMessageConversationId || activeMessageConversation?.kind !== 'group') return;
    setMessageActionPending(true);
    try {
      await addMessageConversationMembers(activeMessageConversationId, participantIds);
      const afterOrdinal = messageItems.at(-1)?.ordinal ?? 0;
      const response = await getMessageConversation(activeMessageConversationId, {
        afterOrdinal,
        limit: 50,
      });
      setActiveMessageConversation(response.conversation);
      setMessageItems((current) => mergeMessages(current, response.messages));
    } finally {
      setMessageActionPending(false);
    }
  }, [activeMessageConversation?.kind, activeMessageConversationId, messageItems]);

  const leaveActiveMessageConversation = useCallback(async () => {
    if (!activeMessageConversationId || activeMessageConversation?.kind !== 'group') return;
    const conversationId = activeMessageConversationId;
    setMessageActionPending(true);
    try {
      await leaveMessageConversation(conversationId);
      setMessageConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
      closeMessageConversation();
      messageConversationsQuery.refetch();
    } finally {
      setMessageActionPending(false);
    }
  }, [activeMessageConversation?.kind, activeMessageConversationId, closeMessageConversation, messageConversationsQuery.refetch]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeMessageConversationId && !draftMessageRecipient && draftGroupParticipants.length === 0) {
        throw new Error('Choose a member to message.');
      }

      setMessageSending(true);
      try {
        const response = await sendMemberMessage({
          ...(activeMessageConversationId
            ? { conversationId: activeMessageConversationId }
            : {
                participantIds: draftMessageRecipient
                  ? [draftMessageRecipient.id]
                  : draftGroupParticipants.map((participant) => participant.id),
              }),
          content,
          clientNonce: createClientNonce(),
        });
        const currentParticipant: MessagingParticipant = {
          id: member.id,
          name: member.name,
          avatarUrl: null,
          roleTitle: member.role ?? null,
          organizationName: member.org,
          isCurrentMember: true,
          isAvailable: true,
          hasLeft: false,
        };
        const draftParticipants = draftMessageRecipient
          ? [draftMessageRecipient]
          : draftGroupParticipants;
        const detail = activeMessageConversation ?? {
          id: response.conversationId,
          kind: draftParticipants.length > 1 ? 'group' as const : 'direct' as const,
          title: null,
          participants: [currentParticipant, ...draftParticipants],
          lastReadOrdinal: 0,
        };
        const committedDetail = {
          ...detail,
          id: response.conversationId,
          lastReadOrdinal: response.message.ordinal,
        };

        setActiveMessageConversationId(response.conversationId);
        setActiveMessageConversation(committedDetail);
        setDraftMessageRecipient(null);
        setDraftGroupParticipants([]);
        setMessageItems((current) => [...current, response.message]);
        setMessageConversations((current) => {
          const existing = current.find((conversation) => conversation.id === response.conversationId);
          const updated: ConversationSummary = existing
            ? {
                ...existing,
                lastMessage: response.message,
                lastMessageAt: response.message.createdAt,
                lastReadOrdinal: response.message.ordinal,
                unreadCount: 0,
              }
            : {
                id: response.conversationId,
                kind: committedDetail.kind,
                title: committedDetail.title,
                participants: committedDetail.participants,
                lastMessage: response.message,
                lastMessageAt: response.message.createdAt,
                lastReaction: null,
                lastReadOrdinal: response.message.ordinal,
                unreadCount: 0,
              };
          return [updated, ...current.filter((conversation) => conversation.id !== response.conversationId)];
        });
        messageConversationsQuery.refetch();
      } finally {
        setMessageSending(false);
      }
    },
    [
      activeMessageConversation,
      activeMessageConversationId,
      draftMessageRecipient,
      draftGroupParticipants,
      member.id,
      member.name,
      member.org,
      member.role,
      messageConversationsQuery.refetch,
    ]
  );

  const performSignOut = useCallback(async () => {
    setProfileSheetOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setTab('home');
    setMoreView('root');
    const result = await signOut();
    if (!result.remoteRevocationConfirmed) {
      Alert.alert(
        'Signed out on this device',
        'Your local session was cleared, but remote revocation could not be confirmed. Check your connection before signing in again.'
      );
    }
  }, [signOut]);

  const requestSignOut = useCallback(() => {
    if (signingOut) return;
    Alert.alert(
      'Sign out?',
      'This will revoke the current session and remove your credentials from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void performSignOut() },
      ]
    );
  }, [performSignOut, signingOut]);

  const openStory = useCallback((story: NewsStory) => {
    if (story.url) void Linking.openURL(story.url);
  }, []);

  const groups = useMemo(() => groupsQuery.data?.groups ?? [], [groupsQuery.data]);
  const myGroups = useMemo(
    () => groups.filter((group) => subscribed[group.id] ?? group.joined),
    [groups, subscribed]
  );
  const posts = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const dashboardNews = newsQuery.data ?? [];
  const previewEvents = useMemo(
    () => (eventsQuery.data ?? []).map((event) => ({ ...event, rsvp: previewRsvps[event.id] ?? event.rsvp })),
    [eventsQuery.data, previewRsvps]
  );

  const addEventToCalendar = useCallback(async (event: MobileEventPreview) => {
    try {
      await addEventToDeviceCalendar(event);
    } catch (error) {
      Alert.alert(
        'Calendar unavailable',
        error instanceof Error ? error.message : 'Could not open this event in your calendar.'
      );
    }
  }, []);

  const downloadEventIcs = useCallback(async (event: MobileEventPreview) => {
    try {
      await shareEventIcs(event);
    } catch (error) {
      Alert.alert(
        'Calendar file unavailable',
        error instanceof Error ? error.message : 'Could not create the calendar file.'
      );
    }
  }, []);

  const announcements = updatesQuery.data?.announcements ?? [];
  const surveys = useMemo(
    () => (updatesQuery.data?.surveys ?? []).map((survey) =>
      surveySubmissions[survey.id] ? { ...survey, status: 'submitted' as const } : survey
    ),
    [surveySubmissions, updatesQuery.data?.surveys]
  );
  const annualMeeting = annualMeetingOverride ?? annualMeetingQuery.data;
  const notifications = localNotifications;
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const selectedGroupDetail = groupId ? groupDetails[groupId] : undefined;

  useEffect(() => {
    groupDetailsRef.current = groupDetails;
  }, [groupDetails]);

  const setMutationPending = useCallback((key: string, pending: boolean) => {
    setPendingMutations((current) => {
      const next = { ...current };
      if (pending) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  const showMutationError = useCallback((cause: unknown, fallback: string) => {
    setMutationNotice({ type: 'error', message: mutationErrorMessage(cause, fallback) });
  }, []);

  const showNotificationError = useCallback((cause: unknown, fallback: string) => {
    Alert.alert('Notifications unavailable', mutationErrorMessage(cause, fallback));
  }, []);

  const setNotificationPending = useCallback((ids: string[], pending: boolean) => {
    setPendingNotifications((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (pending) next[id] = true;
        else delete next[id];
      }
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    const previous = notifications;

    setNotificationPending(ids, true);
    setLocalNotifications((prev) => markNotificationItemsRead(prev, ids));
    void markNotificationsRead(ids)
      .catch((cause) => {
        setLocalNotifications(previous);
        showNotificationError(cause, 'Notifications could not be marked read.');
      })
      .finally(() => setNotificationPending(ids, false));
  }, [notifications, setNotificationPending, showNotificationError]);

  const markNotificationRead = useCallback((id: string) => {
    const notification = notifications.find((candidate) => candidate.id === id);
    if (!notification || notification.read || pendingNotifications[id]) return;
    const previous = notifications;

    setNotificationPending([id], true);
    setLocalNotifications((current) => markNotificationItemsRead(current, [id]));
    void markNotificationsRead([id])
      .catch((cause) => {
        setLocalNotifications(previous);
        showNotificationError(cause, 'The notification could not be marked read.');
      })
      .finally(() => setNotificationPending([id], false));
  }, [notifications, pendingNotifications, setNotificationPending, showNotificationError]);

  const dismissNotification = useCallback((id: string) => {
    const previous = notifications;

    setNotificationPending([id], true);
    setLocalNotifications((prev) => dismissNotificationItems(prev, [id]));
    void dismissNotifications([id])
      .catch((cause) => {
        setLocalNotifications(previous);
        showNotificationError(cause, 'The notification could not be removed.');
      })
      .finally(() => setNotificationPending([id], false));
  }, [notifications, setNotificationPending, showNotificationError]);

  const clearNotifications = useCallback(() => {
    const ids = notifications.map(({ id }) => id);
    if (!ids.length || Object.keys(pendingNotifications).length) return;
    const previous = notifications;

    setNotificationPending(ids, true);
    setLocalNotifications([]);
    void dismissNotifications(ids)
      .catch((cause) => {
        setLocalNotifications(previous);
        showNotificationError(cause, 'Notifications could not be cleared.');
      })
      .finally(() => setNotificationPending(ids, false));
  }, [notifications, pendingNotifications, setNotificationPending, showNotificationError]);

  const loadGroupResourceModeration = useCallback(
    (id: string) => {
      const group = groups.find((candidate) => candidate.id === id);
      if (!group) return;

      setResourceModeration((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? EMPTY_RESOURCE_MODERATION),
          loading: true,
          error: null,
        },
      }));

      void getWorkingGroupResourceModeration(group.slug ?? group.id)
        .then((response) => {
          setResourceModeration((current) => ({
            ...current,
            [id]: {
              submissions: response.submissions,
              loading: false,
              error: null,
            },
          }));
        })
        .catch((cause) => {
          setResourceModeration((current) => ({
            ...current,
            [id]: {
              submissions: current[id]?.submissions ?? [],
              loading: false,
              error: cause instanceof Error ? cause : new Error(String(cause)),
            },
          }));
        });
    },
    [groups]
  );

  const loadGroupMetadata = useCallback(
    (id: string) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return;
      const slug = group.slug ?? group.id;
      void Promise.allSettled([
        getWorkingGroupCoLeadMembers(slug),
        getWorkingGroupDirectoryMembers(slug),
        getWorkingGroupResources(slug, id),
        getWorkingGroupTagUsage(slug, { limit: 24 }).then((res) => res.tags.map((tag) => tag.label)),
      ])
        .then(([coLeads, members, resources, tagSuggestions]) => {
          setGroupDetails((prev) => {
            const current = prev[id] ?? EMPTY_GROUP_DETAIL;
            return {
              ...prev,
              [id]: {
                ...current,
                ...(coLeads.status === 'fulfilled' ? { coLeads: coLeads.value } : {}),
                ...(members.status === 'fulfilled' ? { members: members.value } : {}),
                ...(resources.status === 'fulfilled' ? { resources: resources.value } : {}),
                ...(tagSuggestions.status === 'fulfilled'
                  ? { tagSuggestions: tagSuggestions.value }
                  : {}),
              },
            };
          });
          const failed = [coLeads, members, resources, tagSuggestions].filter(
            (result) => result.status === 'rejected'
          );
          if (failed.length > 0) {
            console.warn(`[working-groups] ${failed.length} metadata request(s) failed for ${slug}.`);
          }
        });
    },
    [groups]
  );

  const loadGroupFeed = useCallback(
    (id: string, controls: WorkingGroupFeedControls, cursor?: string | null) => {
      const group = groups.find((candidate) => candidate.id === id);
      if (!group) return;
      const append = !!cursor;
      const generation = append
        ? feedRequestGeneration.current[id] ?? 0
        : (feedRequestGeneration.current[id] ?? 0) + 1;
      if (!append) feedRequestGeneration.current[id] = generation;
      const currentDetail = groupDetailsRef.current[id];

      setGroupDetails((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? EMPTY_GROUP_DETAIL),
          loading: !append,
          loadingMore: append,
          error: null,
        },
      }));

      void getWorkingGroupThreadFeed(group.slug ?? group.id, id, {
        ...controls,
        query: controls.query.trim() || undefined,
        limit: 20,
        cursor: cursor ?? undefined,
        snapshotAt: append ? currentDetail?.snapshotAt ?? undefined : undefined,
      })
        .then((feed) => {
          if (feedRequestGeneration.current[id] !== generation) return;
          setGroupDetails((prev) => {
            const current = prev[id] ?? EMPTY_GROUP_DETAIL;
            const existingIds = new Set(current.items.map((entry) => entry.post.id));
            return {
              ...prev,
              [id]: {
                ...current,
                items: append
                  ? [...current.items, ...feed.items.filter((entry) => !existingIds.has(entry.post.id))]
                  : feed.items,
                nextCursor: feed.nextCursor,
                snapshotAt: feed.snapshotAt,
                totalMatching: feed.totalMatching,
                loading: false,
                loadingMore: false,
                error: null,
              },
            };
          });
        })
        .catch((cause) => {
          if (feedRequestGeneration.current[id] !== generation) return;
          setGroupDetails((prev) => ({
            ...prev,
            [id]: {
              ...(prev[id] ?? EMPTY_GROUP_DETAIL),
              loading: false,
              loadingMore: false,
              error: cause instanceof Error ? cause : new Error(String(cause)),
            },
          }));
        });
    },
    [groups]
  );

  const loadGroupDetail = useCallback(
    (id: string) => {
      loadGroupMetadata(id);
      loadGroupFeed(id, feedControls[id] ?? DEFAULT_FEED_CONTROLS);
    },
    [feedControls, loadGroupFeed, loadGroupMetadata]
  );

  const loadMoreGroupFeed = useCallback(() => {
    if (!groupId) return;
    const detail = groupDetails[groupId];
    if (!detail?.nextCursor || detail.loading || detail.loadingMore) return;
    loadGroupFeed(groupId, feedControls[groupId] ?? DEFAULT_FEED_CONTROLS, detail.nextCursor);
  }, [feedControls, groupDetails, groupId, loadGroupFeed]);

  const applyGroupFeedControls = useCallback((id: string, controls: WorkingGroupFeedControls) => {
    setFeedControls((current) => ({ ...current, [id]: controls }));
    loadGroupFeed(id, controls);
  }, [loadGroupFeed]);

  useEffect(() => {
    if (!groupId || groupDetails[groupId]) return;
    loadGroupDetail(groupId);
  }, [groupDetails, groupId, loadGroupDetail]);

  /**
   * The member's own organization, for their profile's Organization card.
   * `orgId` is the join; the name match is the fallback for a backend that
   * sends only `org`, and it holds only while the two strings agree.
   */
  const memberOrg = useMemo(() => {
    const orgs = orgsQuery.data ?? [];
    const named = member.org.trim().toLowerCase();
    return (
      orgs.find((o) => o.id === member.orgId) ??
      orgs.find((o) =>
        [o.name, o.short, o.fullName].some((n) => (n ?? '').trim().toLowerCase() === named)
      ) ??
      null
    );
  }, [orgsQuery.data, member.org, member.orgId]);

  const entryForThread = useCallback(
    (id: string): FeedEntry | undefined => {
      for (const detail of Object.values(groupDetails)) {
        const found = detail?.items.find((entry) => entry.post.id === id);
        if (found) return found;
      }
      return newPosts.find((entry) => entry.post.id === id) ?? posts.find((entry) => entry.post.id === id);
    },
    [groupDetails, newPosts, posts]
  );

  const targetTypeForThread = useCallback((thread: Thread | undefined) => {
    if (!thread) return 'thread';
    return thread.targetType ?? (thread.type === 'discussion' || !thread.type ? 'thread' : thread.type);
  }, []);

  const refreshThreadDetail = useCallback(async (id: string): Promise<void> => {
    const entry = entryForThread(id);
    if (!entry) throw new Error('The selected post is no longer available.');
    const group = groups.find((candidate) => candidate.id === entry.groupId);
    const slug = entry.post.groupSlug ?? group?.slug ?? entry.groupId;
    const itemType = entry.post.type ?? 'discussion';
    const response = await getWorkingGroupFeedItemDetail(slug, itemType, id);
    const hydrated = workingGroupFeedItemResponseToEntry(response, entry.groupId);
    setGroupDetails((prev) => replaceThreadInGroupDetails(prev, hydrated));
    setNewPosts((prev) =>
      prev.map((candidate) => (candidate.post.id === id ? { ...candidate, post: hydrated.post } : candidate))
    );
    reconcileThreadDetailState(id, response, hydrated.post, setUpvoted, setReposted, setVotes);
  }, [entryForThread, groups]);

  const refreshGroupMembership = useCallback(
    (id: string) => {
      const group = groups.find((g) => g.id === id);
      const slug = group?.slug ?? id;
      setGroupDetails((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? EMPTY_GROUP_DETAIL),
          membershipRole: null,
        },
      }));
      void getWorkingGroupMembership(slug)
        .then((membership) => {
          setSubscribed((prev) => ({
            ...prev,
            [id]: membership?.subscriptionStatus === 'subscribed',
          }));
          setGroupDetails((prev) => ({
            ...prev,
            [id]: {
              ...(prev[id] ?? EMPTY_GROUP_DETAIL),
              membershipRole: membership?.role ?? null,
            },
          }));
          if (membership?.role === 'co_lead' || member.role?.toLowerCase() === 'admin') {
            loadGroupResourceModeration(id);
          }
        })
        .catch((cause) => {
          console.warn(
            `[working-groups] Membership could not be loaded for ${slug}.`,
            cause
          );
        });
    },
    [groups, loadGroupResourceModeration, member.role]
  );

  // Tapping a group on Home opens that group's page.
  const pickGroup = useCallback((id: string) => {
    setGroupId(id);
    setThreadId(null);
    setTab('groups');
    refreshGroupMembership(id);
    loadGroupDetail(id);
  }, [loadGroupDetail, refreshGroupMembership]);

  const openAskSource = useCallback((source: AskSource) => {
    const destination = askSourceDestination(source);
    if (!destination) {
      Alert.alert('Source unavailable', 'This source link is not valid.');
      return;
    }

    if (destination.kind === 'event' && previewEvents.some((event) => event.id === destination.id)) {
      setEventRequest((current) => ({ id: destination.id, n: (current?.n ?? 0) + 1 }));
      setMoreView('events');
      setTab('more');
      return;
    }

    if (destination.kind === 'group') {
      const group = groups.find((candidate) => (candidate.slug ?? candidate.id) === destination.slug);
      if (group) {
        pickGroup(group.id);
        return;
      }
    }

    if (destination.kind === 'podcast' && podcastQuery.data?.some((episode) => episode.slug === destination.slug)) {
      openInResources('episode', destination.slug);
      return;
    }

    const path = destination.kind === 'web' ? destination.path : source.href;
    const url = trustedAskSourceUrl(path, GPFA_WEB_ORIGIN);
    if (!url) {
      Alert.alert('Source unavailable', 'This source is not available in the app.');
      return;
    }
    void Linking.openURL(url);
  }, [groups, openInResources, pickGroup, podcastQuery.data, previewEvents]);

  const openHomeThread = useCallback((thread: HomeThreadPreview) => {
    const destination = homeGroupDestination(thread.href);
    if (!destination) {
      Alert.alert('Post unavailable', 'This dashboard link is not a valid member post.');
      return;
    }
    const group = groups.find((candidate) => (candidate.slug ?? candidate.id) === destination.slug);
    if (!group) {
      Alert.alert('Post unavailable', 'This working group is no longer available.');
      return;
    }

    setTab('groups');
    setGroupId(group.id);
    setThreadId(destination.itemId);
    refreshGroupMembership(group.id);
    loadGroupDetail(group.id);

    void getWorkingGroupFeedItemDetail(destination.slug, destination.itemType, destination.itemId)
      .then((response) => {
        const hydrated = workingGroupFeedItemResponseToEntry(response, group.id);
        setGroupDetails((prev) => appendThreadToGroupDetails(prev, hydrated));
      })
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 404) {
          Alert.alert('Content unavailable', 'This working group content is no longer available.');
          setThreadId(null);
          return;
        }
        showMutationError(cause, 'The post details could not be loaded.');
      });
  }, [groups, loadGroupDetail, refreshGroupMembership, showMutationError]);

  const openHomeAction = useCallback((action: HomeImmediateAction) => {
    if (action.kind === 'annual-meeting') {
      setMoreView('annual-meeting');
      setTab('more');
      return;
    }
    if (action.kind === 'survey') {
      setUpdateRequest((current) => ({
        selection: { kind: 'survey', id: action.id },
        n: current.n + 1,
      }));
      setMoreView('updates');
      setTab('more');
      return;
    }
    if (action.kind === 'announcement') {
      const announcement = announcements.find(
        (item) => item.notificationId === action.notificationId || item.id === action.id
      );
      if (!announcement) {
        setNotificationsOpen(true);
        notificationsQuery.refetch();
        return;
      }
      setUpdateRequest((current) => ({
        selection: { kind: 'announcement', id: announcement.id },
        n: current.n + 1,
      }));
      setMoreView('updates');
      setTab('more');
      return;
    }

    openHomeThread({
      id: action.id,
      href: action.href,
      title: action.title,
      groupName: '',
      authorName: '',
      replies: 0,
      age: '',
      unread: true,
      participants: [],
    });
  }, [announcements, notificationsQuery.refetch, openHomeThread]);

  const dismissNotificationArrival = useCallback(() => {
    setNotificationArrivals((current) => current.slice(1));
  }, []);

  const openNotification = useCallback((notification: MemberNotification) => {
    setNotificationsOpen(false);
    setNotificationArrivals((current) => current.filter(({ id }) => id !== notification.id));
    markNotificationRead(notification.id);

    const destination = notificationDestination(notification);
    if (destination.kind === 'deleted') {
      Alert.alert(
        'Content unavailable',
        `This ${destination.label} is no longer available.`
      );
      return;
    }
    if (destination.kind === 'annual-meeting') {
      setMoreView('annual-meeting');
      setTab('more');
      return;
    }
    if (destination.kind === 'announcement') {
      const announcement = announcements.find((item) => item.id === destination.id);
      if (!announcement) {
        Alert.alert('Announcement unavailable', 'This announcement is no longer available.');
        return;
      }
      setUpdateRequest((current) => ({
        selection: { kind: 'announcement', id: announcement.id },
        n: current.n + 1,
      }));
      setMoreView('updates');
      setTab('more');
      return;
    }
    if (destination.kind === 'survey') {
      const survey = surveys.find((item) => item.id === destination.id);
      if (!survey) {
        Alert.alert('Survey unavailable', 'This survey is no longer available.');
        return;
      }
      setUpdateRequest((current) => ({
        selection: { kind: 'survey', id: survey.id },
        n: current.n + 1,
      }));
      setMoreView('updates');
      setTab('more');
      return;
    }
    if (destination.kind === 'event') {
      const event = previewEvents.find((candidate) =>
        destination.ids.includes(candidate.id) ||
        (candidate.contentItemId ? destination.ids.includes(candidate.contentItemId) : false)
      );
      if (!event) {
        Alert.alert('Event unavailable', 'This event is no longer available.');
        return;
      }
      setEventRequest((current) => ({ id: event.id, n: (current?.n ?? 0) + 1 }));
      setMoreView('events');
      setTab('more');
      return;
    }
    if (destination.kind === 'group') {
      const group = groups.find((candidate) => (candidate.slug ?? candidate.id) === destination.slug);
      if (!group) {
        Alert.alert('Working group unavailable', 'This working group is no longer available.');
        return;
      }
      pickGroup(group.id);
      return;
    }
    if (destination.kind === 'group-item') {
      openHomeThread({
        id: destination.id,
        href:
          destination.itemType === 'poll'
            ? `/members/groups/${destination.slug}/polls/${destination.id}`
            : `/members/groups/${destination.slug}/${destination.id}`,
        title: notification.title,
        groupName: '',
        authorName: '',
        replies: 0,
        age: '',
        unread: true,
        participants: [],
      });
      return;
    }

    Alert.alert('Destination unavailable', 'This notification destination is not available in the app.');
  }, [announcements, groups, markNotificationRead, openHomeThread, pickGroup, previewEvents, surveys]);

  useEffect(() => {
    if (!isSignedIn) return;
    let subscription: ReturnType<typeof subscribeToNotificationInserts> = null;
    let disposed = false;

    const close = () => {
      const current = subscription;
      subscription = null;
      if (current) void current.close();
    };
    const start = () => {
      if (disposed || subscription) return;
      subscription = subscribeToNotificationInserts({
        onInsert: (row) => {
          const notification = normalizeNotification(row, 0, 'realtime');
          if (!notification) {
            notificationsQuery.refetch();
            return;
          }
          if (notificationIsBeforeMemberJoin(notification, notificationMemberCreatedAt)) return;
          if (notificationIdsRef.current.has(notification.id)) return;

          notificationIdsRef.current.add(notification.id);
          setLocalNotifications((current) => prependNotificationItem(current, notification));
          setNotificationArrivals((current) =>
            current.some(({ id }) => id === notification.id) ? current : [...current, notification]
          );
        },
        onRecoveryNeeded: notificationsQuery.refetch,
      });
    };

    if (AppState.currentState === 'active') start();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        notificationsQuery.refetch();
        start();
      } else {
        close();
      }
    });

    return () => {
      disposed = true;
      appStateSubscription.remove();
      close();
    };
  }, [isSignedIn, notificationMemberCreatedAt, notificationsQuery.refetch]);

  useEffect(() => {
    if (!isSignedIn) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') notificationsQuery.refetch();
    }, 60_000);
    return () => clearInterval(timer);
  }, [isSignedIn, notificationsQuery.refetch]);

  const openGroup = useCallback((id: string) => {
    setGroupId(id);
    refreshGroupMembership(id);
    loadGroupDetail(id);
  }, [loadGroupDetail, refreshGroupMembership]);

  const openRepost = useCallback((repost: MemberRepost) => {
    const entry = repost.entry;
    const group = groups.find((candidate) => candidate.id === entry.groupId);
    const slug = entry.post.groupSlug ?? group?.slug ?? entry.groupId;
    const itemType = entry.post.type ?? 'discussion';

    setProfileOpen(false);
    setTab('groups');
    setGroupDetails((prev) => appendThreadToGroupDetails(prev, entry));
    setGroupId(entry.groupId);
    setThreadId(entry.post.id);
    refreshGroupMembership(entry.groupId);
    loadGroupDetail(entry.groupId);

    void getWorkingGroupFeedItemDetail(slug, itemType, entry.post.id)
      .then((response) => {
        const hydrated = workingGroupFeedItemResponseToEntry(response, entry.groupId);
        setGroupDetails((prev) => replaceThreadInGroupDetails(prev, hydrated));
        reconcileThreadDetailState(
          entry.post.id,
          response,
          hydrated.post,
          setUpvoted,
          setReposted,
          setVotes
        );
      })
      .catch(() => {});
  }, [groups, loadGroupDetail, refreshGroupMembership]);

  // Mutations apply optimistically, then reconcile with the server. Against
  // fixtures the requests resolve as no-ops, so behaviour is identical.
  const addReply = useCallback(async (id: string, reply: Reply): Promise<boolean> => {
    const pendingKey = `reply:create:${id}`;
    if (pendingMutations[pendingKey]) return false;
    const entry = entryForThread(id);
    const group = entry ? groups.find((g) => g.id === entry.groupId) : null;
    const groupSlug = entry?.post.groupSlug ?? group?.slug ?? entry?.groupId;
    setMutationPending(pendingKey, true);
    setExtraReplies((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), reply] }));
    try {
      await createReply(id, reply.text, groupSlug, reply.parentPostId, reply.uploadFiles);
      await refreshThreadDetail(id);
      setExtraReplies((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((candidate) => candidate !== reply) }));
      setMutationNotice({ type: 'success', message: 'Reply posted.' });
      return true;
    } catch (cause) {
      setExtraReplies((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((candidate) => candidate !== reply) }));
      showMutationError(cause, 'The reply could not be posted. Your draft was kept.');
      return false;
    } finally {
      setMutationPending(pendingKey, false);
    }
  }, [entryForThread, groups, pendingMutations, refreshThreadDetail, setMutationPending, showMutationError]);

  const deleteReply = useCallback(async (postId: string, replyId: string): Promise<void> => {
    const pendingKey = `reply:delete:${replyId}`;
    if (pendingMutations[pendingKey]) return;
    setMutationPending(pendingKey, true);
    setGroupDetails((prev) => removeReplyFromGroupDetails(prev, postId, replyId));
    setNewPosts((prev) => removeReplyFromEntries(prev, postId, replyId));
    try {
      await deleteForumReply(replyId);
      setMutationNotice({ type: 'success', message: 'Reply deleted.' });
    } catch (cause) {
      await refreshThreadDetail(postId).catch(() => {});
      showMutationError(cause, 'The reply could not be deleted.');
    } finally {
      setMutationPending(pendingKey, false);
    }
  }, [pendingMutations, refreshThreadDetail, setMutationPending, showMutationError]);

  // One vote per organization — the first choice sticks.
  const vote = useCallback((id: string, option: number) => {
    const pendingKey = `poll:vote:${id}`;
    if (pendingMutations[pendingKey]) return;
    const entry = entryForThread(id);
    const poll = entry?.post.poll;
    const chosen = poll?.options[option];
    let cast = false;
    setVotes((prev) => {
      if (prev[id] !== undefined) return prev;
      cast = true;
      return { ...prev, [id]: option };
    });
    if (cast) {
      setMutationPending(pendingKey, true);
      void castVote(poll?.id ?? id, option, {
        groupSlug: entry?.post.groupSlug,
        questionId: poll?.questionId,
        optionId: chosen?.id,
      }).then(() => {
        setMutationNotice({ type: 'success', message: 'Vote recorded.' });
      }).catch((cause) => {
          setVotes((prev) => ({ ...prev, [id]: undefined }));
          showMutationError(cause, 'The vote could not be recorded.');
        }).finally(() => setMutationPending(pendingKey, false));
    }
  }, [entryForThread, pendingMutations, setMutationPending, showMutationError]);

  const toggleUpvote = useCallback((id: string) => {
    const pendingKey = `upvote:${id}`;
    if (pendingMutations[pendingKey]) return;
    const entry = entryForThread(id);
    const targetType = targetTypeForThread(entry?.post);
    setUpvoted((prev) => {
      const next = !prev[id];
      setMutationPending(pendingKey, true);
      void setUpvote(id, next, targetType)
        .then(() => setMutationNotice({ type: 'success', message: next ? 'Post upvoted.' : 'Upvote removed.' }))
        .catch((cause) => {
          setUpvoted((current) => ({ ...current, [id]: !next }));
          showMutationError(cause, 'The upvote could not be updated.');
        })
        .finally(() => setMutationPending(pendingKey, false));
      return { ...prev, [id]: next };
    });
  }, [entryForThread, pendingMutations, setMutationPending, showMutationError, targetTypeForThread]);

  const toggleRepost = useCallback((id: string) => {
    const pendingKey = `repost:${id}`;
    if (pendingMutations[pendingKey]) return;
    const entry = entryForThread(id);
    const targetType = targetTypeForThread(entry?.post);
    const previous = reposted[id] ?? entry?.post.hasReposted ?? false;
    const next = !previous;

    setReposted((current) => ({ ...current, [id]: next }));
    setMutationPending(pendingKey, true);
    void setRepostedRequest(id, next, targetType)
      .then(() => {
        if (shouldLoadReposts) repostsQuery.refetch();
        setMutationNotice({ type: 'success', message: next ? 'Post reposted.' : 'Repost removed.' });
      })
      .catch((cause) => {
        setReposted((current) => ({ ...current, [id]: previous }));
        showMutationError(cause, 'The repost could not be updated.');
      })
      .finally(() => setMutationPending(pendingKey, false));
  }, [entryForThread, pendingMutations, reposted, repostsQuery.refetch, setMutationPending, shouldLoadReposts, showMutationError, targetTypeForThread]);

  const toggleSubscribe = useCallback(
    (id: string) => {
      const pendingKey = `subscription:${id}`;
      if (pendingMutations[pendingKey]) return;
      const group = groups.find((g) => g.id === id);
      const current = subscribed[id] ?? group?.joined ?? false;
      const next = !current;
      setSubscribed((prev) => ({ ...prev, [id]: next }));
      setMutationPending(pendingKey, true);
      void setSubscribedRequest(group?.slug ?? id, next)
        .then(() => setMutationNotice({ type: 'success', message: next ? 'Group subscribed.' : 'Group unsubscribed.' }))
        .catch((cause) => {
          setSubscribed((prev) => ({ ...prev, [id]: current }));
          showMutationError(cause, 'The subscription could not be updated.');
        })
        .finally(() => setMutationPending(pendingKey, false));
    },
    [groups, pendingMutations, setMutationPending, showMutationError, subscribed]
  );

  const setRsvp = useCallback((id: string, choice: RsvpChoice) => {
    const pendingKey = `rsvp:${id}`;
    if (pendingMutations[pendingKey]) return;
    const entry = entryForThread(id);
    setRsvps((prev) => {
      const previous = prev[id];
      setMutationPending(pendingKey, true);
      void setRsvpRequest(id, choice, entry?.post.groupSlug)
        .then(() => setMutationNotice({ type: 'success', message: 'RSVP updated.' }))
        .catch((cause) => {
          setRsvps((current) => ({ ...current, [id]: previous }));
          showMutationError(cause, 'The RSVP could not be updated.');
        })
        .finally(() => setMutationPending(pendingKey, false));
      return { ...prev, [id]: choice };
    });
  }, [entryForThread, pendingMutations, setMutationPending, showMutationError]);

  const openThread = useCallback((id: string) => {
    setThreadId(id);
    void refreshThreadDetail(id).catch((cause) => showMutationError(cause, 'The post details could not be refreshed.'));
  }, [refreshThreadDetail, showMutationError]);

  const createPost = useCallback(
    (draft: NewPostInput, member: Member) => {
    const group = groups.find((g) => g.id === draft.groupId);
    const post: Thread = {
      id: `new-${Date.now()}`,
      groupSlug: draft.groupSlug ?? group?.slug ?? draft.groupId,
      targetType: draft.type === 'discussion' ? 'thread' : draft.type,
      type: draft.type,
      title: draft.title,
      author: member.name,
      initials: member.initials,
      org: member.org,
      time: 'Just now',
      // 0 keeps it at the top of the "Newest" sort.
      mins: 0,
      upvotes: 0,
      body: draft.body,
      tags: draft.tags,
      attachments: draft.files?.map((file) => ({
        id: file.uri,
        name: file.name,
        contentType: file.mimeType,
        byteSize: file.size,
      })),
      eventRows:
        draft.type === 'event'
          ? [
              ...(draft.startsAt ? [{ icon: 'calendar' as const, text: draft.startsAt }] : []),
              ...(draft.location ? [{ icon: 'pin' as const, text: draft.location }] : []),
              ...(draft.isVirtual ? [{ icon: 'people' as const, text: 'Virtual' }] : []),
            ]
          : undefined,
      poll:
        draft.type === 'poll'
          ? {
              q: draft.pollQuestion?.trim() || draft.title,
              closes: draft.closesAt ?? 'Open',
              options: (draft.pollOptions ?? []).map((label) => ({ label, votes: 0 })),
            }
          : undefined,
      replies: [],
    };
    const entry = { post, groupId: draft.groupId };
    setNewPosts((prev) => [entry, ...prev]);
    setComposerOpen(false);

    void createPostRequest(draft)
      .then((created) => {
        // Adopt the server's record (real id, timestamps) when it returns one.
        if (created) {
          setNewPosts((prev) => prev.map((e) => (e === entry ? { ...e, post: created } : e)));
        }
        loadGroupDetail(draft.groupId);
      })
      .catch(() => {
        setNewPosts((prev) => prev.filter((e) => e !== entry));
      });
    },
    [groups, loadGroupDetail]
  );

  const submitResource = useCallback(
    async (input: WorkingGroupResourceSubmissionInput) => {
      const selectedGroupId = resourceComposerGroupId ?? groupId;
      const group = selectedGroupId ? groups.find((candidate) => candidate.id === selectedGroupId) : null;
      const slug = group?.slug ?? selectedGroupId;
      if (!slug) throw new Error('Choose a working group before submitting a resource.');

      setResourceSubmitting(true);
      try {
        await submitWorkingGroupResource(slug, input);
        setMutationNotice({ type: 'success', message: 'Resource submitted for review.' });
      } catch (cause) {
        showMutationError(cause, 'The resource could not be submitted.');
        throw cause;
      } finally {
        setResourceSubmitting(false);
      }
    },
    [groupId, groups, resourceComposerGroupId, showMutationError]
  );

  const reviewResourceSubmission = useCallback(
    async (submissionId: string, input: WorkingGroupResourceReviewInput): Promise<boolean> => {
      if (!groupId || moderationPendingSubmissionId) return false;
      setModerationPendingSubmissionId(submissionId);
      try {
        await reviewWorkingGroupResourceSubmission(submissionId, input);
        setMutationNotice({
          type: 'success',
          message:
            input.status === 'approved'
              ? 'Resource approved and published.'
              : input.status === 'changes_requested'
                ? 'Changes requested from the contributor.'
                : 'Resource submission rejected.',
        });
        loadGroupResourceModeration(groupId);
        notificationsQuery.refetch();
        return true;
      } catch (cause) {
        showMutationError(cause, 'The resource review could not be saved.');
        return false;
      } finally {
        setModerationPendingSubmissionId(null);
      }
    },
    [groupId, loadGroupResourceModeration, moderationPendingSubmissionId, notificationsQuery.refetch, showMutationError]
  );

  const removeApprovedResource = useCallback(
    async (submissionId: string): Promise<boolean> => {
      if (!groupId || moderationPendingSubmissionId) return false;
      setModerationPendingSubmissionId(submissionId);
      try {
        await removeWorkingGroupApprovedResource(submissionId);
        setMutationNotice({ type: 'success', message: 'Resource removed from the member library.' });
        loadGroupResourceModeration(groupId);
        libraryQuery.refetch();
        notificationsQuery.refetch();
        return true;
      } catch (cause) {
        showMutationError(cause, 'The approved resource could not be removed.');
        return false;
      } finally {
        setModerationPendingSubmissionId(null);
      }
    },
    [
      groupId,
      libraryQuery.refetch,
      loadGroupResourceModeration,
      moderationPendingSubmissionId,
      notificationsQuery.refetch,
      showMutationError,
    ]
  );

  const summarizePost = useCallback((id: string) => {
    const entry = entryForThread(id);
    if (!entry?.post.groupSlug) return;
    setSummarizing((prev) => ({ ...prev, [id]: true }));
    void summarizeForum({ threadId: id, groupSlug: entry.post.groupSlug })
      .then((res) => {
        if (res?.summary) setPostSummaries((prev) => ({ ...prev, [id]: res.summary }));
        setMutationNotice({ type: 'success', message: 'Summary generated.' });
      })
      .catch((cause) => {
        showMutationError(cause, 'The summary could not be generated.');
      })
      .finally(() => {
        setSummarizing((prev) => ({ ...prev, [id]: false }));
      });
  }, [entryForThread, showMutationError]);

  const updatePost = useCallback((id: string, input: { title?: string; body?: string }) => {
    const pendingKey = `thread:update:${id}`;
    if (pendingMutations[pendingKey]) return;
    const previous = entryForThread(id)?.post;
    if (previous?.type === 'poll') return;
    setMutationPending(pendingKey, true);
    setGroupDetails((prev) => updateThreadInGroupDetails(prev, id, input));
    setNewPosts((prev) => prev.map((entry) => entry.post.id === id ? { ...entry, post: { ...entry.post, ...input } } : entry));
    void updateForumThread(id, input).then(() => {
      setMutationNotice({ type: 'success', message: 'Post updated.' });
    }).catch((cause) => {
      if (!previous) return;
      setGroupDetails((prev) => updateThreadInGroupDetails(prev, id, previous));
      setNewPosts((prev) => prev.map((entry) => entry.post.id === id ? { ...entry, post: previous } : entry));
      showMutationError(cause, 'The post could not be updated.');
    }).finally(() => setMutationPending(pendingKey, false));
  }, [entryForThread, pendingMutations, setMutationPending, showMutationError]);

  const deletePost = useCallback((id: string) => {
    const pendingKey = `thread:delete:${id}`;
    if (pendingMutations[pendingKey]) return;
    const previous = entryForThread(id);
    if (previous?.post.type === 'poll') return;
    setMutationPending(pendingKey, true);
    setThreadId(null);
    setGroupDetails((prev) => removeThreadFromGroupDetails(prev, id));
    setNewPosts((prev) => prev.filter((entry) => entry.post.id !== id));
    void deleteForumThread(id).then(() => {
      setMutationNotice({ type: 'success', message: 'Post deleted.' });
    }).catch((cause) => {
      if (!previous) return;
      setGroupDetails((prev) => appendThreadToGroupDetails(prev, previous));
      setNewPosts((prev) => previous.groupId === groupId ? [previous, ...prev] : prev);
      showMutationError(cause, 'The post could not be deleted.');
    }).finally(() => setMutationPending(pendingKey, false));
  }, [entryForThread, groupId, pendingMutations, setMutationPending, showMutationError]);

  const changePostStatus = useCallback((id: string, status: 'open' | 'answered' | 'closed') => {
    const pendingKey = `thread:status:${id}`;
    if (pendingMutations[pendingKey]) return;
    if (entryForThread(id)?.post.type === 'poll') return;
    setMutationPending(pendingKey, true);
    const lifecycle = status === 'answered' ? 'resolved' : status;
    setGroupDetails((prev) => updateThreadInGroupDetails(prev, id, { lifecycle, state: status === 'open' ? undefined : status[0].toUpperCase() + status.slice(1) }));
    void updateForumThreadStatus(id, { status }).then(() => {
      setMutationNotice({ type: 'success', message: 'Post status updated.' });
    }).catch((cause) => {
      loadGroupDetail(groupId ?? '');
      showMutationError(cause, 'The post status could not be updated.');
    }).finally(() => setMutationPending(pendingKey, false));
  }, [entryForThread, groupId, loadGroupDetail, pendingMutations, setMutationPending, showMutationError]);

  const openPollEditor = useCallback(async (id: string): Promise<void> => {
    const pendingKey = `poll:load:${id}`;
    if (pendingMutations[pendingKey]) return;
    setMutationPending(pendingKey, true);
    setPollEditorErrors((current) => ({ ...current, [id]: undefined }));
    try {
      const response = await getMemberPoll(id);
      if (!response?.poll) throw new Error('The poll could not be loaded.');
      setPollEditors((current) => ({ ...current, [id]: response.poll }));
    } catch (cause) {
      showMutationError(cause, 'The poll could not be loaded for editing.');
    } finally {
      setMutationPending(pendingKey, false);
    }
  }, [pendingMutations, setMutationPending, showMutationError]);

  const savePoll = useCallback(async (id: string, input: MemberPollUpdateInput): Promise<boolean> => {
    const pendingKey = `poll:update:${id}`;
    if (pendingMutations[pendingKey]) return false;
    setMutationPending(pendingKey, true);
    setPollEditorErrors((current) => ({ ...current, [id]: undefined }));
    try {
      await updateMemberPoll(id, input);
      await refreshThreadDetail(id);
      setPollEditors((current) => ({ ...current, [id]: undefined }));
      setMutationNotice({ type: 'success', message: 'Poll updated.' });
      if (groupId) loadGroupFeed(groupId, feedControls[groupId] ?? DEFAULT_FEED_CONTROLS);
      return true;
    } catch (cause) {
      const message = mutationErrorMessage(cause, 'The poll could not be updated.');
      setPollEditorErrors((current) => ({ ...current, [id]: message }));
      showMutationError(cause, 'The poll could not be updated.');
      return false;
    } finally {
      setMutationPending(pendingKey, false);
    }
  }, [feedControls, groupId, loadGroupFeed, pendingMutations, refreshThreadDetail, setMutationPending, showMutationError]);

  const closePoll = useCallback(async (id: string): Promise<void> => {
    const pendingKey = `poll:close:${id}`;
    if (pendingMutations[pendingKey]) return;
    setMutationPending(pendingKey, true);
    try {
      await updateMemberPoll(id, { status: 'closed' });
      await refreshThreadDetail(id);
      setMutationNotice({ type: 'success', message: 'Poll closed.' });
      if (groupId) loadGroupFeed(groupId, feedControls[groupId] ?? DEFAULT_FEED_CONTROLS);
    } catch (cause) {
      showMutationError(cause, 'The poll could not be closed.');
    } finally {
      setMutationPending(pendingKey, false);
    }
  }, [feedControls, groupId, loadGroupFeed, pendingMutations, refreshThreadDetail, setMutationPending, showMutationError]);

  const deletePoll = useCallback(async (id: string): Promise<void> => {
    const pendingKey = `poll:delete:${id}`;
    if (pendingMutations[pendingKey]) return;
    setMutationPending(pendingKey, true);
    try {
      await deleteMemberPoll(id);
      setThreadId(null);
      setGroupDetails((prev) => removeThreadFromGroupDetails(prev, id));
      setNewPosts((prev) => prev.filter((entry) => entry.post.id !== id));
      setMutationNotice({ type: 'success', message: 'Poll deleted.' });
      if (groupId) loadGroupFeed(groupId, feedControls[groupId] ?? DEFAULT_FEED_CONTROLS);
    } catch (cause) {
      showMutationError(cause, 'The poll could not be deleted.');
    } finally {
      setMutationPending(pendingKey, false);
    }
  }, [feedControls, groupId, loadGroupFeed, pendingMutations, setMutationPending, showMutationError]);

  const selectTab = useCallback((next: TabId) => {
    setTab(next);
    // The profile sits over a tab, so any tab press returns to that tab.
    setProfileOpen(false);
    if (next === 'groups') setThreadId(null);
    // Selecting a tab returns to its root, so Home lands on Home and not News.
    if (next === 'home') setNewsOpen(false);
    if (next === 'directory') setDirectoryRequest(null);
    if (next === 'more') {
      setMoreView('root');
      setResourcesNewsOpen(false);
      setUpdateRequest((current) => ({ selection: null, n: current.n + 1 }));
    }
  }, []);

  const tabOffset = -TAB_IDS.indexOf(tab) * screenWidth;

  useEffect(() => {
    Animated.spring(tabTranslateX, {
      toValue: tabOffset,
      damping: 20,
      stiffness: 220,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  }, [screenWidth, tabOffset, tabTranslateX]);

  const tabSwipe = useMemo(
    () =>
      Gesture.Pan()
        // Wait for a clearly horizontal gesture so vertical screen scrolling
        // and short presses keep their native behaviour.
        .activeOffsetX([-36, 36])
        .failOffsetY([-24, 24])
        // `onBegin` also runs for ordinary taps. Waiting until activation
        // prevents a Home card tap from cancelling its own tab transition.
        .onStart(() => tabTranslateX.stopAnimation())
        .onUpdate(({ translationX }) => {
          const currentIndex = TAB_IDS.indexOf(tab);
          const isPastFirstTab = currentIndex === 0 && translationX > 0;
          const isPastLastTab = currentIndex === TAB_IDS.length - 1 && translationX < 0;
          tabTranslateX.setValue(
            tabOffset + (isPastFirstTab || isPastLastTab ? translationX * 0.18 : translationX)
          );
        })
        .onEnd(({ translationX, velocityX }) => {
          const currentIndex = TAB_IDS.indexOf(tab);
          const isLeftSwipe =
            translationX <= -64 || (translationX <= -36 && velocityX <= -700);
          const isRightSwipe =
            translationX >= 64 || (translationX >= 36 && velocityX >= 700);
          const nextIndex = isLeftSwipe
            ? currentIndex + 1
            : isRightSwipe
              ? currentIndex - 1
              : currentIndex;
          const nextTab = TAB_IDS[nextIndex];
          if (!nextTab || nextTab === tab) {
            Animated.spring(tabTranslateX, {
              toValue: tabOffset,
              damping: 18,
              stiffness: 230,
              mass: 0.8,
              useNativeDriver: true,
            }).start();
            return;
          }

          Animated.spring(tabTranslateX, {
            toValue: -nextIndex * screenWidth,
            damping: 20,
            stiffness: 220,
            mass: 0.85,
            velocity: velocityX / Math.max(screenWidth, 1),
            overshootClamping: true,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) selectTab(nextTab);
          });
        })
        .onTouchesCancelled(() => {
          Animated.spring(tabTranslateX, {
            toValue: tabOffset,
            damping: 18,
            stiffness: 230,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        })
        .runOnJS(true),
    [screenWidth, selectTab, tab, tabOffset, tabTranslateX]
  );

  return (
    <MemberProvider
      member={meQuery.data ?? null}
      onOpenProfile={openProfileSheet}
      notificationUnreadCount={isSignedIn ? unreadNotifications : 0}
      onOpenNotifications={isSignedIn ? openNotifications : undefined}
    >
    <View style={[styles.root, { backgroundColor: t.surfacePage }]}>
      {/* Every header is the anchor surface, and sign-in is darker still, so
          the glyphs are light on every screen in both themes. */}
      <StatusBar style="light" />

      {status === 'restoring' ? (
        <View style={styles.blank} />
      ) : !isSignedIn ? (
        <SignInScreen onSignedIn={() => setTab('home')} />
      ) : (
        <>
          <GestureDetector gesture={tabSwipe}>
            <View style={[styles.screen, styles.tabViewport]}>
              <Animated.View
                style={[
                  styles.tabTrack,
                  {
                    width: screenWidth * TAB_IDS.length,
                    transform: [{ translateX: tabTranslateX }],
                  },
                ]}
              >
            <View
              pointerEvents={tab === 'home' ? 'auto' : 'none'}
              accessibilityElementsHidden={tab !== 'home'}
              importantForAccessibility={tab === 'home' ? 'auto' : 'no-hide-descendants'}
              style={[styles.tabPage, { left: 0, width: screenWidth }]}
            >
              <DataGate
                loading={meQuery.loading}
                error={meQuery.error}
                onRetry={meQuery.refetch}
              >
                {newsOpen ? (
                  <NewsScreen
                    stories={dashboardNews}
                    onBack={() => setNewsOpen(false)}
                    onOpen={openStory}
                  />
                ) : (
                  <HomeScreen
                    immediateActions={{ ...homeActionsQuery, onRetry: homeActionsQuery.refetch }}
                    events={{ ...eventsQuery, data: previewEvents, onRetry: eventsQuery.refetch }}
                    workingGroups={{ ...groupsQuery, onRetry: groupsQuery.refetch }}
                    news={{ ...newsQuery, onRetry: newsQuery.refetch }}
                    library={{ ...libraryQuery, onRetry: libraryQuery.refetch }}
                    podcasts={{ ...podcastQuery, onRetry: podcastQuery.refetch }}
                    refreshing={
                      meQuery.refreshing ||
                      homeActionsQuery.refreshing ||
                      eventsQuery.refreshing ||
                      groupsQuery.refreshing ||
                      newsQuery.refreshing ||
                      libraryQuery.refreshing ||
                      podcastQuery.refreshing
                    }
                    onRefresh={() => {
                      meQuery.refetch();
                      homeActionsQuery.refetch();
                      eventsQuery.refetch();
                      groupsQuery.refetch();
                      newsQuery.refetch();
                      libraryQuery.refetch();
                      podcastQuery.refetch();
                    }}
                    onOpenAction={openHomeAction}
                    onOpenEvent={(id) => {
                      setEventRequest((current) => ({ id, n: (current?.n ?? 0) + 1 }));
                      setMoreView('events');
                      setTab('more');
                    }}
                    onGoEvents={() => {
                      setEventRequest(null);
                      setMoreView('events');
                      setTab('more');
                    }}
                    onGoNews={() => setNewsOpen(true)}
                    onGoGroups={() => selectTab('groups')}
                    onPickGroup={(slug) => {
                      const group = groups.find((candidate) => (candidate.slug ?? candidate.id) === slug);
                      if (group) pickGroup(group.id);
                    }}
                    onOpenThread={openHomeThread}
                    onOpenNewsStory={openStory}
                    onGoLibrary={() => {
                      setResourcesRequest(null);
                      setResourcesNewsOpen(false);
                      setMoreView('resources');
                      setTab('more');
                    }}
                    onOpenResource={openResource}
                    onGoPodcasts={() => {
                      setResourcesRequest((current) => ({
                        kind: 'podcasts',
                        id: 'podcasts',
                        sequence: (current?.sequence ?? 0) + 1,
                        origin: 'home',
                        view: 'podcasts',
                        returnTab: 'home',
                        returnMoreView: 'root',
                      }));
                      setResourcesNewsOpen(false);
                      setMoreView('resources');
                      setTab('more');
                    }}
                    onOpenPodcast={(episode) => openInResources('episode', episode.slug, 'home')}
                  />
                )}
              </DataGate>
            </View>
            <View
              pointerEvents={tab === 'more' ? 'auto' : 'none'}
              accessibilityElementsHidden={tab !== 'more'}
              importantForAccessibility={tab === 'more' ? 'auto' : 'no-hide-descendants'}
              style={[styles.tabPage, { left: screenWidth * 4, width: screenWidth }]}
            >
            {moreView === 'events' && (
              <DataGate loading={eventsQuery.loading} error={eventsQuery.error} onRetry={eventsQuery.refetch}>
              <EventsScreen
                key={eventRequest ? `event-${eventRequest.id}-${eventRequest.n}` : 'events-root'}
                events={previewEvents}
                initialEventId={eventRequest?.id ?? null}
                onBack={() => setMoreView('root')}
                onAddToCalendar={addEventToCalendar}
                onDownloadIcs={downloadEventIcs}
                onRsvp={async (id, choice) => {
                  const event = previewEvents.find((candidate) => candidate.id === id);
                  if (!event?.contentItemId) {
                    Alert.alert('RSVP unavailable', 'This event cannot accept an RSVP in the app.');
                    return;
                  }
                  const previous = previewRsvps[id];
                  setPreviewRsvps((current) => ({ ...current, [id]: choice }));
                  try {
                    await setEventRsvp(
                      event.contentItemId,
                      choice === 'not-attending' ? 'not_attending' : 'attending'
                    );
                    eventsQuery.refetch();
                  } catch (error) {
                    setPreviewRsvps((current) => ({ ...current, [id]: previous }));
                    Alert.alert('RSVP not saved', error instanceof Error ? error.message : 'Please try again.');
                    throw error;
                  }
                }}
              />
              </DataGate>
            )}
            {moreView === 'root' && (
              <MoreScreen
                member={member}
                annualMeetingEnabled={!!annualMeeting}
                annualMeetingStatus={annualMeeting ? `${annualMeeting.dateLabel} · ${annualMeeting.registrationStatus}` : 'Currently unavailable'}
                updateCount={announcements.filter((item) => item.unread).length + surveys.filter((item) => item.status !== 'submitted' && item.status !== 'closed').length}
                eventCount={previewEvents.filter((event) => event.status === 'upcoming').length}
                resourceCount={libraryQuery.data?.resources.length ?? 0}
                jobCount={jobsQuery.data?.length ?? 0}
                onOpenAnnualMeeting={() => setMoreView('annual-meeting')}
                onOpenUpdates={() => {
                  setUpdateRequest((current) => ({ selection: null, n: current.n + 1 }));
                  setMoreView('updates');
                }}
                onOpenEvents={() => {
                  setEventRequest(null);
                  setMoreView('events');
                }}
                onOpenResources={() => {
                  setResourcesRequest(null);
                  setResourcesNewsOpen(false);
                  setMoreView('resources');
                }}
                onOpenJobBoard={() => {
                  setResourcesRequest((current) => ({
                    kind: 'job-board',
                    id: 'jobs',
                    sequence: (current?.sequence ?? 0) + 1,
                    origin: 'more',
                    view: 'jobs',
                    returnTab: 'more',
                    returnMoreView: 'root',
                  }));
                  setResourcesNewsOpen(false);
                  setMoreView('resources');
                }}
                onOpenAccount={() => setMoreView('account')}
              />
            )}
            {moreView === 'account' && (
              <AccountScreen
                member={member}
                themePreference={themePreference}
                signingOut={signingOut}
                onBack={() => setMoreView('root')}
                onOpenProfile={openProfile}
                onEditProfile={() => setMoreView('edit-profile')}
                onOpenEmailPreferences={() => setMoreView('email-preferences')}
                onOpenMentions={() => setMoreView('mentions')}
                onOpenUpvotes={() => setMoreView('upvotes')}
                onOpenSecurity={() => setMoreView('security')}
                onThemeChange={setThemePreference}
                onSignOut={requestSignOut}
              />
            )}
            {moreView === 'edit-profile' && meQuery.data && (
              <ProfileSettingsScreen
                profile={meQuery.data}
                onBack={() => setMoreView('account')}
                onSave={async (input) => {
                  await updateOwnProfile(input);
                  await meQuery.refetch();
                }}
                onUploadAvatar={async (uri, byteSize) => {
                  await uploadMemberAvatar({ uri, byteSize });
                  await meQuery.refetch();
                }}
                onRemoveAvatar={async () => {
                  await removeMemberAvatar();
                  await meQuery.refetch();
                }}
                onImportLinkedInAvatar={async () => {
                  await importLinkedInMemberAvatar();
                  await meQuery.refetch();
                }}
              />
            )}
            {moreView === 'email-preferences' && (
              <DataGate
                loading={emailPreferencesQuery.loading}
                error={emailPreferencesQuery.error}
                onRetry={emailPreferencesQuery.refetch}
              >
                {emailPreferencesQuery.data ? (
                  <EmailPreferencesScreen
                    preferences={emailPreferencesQuery.data}
                    pending={pendingEmailPreference}
                    onBack={() => setMoreView('account')}
                    onChange={async (preference, enabled) => {
                      setPendingEmailPreference(preference);
                      try {
                        await updateMemberEmailPreference(preference, enabled);
                        await emailPreferencesQuery.refetch();
                      } finally {
                        setPendingEmailPreference(null);
                      }
                    }}
                  />
                ) : null}
              </DataGate>
            )}
            {moreView === 'mentions' && (
              <DataGate
                loading={mentionsQuery.loading}
                error={mentionsQuery.error}
                onRetry={mentionsQuery.refetch}
              >
                <MentionHistoryScreen
                  items={mentionsQuery.data ?? []}
                  onBack={() => setMoreView('account')}
                  onOpen={(item) => {
                    const group = groups.find((candidate) => candidate.slug === item.workingGroupSlug);
                    if (!group) return;
                    setMoreView('root');
                    setTab('groups');
                    openGroup(group.id);
                    openThread(item.targetId);
                  }}
                />
              </DataGate>
            )}
            {moreView === 'security' && meQuery.data && (
              <SecuritySettingsScreen
                mentionHandle={meQuery.data.mentionHandle}
                onBack={() => setMoreView('account')}
                onSaveHandle={async (mentionHandle) => {
                  await updateMemberHandle(mentionHandle);
                  await meQuery.refetch();
                }}
                onRequestPasswordChange={requestPasswordChange}
              />
            )}
            {moreView === 'upvotes' && (
              <DataGate
                loading={upvotesQuery.loading}
                error={upvotesQuery.error}
                onRetry={upvotesQuery.refetch}
              >
                <UpvoteHistoryScreen
                  items={upvotesQuery.data?.items ?? []}
                  onBack={() => setMoreView('account')}
                />
              </DataGate>
            )}
            {moreView === 'annual-meeting' && (
              <DataGate loading={annualMeetingQuery.loading} error={annualMeetingQuery.error} onRetry={annualMeetingQuery.refetch}>
                {annualMeeting ? (
                  <AnnualMeetingScreen
                    meeting={annualMeeting}
                    onBack={() => setMoreView('root')}
                    onSubmitRegistration={async (input) => {
                      const registration = await saveAnnualMeetingRegistration(input);
                      setAnnualMeetingOverride((current) => current ? { ...current, ...registration } : current);
                      annualMeetingQuery.refetch();
                    }}
                  />
                ) : null}
              </DataGate>
            )}
            {moreView === 'updates' && (
              <DataGate loading={updatesQuery.loading} error={updatesQuery.error} onRetry={updatesQuery.refetch}>
              <UpdatesScreen
                key={`updates-${updateRequest.n}`}
                announcements={announcements}
                surveys={surveys}
                initialSelection={updateRequest.selection}
                onBack={() => setMoreView('root')}
                onReadAnnouncement={async (notificationId) => {
                  await markNotificationsRead([notificationId]);
                  updatesQuery.refetch();
                  notificationsQuery.refetch();
                }}
                onSubmitSurvey={async (surveyId, answers) => {
                  await submitSurveyResponse(surveyId, answers);
                  setSurveySubmissions((current) => ({ ...current, [surveyId]: true }));
                  updatesQuery.refetch();
                }}
              />
              </DataGate>
            )}
            {moreView === 'resources' && (
              <DataGate
                loading={
                  meQuery.loading ||
                  (resourcesRequest?.view === 'podcasts'
                    ? podcastQuery.loading
                    : resourcesRequest?.view === 'jobs'
                      ? jobsQuery.loading
                      : libraryQuery.loading || podcastQuery.loading || jobsQuery.loading)
                }
                error={
                  meQuery.error ??
                  (resourcesRequest?.view === 'podcasts'
                    ? podcastQuery.error
                    : resourcesRequest?.view === 'jobs'
                      ? jobsQuery.error
                      : libraryQuery.error ?? podcastQuery.error ?? jobsQuery.error)
                }
                onRetry={() => {
                  meQuery.refetch();
                  libraryQuery.refetch();
                  podcastQuery.refetch();
                  jobsQuery.refetch();
                }}
              >
                {resourcesNewsOpen ? (
                  <NewsScreen
                    stories={libraryQuery.data?.newsRadar ?? []}
                    onBack={() => setResourcesNewsOpen(false)}
                    onOpen={openStory}
                  />
                ) : (
                  <ResourcesScreen
                    member={member}
                    navigationRequest={resourcesRequest}
                    onBack={() => {
                      const request = resourcesRequest;
                      setResourcesRequest(null);
                      if (request?.origin === 'home') {
                        setTab('home');
                        return;
                      }
                      if (request?.origin === 'return') {
                        setMoreView(request.returnMoreView);
                        setTab(request.returnTab);
                        return;
                      }
                      setMoreView('root');
                    }}
                    resources={libraryQuery.data?.resources ?? []}
                    episodes={podcastQuery.data ?? []}
                    jobs={jobsQuery.data ?? []}
                    news={libraryQuery.data?.newsRadar ?? []}
                    initialView={
                      resourcesRequest?.view === 'podcasts'
                        ? 'podcasts'
                        : resourcesRequest?.view === 'jobs'
                          ? 'jobs'
                          : 'hub'
                    }
                    initialEpisodeSlug={
                      resourcesRequest?.kind === 'episode' ? resourcesRequest.id : null
                    }
                    initialJobId={resourcesRequest?.kind === 'job' ? resourcesRequest.id : null}
                    onOpenResource={openResource}
                    onOpenTranscript={(e) => getPodcastTranscript(e.slug)}
                    onOpenPodcastPerson={openPodcastPerson}
                    onOpenShowNotesLink={(href) => void Linking.openURL(href)}
                    onDownloadPodcastAudio={downloadPodcastAudio}
                    onDownloadPodcastTranscript={downloadPodcastTranscript}
                    onApplyToJob={(j) => j.applyUrl && void Linking.openURL(j.applyUrl)}
                    onGoNews={() => setResourcesNewsOpen(true)}
                  />
                )}
              </DataGate>
            )}
            </View>
            <View
              pointerEvents={tab === 'groups' ? 'auto' : 'none'}
              accessibilityElementsHidden={tab !== 'groups'}
              importantForAccessibility={tab === 'groups' ? 'auto' : 'no-hide-descendants'}
              style={[styles.tabPage, { left: screenWidth, width: screenWidth }]}
            >
              <DataGate
                loading={meQuery.loading || groupsQuery.loading}
                error={meQuery.error ?? groupsQuery.error}
                onRetry={() => {
                  meQuery.refetch();
                  groupsQuery.refetch();
                }}
              >
              <GroupsScreen
                member={member}
                groups={groups}
                newPosts={newPosts}
                selectedGroupFeed={selectedGroupDetail?.items}
                selectedGroupLoading={selectedGroupDetail?.loading ?? false}
                selectedGroupLoadingMore={selectedGroupDetail?.loadingMore ?? false}
                selectedGroupError={selectedGroupDetail?.error ?? null}
                selectedGroupNextCursor={selectedGroupDetail?.nextCursor ?? null}
                selectedGroupTotalMatching={selectedGroupDetail?.totalMatching ?? 0}
                selectedGroupFeedControls={groupId ? feedControls[groupId] ?? DEFAULT_FEED_CONTROLS : DEFAULT_FEED_CONTROLS}
                selectedGroupCoLeads={selectedGroupDetail?.coLeads ?? []}
                selectedGroupMembers={selectedGroupDetail?.members ?? []}
                selectedGroupMembershipRole={selectedGroupDetail?.membershipRole ?? null}
                resources={selectedGroupDetail?.resources ?? []}
                moderationSubmissions={
                  groupId ? resourceModeration[groupId]?.submissions ?? [] : []
                }
                moderationLoading={
                  groupId ? resourceModeration[groupId]?.loading ?? false : false
                }
                moderationError={
                  groupId ? resourceModeration[groupId]?.error ?? null : null
                }
                moderationPendingSubmissionId={moderationPendingSubmissionId}
                onRefreshModeration={() => {
                  if (groupId) loadGroupResourceModeration(groupId);
                }}
                onReviewResource={reviewResourceSubmission}
                onRemoveResource={removeApprovedResource}
                onLoadMoreGroupFeed={loadMoreGroupFeed}
                onApplyGroupFeedControls={applyGroupFeedControls}
                groupId={groupId}
                onOpenGroup={openGroup}
                onCloseGroup={() => setGroupId(null)}
                threadId={threadId}
                onOpenThread={openThread}
                onCloseThread={() => setThreadId(null)}
                postSummaries={postSummaries}
                summarizing={summarizing}
                onSummarize={summarizePost}
                onUpdatePost={updatePost}
                onDeletePost={deletePost}
                onChangePostStatus={changePostStatus}
                extraReplies={extraReplies}
                onReply={addReply}
                onDeleteReply={deleteReply}
                mutationNotice={mutationNotice}
                onDismissMutationNotice={() => setMutationNotice(null)}
                pendingMutations={pendingMutations}
                pollEditors={pollEditors}
                pollEditorErrors={pollEditorErrors}
                onOpenPollEditor={openPollEditor}
                onClosePollEditor={(id) => setPollEditors((current) => ({ ...current, [id]: undefined }))}
                onSavePoll={savePoll}
                onClosePoll={closePoll}
                onDeletePoll={deletePoll}
                votes={votes}
                onVote={vote}
                upvoted={upvoted}
                onToggleUpvote={toggleUpvote}
                reposted={reposted}
                onToggleRepost={toggleRepost}
                subscribed={subscribed}
                onToggleSubscribe={toggleSubscribe}
                rsvps={rsvps}
                onRsvp={setRsvp}
                onCompose={() => setComposerOpen(true)}
                onOpenResourceSubmission={(group) => {
                  setResourceComposerGroupId(group.id);
                }}
                onOpenResource={openResource}
                onOpenAttachment={openForumAttachment}
              />
              </DataGate>
            </View>
            <View
              pointerEvents={tab === 'directory' ? 'auto' : 'none'}
              accessibilityElementsHidden={tab !== 'directory'}
              importantForAccessibility={tab === 'directory' ? 'auto' : 'no-hide-descendants'}
              style={[styles.tabPage, { left: screenWidth * 2, width: screenWidth }]}
            >
              <DataGate
                loading={orgsQuery.loading || directoryPeopleQuery.loading || jobsQuery.loading}
                error={orgsQuery.error ?? directoryPeopleQuery.error ?? jobsQuery.error}
                onRetry={() => {
                  orgsQuery.refetch();
                  directoryPeopleQuery.refetch();
                  jobsQuery.refetch();
                }}
              >
                <DirectoryScreen
                  // Remounts when another screen asks for a specific
                  // organization, so it opens on that profile.
                  key={
                    directoryRequest
                      ? `org-${directoryRequest.orgId}-${directoryRequest.n}`
                      : 'directory'
                  }
                  orgs={orgsQuery.data ?? []}
                  people={directoryPeopleQuery.data ?? []}
                  jobs={jobsQuery.data ?? []}
                  member={member}
                  initialOrgId={directoryRequest?.orgId ?? null}
                  initialTab={directoryRequest?.openMessages ? 'messages' : 'directory'}
                  onOpenJob={(job) => openInResources('job', job.id)}
                  onOpenMemberProfile={openDirectoryProfile}
                  conversations={messageConversations}
                  activeConversation={activeMessageConversation}
                  draftRecipient={draftMessageRecipient}
                  draftGroupParticipants={draftGroupParticipants}
                  messages={messageItems}
                  messagesLoading={
                    messageConversationLoading ||
                    (messageConversationsQuery.loading && messageConversations.length === 0)
                  }
                  messagesError={
                    messageConversationError ??
                    (messageConversationsQuery.error instanceof Error
                      ? messageConversationsQuery.error
                      : null)
                  }
                  messageSending={messageSending}
                  resolvingMemberId={resolvingMessageMemberId}
                  resolvingGroup={resolvingMessageGroup}
                  loadingOlderMessages={messageLoadingOlder}
                  hasOlderMessages={messageHasOlder}
                  messageActionPending={messageActionPending}
                  onOpenConversation={(id) => void openMessageConversation(id)}
                  onStartMessage={(id) => void startMessageConversation(id)}
                  onStartGroupMessage={startGroupMessageConversation}
                  onCloseConversation={closeMessageConversation}
                  onRetryConversation={retryMessageConversation}
                  onSendMessage={sendMessage}
                  onLoadOlderMessages={loadOlderMessages}
                  onSetMessageReaction={toggleMessageReaction}
                  onRenameConversation={renameActiveMessageConversation}
                  onAddConversationMembers={addActiveMessageConversationMembers}
                  onLeaveConversation={leaveActiveMessageConversation}
                />
              </DataGate>
            </View>
            <View
              pointerEvents={tab === 'ask' ? 'auto' : 'none'}
              accessibilityElementsHidden={tab !== 'ask'}
              importantForAccessibility={tab === 'ask' ? 'auto' : 'no-hide-descendants'}
              style={[styles.tabPage, { left: screenWidth * 3, width: screenWidth }]}
            >
              {askHistoryOpen ? (
                <AskConversationHistory
                  conversations={askConversations}
                  activeConversationId={activeAskConversationId}
                  loading={askConversationsQuery.loading}
                  error={askConversationsQuery.error instanceof Error ? askConversationsQuery.error : null}
                  onBack={() => setAskHistoryOpen(false)}
                  onNewConversation={startNewAskConversation}
                  onOpenConversation={(conversationId) => void openAskConversation(conversationId)}
                  onRetry={askConversationsQuery.refetch}
                />
              ) : (
                <AskScreen
                  messages={askMessages}
                  suggestions={askSuggestionsQuery.data ?? []}
                  loading={askConversationLoading}
                  error={askConversationError}
                  sending={askSending}
                  hasEarlier={askHasEarlier}
                  loadingEarlier={askLoadingEarlier}
                  onSend={(question) => void sendAskMessage(question)}
                  onStop={stopAskGeneration}
                  onOpenSource={openAskSource}
                  onOpenHistory={() => {
                    askConversationsQuery.refetch();
                    setAskHistoryOpen(true);
                  }}
                  onLoadEarlier={() => void loadEarlierAskMessages()}
                  onRetry={activeAskConversationId
                    ? () => void openAskConversation(activeAskConversationId)
                    : undefined}
                />
              )}
            </View>
              </Animated.View>

            {/* Over the tab rather than in place of it, so the tab underneath
                keeps its scroll position while the profile is open. */}
            {profileOpen && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: t.surfacePage }]}>
                <DirectoryMemberProfileScreen
                  profile={
                    directoryProfileQuery.data?.id === profileTargetId
                      ? directoryProfileQuery.data
                      : null
                  }
                  loading={
                    directoryProfileQuery.loading ||
                    (!directoryProfileQuery.error &&
                      directoryProfileQuery.data?.id !== profileTargetId)
                  }
                  error={directoryProfileQuery.error ?? null}
                  activityKind={profileActivityKind}
                  activity={
                    directoryProfileActivityQuery.data?.kind === profileActivityKind &&
                    directoryProfileActivityQuery.data.page === profileActivityPage
                      ? directoryProfileActivityQuery.data
                      : null
                  }
                  activityLoading={directoryProfileActivityQuery.loading}
                  activityError={directoryProfileActivityQuery.error ?? null}
                  onBack={() => setProfileOpen(false)}
                  onRetry={() => {
                    directoryProfileQuery.refetch();
                    directoryProfileActivityQuery.refetch();
                  }}
                  onSelectActivityKind={(kind) => {
                    setProfileActivityKind(kind);
                    setProfileActivityPage(1);
                  }}
                  onActivityPage={setProfileActivityPage}
                  onOpenActivity={(item: MemberProfileActivityItem) => {
                    const group = groups.find((candidate) => candidate.slug === item.groupSlug);
                    if (!group) {
                      Alert.alert('Working group unavailable', 'This activity is no longer available in your groups.');
                      return;
                    }
                    setProfileOpen(false);
                    setGroupId(group.id);
                    setTab('groups');
                  }}
                  onOpenWorkingGroup={(groupSlug) => {
                    const group = groups.find((candidate) => candidate.slug === groupSlug);
                    if (!group) {
                      Alert.alert('Working group unavailable', 'This working group is not available.');
                      return;
                    }
                    setProfileOpen(false);
                    setGroupId(group.id);
                    setTab('groups');
                  }}
                  onOpenEvent={(event) => {
                    if (event.source === 'working_group_event' && event.groupSlug) {
                      const group = groups.find((candidate) => candidate.slug === event.groupSlug);
                      if (group) {
                        setProfileOpen(false);
                        setGroupId(group.id);
                        setTab('groups');
                        return;
                      }
                    }
                    const eventId = event.contentItemId ?? event.id.replace(/^member-event:/, '');
                    setEventRequest((current) => ({ id: eventId, n: (current?.n ?? 0) + 1 }));
                    setProfileOpen(false);
                    setMoreView('events');
                    setTab('more');
                  }}
                  onOpenOrganization={(organizationSlug) => {
                    setDirectoryRequest((previous) => ({
                      orgId: organizationSlug,
                      n: (previous?.n ?? 0) + 1,
                    }));
                    setProfileOpen(false);
                    setTab('directory');
                  }}
                  onMessage={(memberId) => {
                    const profile = directoryProfileQuery.data;
                    if (!profile) return;
                    setDirectoryRequest((previous) => ({
                      orgId: profile.organization.slug,
                      openMessages: true,
                      n: (previous?.n ?? 0) + 1,
                    }));
                    setProfileOpen(false);
                    setTab('directory');
                    void startMessageConversation(memberId);
                  }}
                  onEdit={() => {
                    setProfileOpen(false);
                    setMoreView('edit-profile');
                    setTab('more');
                  }}
                />
              </View>
            )}
            </View>
          </GestureDetector>
          <PodcastNowPlayingBar onOpenEpisode={(slug) => openInResources('episode', slug)} />
          <PortalTabBar
            tab={tab}
            onSelect={selectTab}
            showBadges={SHOW_BADGES}
            badges={{
              groups: myGroups.reduce((total, group) => total + group.unread, 0),
              more:
                announcements.filter((item) => item.unread).length +
                surveys.filter((item) => item.status !== 'submitted' && item.status !== 'closed').length,
            }}
          />
          {profileSheetOpen && !!meQuery.data && (
            <MemberSheet
              member={meQuery.data}
              repostCount={(repostsQuery.data ?? []).length}
              onClose={() => setProfileSheetOpen(false)}
              onOpenProfile={openProfile}
              onSignOut={requestSignOut}
            />
          )}
          <NotificationArrivalBanner
            notification={notificationArrivals[0] ?? null}
            onOpen={openNotification}
            onDismiss={dismissNotificationArrival}
          />
          {notificationsOpen && (
            <NotificationsSheet
              notifications={notifications}
              loading={notificationsQuery.loading || notificationsQuery.refreshing}
              error={notificationsQuery.error}
              pendingIds={Object.keys(pendingNotifications)}
              onOpen={openNotification}
              onMarkRead={markNotificationRead}
              onMarkAllRead={markAllNotificationsRead}
              onClearAll={clearNotifications}
              onDismiss={dismissNotification}
              onRetry={notificationsQuery.refetch}
              onClose={() => setNotificationsOpen(false)}
            />
          )}
          {composerOpen && (
            <PostComposer
              groups={groups}
              // The composer opens from inside a group, so that group is the default.
              initialGroupId={groupId ?? groups[0]?.id ?? ''}
              tagSuggestions={groupId ? (groupDetails[groupId]?.tagSuggestions ?? []) : []}
              mentionMembersByGroup={Object.fromEntries(
                groups.map((group) => [group.id, groupDetails[group.id]?.members ?? []])
              )}
              onSelectGroup={loadGroupMetadata}
              onClose={() => setComposerOpen(false)}
              onCreate={(draft) => createPost(draft, member)}
            />
          )}
          {resourceComposerGroupId && (
            <ResourceSubmissionComposer
              groupName={groups.find((group) => group.id === resourceComposerGroupId)?.n ?? 'this group'}
              submitting={resourceSubmitting}
              onClose={() => setResourceComposerGroupId(null)}
              onSubmit={submitResource}
            />
          )}
          {resourceViewer && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: t.surfacePage }]}>
              <ResourceViewer
                resource={resourceViewer.resource}
                accessToken={resourceViewer.accessToken}
                onClose={() => setResourceViewer(null)}
              />
            </View>
          )}
        </>
      )}
    </View>
    </MemberProvider>
  );
}

function homeGroupDestination(href: string): {
  slug: string;
  itemId: string;
  itemType: 'discussion' | 'poll';
} | null {
  try {
    const segments = new URL(href, 'https://gpfa.example').pathname.split('/').filter(Boolean);
    if (segments[0] !== 'members' || segments[1] !== 'groups' || !segments[2]) return null;
    if (segments[3] === 'polls' && segments[4]) {
      return { slug: segments[2], itemId: segments[4], itemType: 'poll' };
    }
    if (segments[3]) {
      return { slug: segments[2], itemId: segments[3], itemType: 'discussion' };
    }
    return null;
  } catch {
    return null;
  }
}

function updateThreadInGroupDetails(
  details: Record<string, GroupDetailState | undefined>,
  threadId: string,
  patch: Partial<Thread>
): Record<string, GroupDetailState | undefined> {
  return Object.fromEntries(
    Object.entries(details).map(([id, detail]) => [
      id,
      detail
        ? {
            ...detail,
            items: detail.items.map((entry) =>
              entry.post.id === threadId ? { ...entry, post: { ...entry.post, ...patch } } : entry
            ),
          }
        : detail,
    ])
  );
}

function removeThreadFromGroupDetails(
  details: Record<string, GroupDetailState | undefined>,
  threadId: string
): Record<string, GroupDetailState | undefined> {
  return Object.fromEntries(
    Object.entries(details).map(([id, detail]) => [
      id,
      detail ? { ...detail, items: detail.items.filter((entry) => entry.post.id !== threadId) } : detail,
    ])
  );
}

function appendThreadToGroupDetails(
  details: Record<string, GroupDetailState | undefined>,
  entry: FeedEntry
): Record<string, GroupDetailState | undefined> {
  const current = details[entry.groupId] ?? EMPTY_GROUP_DETAIL;
  return {
    ...details,
    [entry.groupId]: {
      ...current,
      items: [entry, ...current.items.filter((item) => item.post.id !== entry.post.id)],
    },
  };
}

function replaceThreadInGroupDetails(
  details: Record<string, GroupDetailState | undefined>,
  entry: FeedEntry
): Record<string, GroupDetailState | undefined> {
  return Object.fromEntries(
    Object.entries(details).map(([id, detail]) => [
      id,
      detail
        ? {
            ...detail,
            items: detail.items.map((item) => (item.post.id === entry.post.id ? entry : item)),
          }
        : detail,
    ])
  );
}

function removeReplyFromEntries(entries: FeedEntry[], postId: string, replyId: string): FeedEntry[] {
  return entries.map((entry) => entry.post.id === postId ? {
    ...entry,
    post: { ...entry.post, replies: entry.post.replies.filter((reply) => reply.id !== replyId) },
  } : entry);
}

function removeReplyFromGroupDetails(
  details: Record<string, GroupDetailState | undefined>,
  postId: string,
  replyId: string
): Record<string, GroupDetailState | undefined> {
  return Object.fromEntries(Object.entries(details).map(([id, detail]) => [
    id,
    detail ? { ...detail, items: removeReplyFromEntries(detail.items, postId, replyId) } : detail,
  ]));
}

function mutationErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message.trim() ? cause.message : fallback;
}

function reconcileThreadDetailState(
  threadId: string,
  response: WorkingGroupFeedItemResponse,
  post: Thread,
  setUpvoted: Dispatch<SetStateAction<Record<string, boolean | undefined>>>,
  setReposted: Dispatch<SetStateAction<Record<string, boolean | undefined>>>,
  setVotes: Dispatch<SetStateAction<Record<string, number | undefined>>>
): void {
  const target = response.detail.kind === 'thread' ? response.detail.thread : response.detail.poll;
  const hasUpvoted = target.hasUpvoted;
  const hasReposted = target.hasReposted ?? target.hasSaved;

  if (typeof hasUpvoted === 'boolean') {
    setUpvoted((prev) => ({ ...prev, [threadId]: hasUpvoted }));
  }
  if (typeof hasReposted === 'boolean') {
    setReposted((prev) => ({ ...prev, [threadId]: hasReposted }));
  }

  if (response.detail.kind !== 'poll') return;
  const selectedOptionId = recordsFrom(response.detail.answers)
    .map((answer) => firstStringValue(answer.optionId, answer.option_id, answer.pollOptionId, answer.poll_option_id))
    .find((value): value is string => !!value);
  if (!selectedOptionId) return;

  const selectedIndex = post.poll?.options.findIndex((option) => option.id === selectedOptionId) ?? -1;
  if (selectedIndex >= 0) {
    setVotes((prev) => ({ ...prev, [threadId]: selectedIndex }));
  }
}

function recordsFrom(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object') : [];
}

function firstStringValue(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function mergeMessages(current: MessageItem[], incoming: MessageItem[]): MessageItem[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => left.ordinal - right.ordinal);
}

function updateMessageReaction(
  messages: MessageItem[],
  messageId: string,
  emoji: MessageReaction,
  active: boolean
): MessageItem[] {
  return messages.map((message) => {
    if (message.id !== messageId) return message;
    const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
    if (!existing && !active) return message;
    if (!existing) {
      return {
        ...message,
        reactions: [...message.reactions, { emoji, count: 1, reactedByCurrentMember: true }],
      };
    }
    const count = Math.max(0, existing.count + (active ? 1 : -1));
    return {
      ...message,
      reactions: count === 0
        ? message.reactions.filter((reaction) => reaction.emoji !== emoji)
        : message.reactions.map((reaction) =>
            reaction.emoji === emoji
              ? { ...reaction, count, reactedByCurrentMember: active }
              : reaction
          ),
    };
  });
}

function createClientNonce(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = character === 'x' ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  // Every text style names a font face, so nothing should paint until they load.
  if (!fontsLoaded) return <View style={[styles.root, styles.blank]} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider initialDark={DARK_MODE}>
          <AuthProvider>
            {/* Above Portal so the now-playing bar survives tab switches. */}
            <PodcastPlayerProvider>
              <Portal />
            </PodcastPlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blank: { backgroundColor: '#f7fafb' },
  screen: { flex: 1, minHeight: 0 },
  tabViewport: { overflow: 'hidden' },
  tabTrack: { flex: 1, position: 'relative' },
  tabPage: { position: 'absolute', top: 0, bottom: 0 },
});
