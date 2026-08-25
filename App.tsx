import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import NotificationsSheet from './src/components/NotificationsSheet';
import PortalTabBar, { type TabId } from './src/components/PortalTabBar';
import PostComposer from './src/components/PostComposer';
import ResourceViewer from './src/components/ResourceViewer';
import PodcastNowPlayingBar from './src/components/podcast/PodcastNowPlayingBar';
import { PodcastPlayerProvider } from './src/components/podcast/PlayerProvider';
import ResourceSubmissionComposer from './src/components/groups/ResourceSubmissionComposer';
import { ThemeProvider, useTheme } from './src/ds/ThemeProvider';
import AskScreen from './src/screens/AskScreen';
import AnnualMeetingScreen, { type AnnualMeetingPreview } from './src/screens/AnnualMeetingScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import EventsScreen, { type EventRsvpState, type MobileEventPreview } from './src/screens/EventsScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import HomeScreen, { type HomeActionPreview } from './src/screens/HomeScreen';
import MemberProfileScreen from './src/screens/MemberProfileScreen';
import MoreScreen from './src/screens/MoreScreen';
import NewsScreen from './src/screens/NewsScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import SignInScreen from './src/screens/SignInScreen';
import UpdatesScreen, {
  type MobileAnnouncementPreview,
  type MobileSurveyPreview,
  type UpdateSelection,
} from './src/screens/UpdatesScreen';
import {
  addMessageConversationMembers,
  castVote,
  createPost as createPostRequest,
  createReply,
  deleteForumThread,
  dismissNotifications,
  getDirectoryPeople,
  getFeed,
  getGroups,
  getJobs,
  getMemberOrgs,
  getLibrary,
  getMe,
  getMemberReposts,
  getMessageConversation,
  getMessageConversations,
    leaveMessageConversation,
  getNotifications,
  getPodcasts,
  getWorkingGroupCoLeadMembers,
  getWorkingGroupDirectoryMembers,
  getWorkingGroupResources,
  getWorkingGroupTagUsage,
  getWorkingGroupThreadFeed,
  getWorkingGroupMembership,
  getWorkingGroupFeedItemDetail,
  markNotificationsRead,
  markMessageConversationRead,
  renameMessageConversation,
  resolveDirectMessageConversation,
  resolveGroupMessageConversation,
  sendMemberMessage,
  setMessageReaction,
  setRsvp as setRsvpRequest,
  setReposted as setRepostedRequest,
  setSubscribed as setSubscribedRequest,
  setUpvote,
  submitWorkingGroupResource,
  summarizeForum,
  updateForumThread,
  updateForumThreadStatus,
  workingGroupFeedItemResponseToEntry,
} from './src/api/portal';
import { useQuery } from './src/api/useQuery';
import { getAccessToken } from './src/api/tokens';
import type {
  ConversationDetail,
  ConversationSummary,
  FeedEntry,
  ForumAttachment,
  GroupMember,
  LibraryResource,
  Member,
  MemberNotification,
  MemberOrg,
  MemberRepost,
  MessageItem,
  MessageReaction,
  MessagingParticipant,
  NewPostInput,
  NewsStory,
  Reply,
  RsvpChoice,
  Thread,
  WorkingGroupFeedItemResponse,
  WorkingGroupResourceSubmissionInput,
} from './src/api/types';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { MemberProvider } from './src/auth/MemberProvider';
import DataGate from './src/components/DataGate';
import { openForumAttachment as openForumAttachmentFile } from './src/lib/forumAttachments';

// The design exposes these as editor props on the component.
const DEFAULT_TAB: TabId = 'home';
const DARK_MODE = false;
const SHOW_BADGES = true;

interface GroupDetailState {
  items: FeedEntry[];
  nextCursor: string | null;
  snapshotAt: string | null;
  totalMatching: number;
  coLeads: GroupMember[];
  members: GroupMember[];
  resources: LibraryResource[];
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
  tagSuggestions: [],
  loading: false,
  loadingMore: false,
  error: null,
};

// Temporary presentation fixtures let the new information architecture be
// reviewed before any mobile or web API contract is introduced.
const MOBILE_EVENTS: MobileEventPreview[] = [
  {
    id: 'policy-roundtable',
    month: 'SEP',
    day: '04',
    title: 'Global policy and regulatory roundtable',
    dateLabel: 'Thursday, September 4, 2026',
    timeLabel: '9:00–10:30 AM ET',
    location: 'GPFA Member Forum',
    format: 'Virtual',
    type: 'Policy briefing',
    status: 'upcoming',
    rsvp: 'attending',
    registrationOpen: true,
    summary: 'A member-only briefing on the policy developments shaping private funds across the United States, Europe and Asia.',
    attendeeCount: 46,
    joinUrl: 'https://example.com/member-event',
    agenda: [
      { time: '9:00 AM', title: 'Market and policy briefing', detail: 'A cross-jurisdiction scan from the GPFA policy team.' },
      { time: '9:35 AM', title: 'Member roundtable', detail: 'Peer discussion and practical questions.' },
      { time: '10:15 AM', title: 'Priorities and close' },
    ],
  },
  {
    id: 'operations-benchmarking',
    month: 'SEP',
    day: '11',
    title: 'Operating model benchmarking exchange',
    dateLabel: 'Thursday, September 11, 2026',
    timeLabel: '11:00 AM–12:00 PM ET',
    location: 'Microsoft Teams',
    format: 'Virtual',
    type: 'Peer exchange',
    status: 'upcoming',
    rsvp: 'not-responded',
    registrationOpen: true,
    summary: 'Compare operating-model priorities with peers and identify the measures members want reflected in the next benchmark.',
    attendeeCount: 28,
    agenda: [
      { time: '11:00 AM', title: 'Benchmark preview' },
      { time: '11:20 AM', title: 'Facilitated peer exchange' },
      { time: '11:50 AM', title: 'Next steps' },
    ],
  },
  {
    id: 'annual-meeting-welcome',
    month: 'SEP',
    day: '17',
    title: 'Annual Meeting welcome and member reception',
    dateLabel: 'Thursday, September 17, 2026',
    timeLabel: '5:30–8:00 PM BST',
    location: 'The Langham, London',
    format: 'In person',
    type: 'Annual Meeting',
    status: 'upcoming',
    rsvp: 'attending',
    registrationOpen: true,
    summary: 'Open the 2026 Annual Meeting with a concise market outlook and an evening of member connection.',
    attendeeCount: 132,
    agenda: [
      { time: '5:30 PM', title: 'Registration and welcome' },
      { time: '6:00 PM', title: 'Opening perspective' },
      { time: '6:30 PM', title: 'Member reception' },
    ],
  },
  {
    id: 'summer-credit-briefing',
    month: 'JUL',
    day: '22',
    title: 'Private credit market briefing',
    dateLabel: 'Tuesday, July 22, 2026',
    timeLabel: '10:00–11:00 AM ET',
    location: 'GPFA Member Forum',
    format: 'Virtual',
    type: 'Market briefing',
    status: 'past',
    rsvp: 'attending',
    registrationOpen: false,
    summary: 'A review of private-credit conditions and emerging portfolio themes.',
    agenda: [{ time: '10:00 AM', title: 'Briefing and discussion' }],
  },
];

const MOBILE_ANNOUNCEMENTS: MobileAnnouncementPreview[] = [
  {
    id: 'member-platform-update',
    title: 'A clearer way to find member activity',
    summary: 'Events, surveys and essential announcements now have dedicated places in the mobile experience.',
    dateLabel: 'AUG 26',
    unread: true,
    important: true,
    body: [
      'The mobile portal is being reorganized around the work members return to most often. Events now sit in the primary navigation, while Annual Meeting information and member updates are grouped under More.',
      'This preview uses representative content so the navigation, hierarchy and reading experience can be reviewed before any new service integration begins.',
    ],
  },
  {
    id: 'annual-meeting-materials',
    title: 'Annual Meeting agenda materials are available',
    summary: 'Review the first program release and practical travel information for London.',
    dateLabel: 'AUG 20',
    unread: true,
    body: [
      'The first agenda release includes plenary discussions, working sessions and the member reception. Session details will continue to be refined as speakers are confirmed.',
      'Registered members can review the program and logistics from the Annual Meeting page in the mobile app.',
    ],
  },
];

const MOBILE_SURVEYS: MobileSurveyPreview[] = [
  {
    id: 'operating-priorities',
    title: '2027 operating priorities pulse',
    description: 'Help shape the research and peer exchanges GPFA develops for the coming year.',
    closesLabel: 'CLOSES SEP 12',
    status: 'not-started',
    questions: [
      { id: 'priority', prompt: 'Which operating priority is most important to your organization?', options: ['Data and reporting', 'Technology modernization', 'Talent and operating model', 'Regulatory readiness'] },
      { id: 'investment', prompt: 'How do you expect related investment to change in 2027?', options: ['Increase significantly', 'Increase modestly', 'Remain stable', 'Decrease'] },
      { id: 'format', prompt: 'Which GPFA format would be most useful?', options: ['Small peer roundtable', 'Benchmarking report', 'Practitioner briefing', 'Working group series'] },
    ],
  },
];

const ANNUAL_MEETING: AnnualMeetingPreview = {
  title: '2026 GPFA Annual Meeting',
  subtitle: 'Perspective, practice and connection across the global private funds community.',
  dateLabel: 'September 17–18, 2026',
  location: 'The Langham, London',
  timezone: 'British Summer Time',
  summary: 'Two focused days for GPFA members to compare priorities, test practical ideas and build relationships across markets and functions.',
  registrationStatus: 'Not registered',
  registrationOpen: true,
  agenda: [
    {
      id: 'day-one',
      label: 'Day one',
      date: 'THURSDAY · SEPTEMBER 17',
      sessions: [
        { time: '2:00 PM', title: 'Member working sessions', detail: 'Small-group exchanges organized around current member priorities.', location: 'Grand Ballroom' },
        { time: '5:30 PM', title: 'Welcome and opening perspective', detail: 'A concise outlook for private funds leaders.', location: 'Grand Ballroom' },
        { time: '6:30 PM', title: 'Member reception', detail: 'An evening for connection across the GPFA community.', location: 'Palm Court' },
      ],
    },
    {
      id: 'day-two',
      label: 'Day two',
      date: 'FRIDAY · SEPTEMBER 18',
      sessions: [
        { time: '8:30 AM', title: 'Breakfast briefing', detail: 'Market, policy and operating context.', location: 'Grand Ballroom' },
        { time: '10:00 AM', title: 'Practitioner forums', detail: 'Concurrent discussions led by GPFA members.', location: 'Meeting suites' },
        { time: '2:30 PM', title: 'Closing member agenda', detail: 'Priorities and commitments for the year ahead.', location: 'Grand Ballroom' },
      ],
    },
  ],
  logistics: [
    { title: 'The Langham, London', detail: '1C Portland Place, Regent Street, London W1B 1JA.' },
    { title: 'Member room block', detail: 'A limited member rate is available through August 28.' },
  ],
};

const HOME_ACTIONS: HomeActionPreview[] = [
  { id: 'operating-priorities', kind: 'survey', title: 'Complete the 2027 priorities pulse', description: '3 questions · closes September 12', actionLabel: 'Start' },
  { id: 'annual-meeting', kind: 'annual-meeting', title: 'Register for the Annual Meeting', description: 'September 17–18 · London', actionLabel: 'Register' },
  { id: 'member-platform-update', kind: 'announcement', title: 'Read the latest member update', description: 'A clearer mobile experience', actionLabel: 'Read' },
];

type MoreView = 'root' | 'annual-meeting' | 'updates' | 'events' | 'resources';

function Portal() {
  const { t } = useTheme();

  const { isSignedIn, status, signOut } = useAuth();
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB);
  const [moreView, setMoreView] = useState<MoreView>('root');
  const [eventRequest, setEventRequest] = useState<{ id: string; n: number } | null>(null);
  const [updateRequest, setUpdateRequest] = useState<{
    selection: UpdateSelection | null;
    n: number;
  }>({ selection: null, n: 0 });
  const [previewRsvps, setPreviewRsvps] = useState<Record<string, EventRsvpState | undefined>>({});
  // News Radar is a branch of Home, not a tab — the design's caret returns there.
  const [newsOpen, setNewsOpen] = useState(false);
  // The Resources hub links to it too. Tracked separately so the caret goes
  // back to whichever hub opened it.
  const [resourcesNewsOpen, setResourcesNewsOpen] = useState(false);
  // The Groups tab is a directory; this is the group whose page is open.
  const [groupId, setGroupId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<Record<string, GroupDetailState | undefined>>({});
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
  const [resourceViewer, setResourceViewer] = useState<{
    resource: LibraryResource;
    accessToken: string | null;
  } | null>(null);
  // The member's own profile, reached from the header avatar on any tab: the
  // quick sheet first, then the full profile over whichever tab is underneath.
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<MemberNotification[]>([]);
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

  // Portal data. Member-scoped ready routes wait for sign-in; the rest can stay
  // fixture-backed while EXPO_PUBLIC_FIXTURE_PORTAL_DATA is true.
  const meQuery = useQuery(
    () => (isSignedIn ? getMe() : Promise.resolve(null)),
    [isSignedIn]
  );
  const groupsQuery = useQuery(() => (isSignedIn ? getGroups() : Promise.resolve([])), [isSignedIn]);
  const feedQuery = useQuery(getFeed, []);
  const libraryQuery = useQuery(
    () => (isSignedIn ? getLibrary() : Promise.resolve({ resources: [], newsRadar: [] })),
    [isSignedIn]
  );
  const podcastQuery = useQuery(getPodcasts, []);
  const jobsQuery = useQuery(getJobs, []);
  const orgsQuery = useQuery(
    () => (isSignedIn ? getMemberOrgs() : Promise.resolve([])),
    [isSignedIn]
  );
  const directoryPeopleQuery = useQuery(
    () => (isSignedIn ? getDirectoryPeople() : Promise.resolve([])),
    [isSignedIn]
  );
  const messageConversationsQuery = useQuery(
    () =>
      isSignedIn
        ? getMessageConversations()
        : Promise.resolve({ status: 'success' as const, conversations: [], totalUnread: 0 }),
    [isSignedIn]
  );
  const shouldLoadReposts = isSignedIn && (profileSheetOpen || profileOpen);
  const repostsQuery = useQuery(
    () =>
      shouldLoadReposts
        ? getMemberReposts(groupsQuery.data ?? [])
        : Promise.resolve([]),
    [shouldLoadReposts, groupsQuery.data]
  );
  const notificationsQuery = useQuery(
    () => (isSignedIn ? getNotifications() : Promise.resolve([])),
    [isSignedIn]
  );

  // DataGate blocks member-dependent screens until this query resolves.
  const member: Member = meQuery.data ?? { id: '', name: '', firstName: '', org: '' };

  useEffect(() => {
    setLocalNotifications(notificationsQuery.data ?? []);
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (!isSignedIn) setLocalNotifications([]);
  }, [isSignedIn]);

  useEffect(() => {
    setMessageConversations(messageConversationsQuery.data?.conversations ?? []);
  }, [messageConversationsQuery.data]);

  useEffect(() => {
    if (isSignedIn) return;
    setActiveMessageConversationId(null);
    setActiveMessageConversation(null);
    setDraftMessageRecipient(null);
    setDraftGroupParticipants([]);
    setMessageItems([]);
  }, [isSignedIn]);

  // What another screen asked Resources to open: an episode from the
  // now-playing bar, or a posting from an organization's directory profile.
  // `n` counts the requests so asking for the same one twice still remounts the
  // screen — the id alone would leave the key unchanged. One slot, not two, so
  // a later request always supersedes the earlier one.
  const [resourcesRequest, setResourcesRequest] = useState<
    | { kind: 'episode'; id: string; n: number }
    | { kind: 'job'; id: string; n: number }
    | { kind: 'job-board'; id: string; n: number }
    | null
  >(null);

  const openInResources = useCallback((kind: 'episode' | 'job', id: string) => {
    setResourcesRequest((prev) => ({ kind, id, n: (prev?.n ?? 0) + 1 }));
    setResourcesNewsOpen(false);
    setMoreView('resources');
    setTab('more');
  }, []);

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
  const [directoryRequest, setDirectoryRequest] = useState<{ orgId: string; n: number } | null>(
    null
  );

  // Handed to MemberProvider, so the header avatar on every screen opens it.
  const openProfileSheet = useCallback(() => setProfileSheetOpen(true), []);

  const openNotifications = useCallback(() => {
    notificationsQuery.refetch();
    setNotificationsOpen(true);
  }, [notificationsQuery.refetch]);

  const openProfile = useCallback(() => {
    setProfileSheetOpen(false);
    setProfileOpen(true);
  }, []);

  const openOrgInDirectory = useCallback((org: MemberOrg) => {
    setDirectoryRequest((prev) => ({ orgId: org.id, n: (prev?.n ?? 0) + 1 }));
    setProfileOpen(false);
    setTab('directory');
  }, []);

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

  const signOutForTesting = useCallback(() => {
    setProfileSheetOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setTab('home');
    setMoreView('root');
    signOut();
  }, [signOut]);

  const openStory = useCallback((story: NewsStory) => {
    if (story.url) void Linking.openURL(story.url);
  }, []);

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const myGroups = useMemo(
    () => groups.filter((group) => subscribed[group.id] ?? group.joined),
    [groups, subscribed]
  );
  const posts = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const dashboardNews = libraryQuery.data?.newsRadar ?? [];
  const previewEvents = useMemo(
    () => MOBILE_EVENTS.map((event) => ({ ...event, rsvp: previewRsvps[event.id] ?? event.rsvp })),
    [previewRsvps]
  );
  const notifications = localNotifications;
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const selectedGroupDetail = groupId ? groupDetails[groupId] : undefined;

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
    setLocalNotifications((prev) =>
      prev.map((notification) => (ids.includes(notification.id) ? { ...notification, read: true } : notification))
    );
    void markNotificationsRead(ids)
      .catch(() => setLocalNotifications(previous))
      .finally(() => setNotificationPending(ids, false));
  }, [notifications, setNotificationPending]);

  const dismissNotification = useCallback((id: string) => {
    const previous = notifications;

    setNotificationPending([id], true);
    setLocalNotifications((prev) => prev.filter((notification) => notification.id !== id));
    void dismissNotifications([id])
      .catch(() => setLocalNotifications(previous))
      .finally(() => setNotificationPending([id], false));
  }, [notifications, setNotificationPending]);

  const loadGroupDetail = useCallback(
    (id: string, cursor?: string | null) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return;
      const slug = group.slug ?? group.id;
      const append = !!cursor;

      setGroupDetails((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? EMPTY_GROUP_DETAIL),
          loading: !append,
          loadingMore: append,
          error: null,
        },
      }));

      const currentDetail = groupDetails[id];
      const feedPromise = getWorkingGroupThreadFeed(slug, id, {
        limit: 20,
        cursor: cursor ?? undefined,
        snapshotAt: cursor ? currentDetail?.snapshotAt ?? undefined : undefined,
      });
      const coLeadsPromise = append
        ? Promise.resolve(currentDetail?.coLeads ?? [])
        : getWorkingGroupCoLeadMembers(slug);
      const membersPromise = append
        ? Promise.resolve(currentDetail?.members ?? [])
        : getWorkingGroupDirectoryMembers(slug);
      const resourcesPromise = append
        ? Promise.resolve(currentDetail?.resources ?? [])
        : getWorkingGroupResources(slug, id);
      const tagsPromise = append
        ? Promise.resolve(currentDetail?.tagSuggestions ?? [])
        : getWorkingGroupTagUsage(slug, { limit: 24 }).then((res) => res.tags.map((tag) => tag.label));

      void Promise.all([feedPromise, coLeadsPromise, membersPromise, resourcesPromise, tagsPromise])
        .then(([feed, coLeads, members, resources, tagSuggestions]) => {
          setGroupDetails((prev) => {
            const current = prev[id] ?? EMPTY_GROUP_DETAIL;
            const existingIds = new Set(current.items.map((entry) => entry.post.id));
            const merged = append
              ? [
                  ...current.items,
                  ...feed.items.filter((entry) => !existingIds.has(entry.post.id)),
                ]
              : feed.items;
            return {
              ...prev,
              [id]: {
                items: merged,
                nextCursor: feed.nextCursor,
                snapshotAt: feed.snapshotAt,
                totalMatching: feed.totalMatching,
                coLeads,
                members,
                resources,
                tagSuggestions,
                loading: false,
                loadingMore: false,
                error: null,
              },
            };
          });
        })
        .catch((cause) => {
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
    [groupDetails, groups]
  );

  const loadMoreGroupFeed = useCallback(() => {
    if (!groupId) return;
    const detail = groupDetails[groupId];
    if (!detail?.nextCursor || detail.loading || detail.loadingMore) return;
    loadGroupDetail(groupId, detail.nextCursor);
  }, [groupDetails, groupId, loadGroupDetail]);

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

  const refreshGroupMembership = useCallback(
    (id: string) => {
      const group = groups.find((g) => g.id === id);
      const slug = group?.slug ?? id;
      void getWorkingGroupMembership(slug)
        .then((membership) => {
          setSubscribed((prev) => ({
            ...prev,
            [id]: membership?.subscriptionStatus === 'subscribed',
          }));
        })
        .catch(() => {});
    },
    [groups]
  );

  // Tapping a group on Home opens that group's page.
  const pickGroup = useCallback((id: string) => {
    setGroupId(id);
    setThreadId(null);
    setTab('groups');
    refreshGroupMembership(id);
    loadGroupDetail(id);
  }, [loadGroupDetail, refreshGroupMembership]);

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
  const addReply = useCallback((id: string, reply: Reply) => {
    const entry = entryForThread(id);
    const group = entry ? groups.find((g) => g.id === entry.groupId) : null;
    const groupSlug = entry?.post.groupSlug ?? group?.slug ?? entry?.groupId;
    setExtraReplies((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), reply] }));
    void createReply(id, reply.text, groupSlug, undefined, reply.uploadFiles)
      .then((created) => {
        setExtraReplies((prev) => ({
          ...prev,
          [id]: (prev[id] ?? []).map((candidate) =>
            candidate === reply
              ? { ...candidate, attachments: created?.attachments ?? candidate.attachments, uploadFiles: undefined }
              : candidate
          ),
        }));
      })
      .catch(() => {
        setExtraReplies((prev) => ({
          ...prev,
          [id]: (prev[id] ?? []).filter((r) => r !== reply),
        }));
      });
  }, [entryForThread, groups]);

  // One vote per organization — the first choice sticks.
  const vote = useCallback((id: string, option: number) => {
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
      void castVote(poll?.id ?? id, option, {
        groupSlug: entry?.post.groupSlug,
        questionId: poll?.questionId,
        optionId: chosen?.id,
      }).catch(() => {
        setVotes((prev) => ({ ...prev, [id]: undefined }));
      });
    }
  }, [entryForThread]);

  const toggleUpvote = useCallback((id: string) => {
    const entry = entryForThread(id);
    const targetType = targetTypeForThread(entry?.post);
    setUpvoted((prev) => {
      const next = !prev[id];
      void setUpvote(id, next, targetType).catch(() => {
        setUpvoted((current) => ({ ...current, [id]: !next }));
      });
      return { ...prev, [id]: next };
    });
  }, [entryForThread, targetTypeForThread]);

  const toggleRepost = useCallback((id: string) => {
    const entry = entryForThread(id);
    const targetType = targetTypeForThread(entry?.post);
    const previous = reposted[id] ?? entry?.post.hasReposted ?? false;
    const next = !previous;

    setReposted((current) => ({ ...current, [id]: next }));
    void setRepostedRequest(id, next, targetType)
      .then(() => {
        if (shouldLoadReposts) repostsQuery.refetch();
      })
      .catch(() => {
        setReposted((current) => ({ ...current, [id]: previous }));
      });
  }, [entryForThread, reposted, repostsQuery.refetch, shouldLoadReposts, targetTypeForThread]);

  const toggleSubscribe = useCallback(
    (id: string) => {
      const group = groups.find((g) => g.id === id);
      const current = subscribed[id] ?? group?.joined ?? false;
      const next = !current;
      setSubscribed((prev) => ({ ...prev, [id]: next }));
      void setSubscribedRequest(group?.slug ?? id, next).catch(() => {
        setSubscribed((prev) => ({ ...prev, [id]: current }));
      });
    },
    [groups, subscribed]
  );

  const setRsvp = useCallback((id: string, choice: RsvpChoice) => {
    const entry = entryForThread(id);
    setRsvps((prev) => {
      const previous = prev[id];
      void setRsvpRequest(id, choice, entry?.post.groupSlug).catch(() => {
        setRsvps((current) => ({ ...current, [id]: previous }));
      });
      return { ...prev, [id]: choice };
    });
  }, [entryForThread]);

  const openThread = useCallback((id: string) => {
    setThreadId(id);
    const entry = entryForThread(id);
    if (!entry) return;
    const group = groups.find((candidate) => candidate.id === entry.groupId);
    const slug = entry.post.groupSlug ?? group?.slug ?? entry.groupId;
    const itemType = entry.post.type ?? 'discussion';

    void getWorkingGroupFeedItemDetail(slug, itemType, id)
      .then((response) => {
        const hydrated = workingGroupFeedItemResponseToEntry(response, entry.groupId);
        setGroupDetails((prev) => replaceThreadInGroupDetails(prev, hydrated));
        setNewPosts((prev) =>
          prev.map((candidate) => (candidate.post.id === id ? { ...candidate, post: hydrated.post } : candidate))
        );
        reconcileThreadDetailState(id, response, hydrated.post, setUpvoted, setReposted, setVotes);
      })
      .catch(() => {});
  }, [entryForThread, groups]);

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
      } finally {
        setResourceSubmitting(false);
      }
    },
    [groupId, groups, resourceComposerGroupId]
  );

  const summarizePost = useCallback((id: string) => {
    const entry = entryForThread(id);
    if (!entry?.post.groupSlug) return;
    setSummarizing((prev) => ({ ...prev, [id]: true }));
    void summarizeForum({ threadId: id, groupSlug: entry.post.groupSlug })
      .then((res) => {
        if (res?.summary) setPostSummaries((prev) => ({ ...prev, [id]: res.summary }));
      })
      .finally(() => {
        setSummarizing((prev) => ({ ...prev, [id]: false }));
      });
  }, [entryForThread]);

  const updatePost = useCallback((id: string, input: { title?: string; body?: string }) => {
    const previous = entryForThread(id)?.post;
    setGroupDetails((prev) => updateThreadInGroupDetails(prev, id, input));
    setNewPosts((prev) => prev.map((entry) => entry.post.id === id ? { ...entry, post: { ...entry.post, ...input } } : entry));
    void updateForumThread(id, input).catch(() => {
      if (!previous) return;
      setGroupDetails((prev) => updateThreadInGroupDetails(prev, id, previous));
      setNewPosts((prev) => prev.map((entry) => entry.post.id === id ? { ...entry, post: previous } : entry));
    });
  }, [entryForThread]);

  const deletePost = useCallback((id: string) => {
    const previous = entryForThread(id);
    setThreadId(null);
    setGroupDetails((prev) => removeThreadFromGroupDetails(prev, id));
    setNewPosts((prev) => prev.filter((entry) => entry.post.id !== id));
    void deleteForumThread(id).catch(() => {
      if (!previous) return;
      setGroupDetails((prev) => appendThreadToGroupDetails(prev, previous));
      setNewPosts((prev) => previous.groupId === groupId ? [previous, ...prev] : prev);
    });
  }, [entryForThread, groupId]);

  const changePostStatus = useCallback((id: string, status: 'open' | 'answered' | 'closed') => {
    const lifecycle = status === 'answered' ? 'resolved' : status;
    setGroupDetails((prev) => updateThreadInGroupDetails(prev, id, { lifecycle, state: status === 'open' ? undefined : status[0].toUpperCase() + status.slice(1) }));
    void updateForumThreadStatus(id, { status }).catch(() => loadGroupDetail(groupId ?? ''));
  }, [groupId, loadGroupDetail]);

  const selectTab = useCallback((next: TabId) => {
    setTab(next);
    // The profile sits over a tab, so any tab press returns to that tab.
    setProfileOpen(false);
    if (next === 'groups') setThreadId(null);
    // Tapping a tab returns to its root, so Home lands on Home and not News.
    if (next === 'home') setNewsOpen(false);
    if (next === 'directory') setDirectoryRequest(null);
    if (next === 'more') {
      setMoreView('root');
      setResourcesNewsOpen(false);
      setUpdateRequest((current) => ({ selection: null, n: current.n + 1 }));
    }
  }, []);

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
          <View style={styles.screen}>
            {tab === 'home' && (
              <DataGate
                loading={meQuery.loading || groupsQuery.loading || libraryQuery.loading}
                error={meQuery.error ?? groupsQuery.error ?? libraryQuery.error}
                onRetry={() => {
                  meQuery.refetch();
                  groupsQuery.refetch();
                  libraryQuery.refetch();
                }}
              >
                {newsOpen ? (
                  <NewsScreen
                    stories={dashboardNews}
                    onBack={() => setNewsOpen(false)}
                    onOpen={openStory}
                  />
                ) : (
                  <HomeScreen
                    member={member}
                    actions={HOME_ACTIONS}
                    annualMeeting={{
                      title: ANNUAL_MEETING.title,
                      dateLabel: ANNUAL_MEETING.dateLabel,
                      location: ANNUAL_MEETING.location,
                      status: ANNUAL_MEETING.registrationOpen ? 'Registration open' : 'Member meeting',
                    }}
                    events={previewEvents.filter((event) => event.status === 'upcoming')}
                    groups={myGroups}
                    news={dashboardNews}
                    showBadges={SHOW_BADGES}
                    onOpenAction={(action) => {
                      if (action.kind === 'annual-meeting') {
                        setMoreView('annual-meeting');
                      } else {
                        setUpdateRequest((current) => ({
                          selection: {
                            kind: action.kind === 'survey' ? 'survey' : 'announcement',
                            id: action.id,
                          },
                          n: current.n + 1,
                        }));
                        setMoreView('updates');
                      }
                      setTab('more');
                    }}
                    onOpenAnnualMeeting={() => {
                      setMoreView('annual-meeting');
                      setTab('more');
                    }}
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
                    onPickGroup={pickGroup}
                    onOpenNewsStory={openStory}
                  />
                )}
              </DataGate>
            )}
            {tab === 'more' && moreView === 'events' && (
              <EventsScreen
                key={eventRequest ? `event-${eventRequest.id}-${eventRequest.n}` : 'events-root'}
                events={previewEvents}
                initialEventId={eventRequest?.id ?? null}
                onBack={() => setMoreView('root')}
                onRsvp={(id, choice) => {
                  setPreviewRsvps((current) => ({ ...current, [id]: choice }));
                }}
              />
            )}
            {tab === 'more' && moreView === 'root' && (
              <MoreScreen
                member={member}
                annualMeetingEnabled
                annualMeetingStatus={`${ANNUAL_MEETING.dateLabel} · ${ANNUAL_MEETING.registrationStatus}`}
                updateCount={MOBILE_ANNOUNCEMENTS.filter((item) => item.unread).length + MOBILE_SURVEYS.filter((item) => item.status !== 'submitted').length}
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
                    n: (current?.n ?? 0) + 1,
                  }));
                  setResourcesNewsOpen(false);
                  setMoreView('resources');
                }}
                onOpenProfile={openProfile}
              />
            )}
            {tab === 'more' && moreView === 'annual-meeting' && (
              <AnnualMeetingScreen meeting={ANNUAL_MEETING} onBack={() => setMoreView('root')} />
            )}
            {tab === 'more' && moreView === 'updates' && (
              <UpdatesScreen
                key={`updates-${updateRequest.n}`}
                announcements={MOBILE_ANNOUNCEMENTS}
                surveys={MOBILE_SURVEYS}
                initialSelection={updateRequest.selection}
                onBack={() => setMoreView('root')}
              />
            )}
            {tab === 'ask' && <AskScreen />}
            {tab === 'more' && moreView === 'resources' && (
              <DataGate
                loading={
                  meQuery.loading ||
                  libraryQuery.loading ||
                  podcastQuery.loading ||
                  jobsQuery.loading
                }
                error={
                  meQuery.error ??
                  libraryQuery.error ??
                  podcastQuery.error ??
                  jobsQuery.error
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
                    // Remounts on a request from another screen, so it opens on
                    // that episode or posting rather than the hub.
                    key={
                      resourcesRequest
                        ? `${resourcesRequest.kind}-${resourcesRequest.id}-${resourcesRequest.n}`
                        : 'resources'
                    }
                    member={member}
                    onBack={() => setMoreView('root')}
                    resources={libraryQuery.data?.resources ?? []}
                    episodes={podcastQuery.data ?? []}
                    jobs={jobsQuery.data ?? []}
                    news={libraryQuery.data?.newsRadar ?? []}
                    initialView={
                      resourcesRequest?.kind === 'episode'
                        ? 'podcasts'
                        : resourcesRequest?.kind === 'job' || resourcesRequest?.kind === 'job-board'
                          ? 'jobs'
                          : 'hub'
                    }
                    initialEpisodeSlug={
                      resourcesRequest?.kind === 'episode' ? resourcesRequest.id : null
                    }
                    initialJobId={resourcesRequest?.kind === 'job' ? resourcesRequest.id : null}
                    onOpenResource={openResource}
                    onOpenTranscript={(e) =>
                      e.transcriptUrl && void Linking.openURL(e.transcriptUrl)
                    }
                    onApplyToJob={(j) => j.applyUrl && void Linking.openURL(j.applyUrl)}
                    onGoNews={() => setResourcesNewsOpen(true)}
                  />
                )}
              </DataGate>
            )}
            {tab === 'groups' && (
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
                selectedGroupCoLeads={selectedGroupDetail?.coLeads ?? []}
                selectedGroupMembers={selectedGroupDetail?.members ?? []}
                resources={selectedGroupDetail?.resources ?? []}
                onLoadMoreGroupFeed={loadMoreGroupFeed}
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
            )}
            {tab === 'directory' && (
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
                  onOpenJob={(job) => openInResources('job', job.id)}
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
            )}

            {/* Over the tab rather than in place of it, so the tab underneath
                keeps its scroll position while the profile is open. */}
            {profileOpen && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: t.surfacePage }]}>
                <DataGate
                  loading={meQuery.loading || repostsQuery.loading || orgsQuery.loading}
                  error={meQuery.error ?? repostsQuery.error ?? orgsQuery.error}
                  onRetry={() => {
                    meQuery.refetch();
                    repostsQuery.refetch();
                    orgsQuery.refetch();
                  }}
                >
                  <MemberProfileScreen
                    member={member}
                    reposts={repostsQuery.data ?? []}
                    workingGroups={groups.filter((g) => subscribed[g.id] ?? g.joined).length}
                    org={memberOrg}
                    onBack={() => setProfileOpen(false)}
                    onOpenRepost={openRepost}
                    onOpenOrg={openOrgInDirectory}
                  />
                </DataGate>
              </View>
            )}
          </View>
          <PodcastNowPlayingBar onOpenEpisode={(slug) => openInResources('episode', slug)} />
          <PortalTabBar
            tab={tab}
            onSelect={selectTab}
            showBadges={SHOW_BADGES}
            badges={{
              groups: myGroups.reduce((total, group) => total + group.unread, 0),
              more:
                MOBILE_ANNOUNCEMENTS.filter((item) => item.unread).length +
                MOBILE_SURVEYS.filter((item) => item.status !== 'submitted').length,
            }}
          />
          {profileSheetOpen && !!meQuery.data && (
            <MemberSheet
              member={meQuery.data}
              repostCount={(repostsQuery.data ?? []).length}
              onClose={() => setProfileSheetOpen(false)}
              onOpenProfile={openProfile}
              onSignOut={signOutForTesting}
            />
          )}
          {notificationsOpen && (
            <NotificationsSheet
              notifications={notifications}
              loading={notificationsQuery.loading || notificationsQuery.refreshing}
              error={notificationsQuery.error}
              pendingIds={Object.keys(pendingNotifications)}
              onMarkAllRead={markAllNotificationsRead}
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blank: { backgroundColor: '#f7fafb' },
  screen: { flex: 1, minHeight: 0 },
});
