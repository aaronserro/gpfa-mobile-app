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
import DirectoryScreen from './src/screens/DirectoryScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import HomeScreen from './src/screens/HomeScreen';
import MemberProfileScreen from './src/screens/MemberProfileScreen';
import NewsScreen from './src/screens/NewsScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import SignInScreen from './src/screens/SignInScreen';
import {
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
  getNextEvent,
  getNotifications,
  getPodcasts,
  getSavedResources,
  getWorkingGroupCoLeadMembers,
  getWorkingGroupDirectoryMembers,
  getWorkingGroupResources,
  getWorkingGroupTagUsage,
  getWorkingGroupThreadFeed,
  getWorkingGroupMembership,
  getWorkingGroupFeedItemDetail,
  markNotificationsRead,
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
  FeedEntry,
  ForumAttachment,
  GroupMember,
  LibraryResource,
  Member,
  MemberNotification,
  MemberOrg,
  MemberRepost,
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

function Portal() {
  const { t } = useTheme();

  const { isSignedIn, status, signOut } = useAuth();
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB);
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

  // Portal data. Member-scoped ready routes wait for sign-in; the rest can stay
  // fixture-backed while EXPO_PUBLIC_FIXTURE_PORTAL_DATA is true.
  const meQuery = useQuery(
    () => (isSignedIn ? getMe() : Promise.resolve(null)),
    [isSignedIn]
  );
  const eventQuery = useQuery(getNextEvent, []);
  const groupsQuery = useQuery(() => (isSignedIn ? getGroups() : Promise.resolve([])), [isSignedIn]);
  const feedQuery = useQuery(getFeed, []);
  const libraryQuery = useQuery(
    () => (isSignedIn ? getLibrary() : Promise.resolve({ resources: [], newsRadar: [] })),
    [isSignedIn]
  );
  const podcastQuery = useQuery(getPodcasts, []);
  const jobsQuery = useQuery(getJobs, []);
  const orgsQuery = useQuery(getMemberOrgs, []);
  const directoryPeopleQuery = useQuery(getDirectoryPeople, []);
  const savedQuery = useQuery(getSavedResources, []);
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

  useEffect(() => {
    setLocalNotifications(notificationsQuery.data ?? []);
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (!isSignedIn) setLocalNotifications([]);
  }, [isSignedIn]);

  // What another screen asked Resources to open: an episode from the
  // now-playing bar, or a posting from an organization's directory profile.
  // `n` counts the requests so asking for the same one twice still remounts the
  // screen — the id alone would leave the key unchanged. One slot, not two, so
  // a later request always supersedes the earlier one.
  const [resourcesRequest, setResourcesRequest] = useState<
    { kind: 'episode'; id: string; n: number } | { kind: 'job'; id: string; n: number } | null
  >(null);

  const openInResources = useCallback((kind: 'episode' | 'job', id: string) => {
    setResourcesRequest((prev) => ({ kind, id, n: (prev?.n ?? 0) + 1 }));
    setResourcesNewsOpen(false);
    setTab('resources');
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

  const signOutForTesting = useCallback(() => {
    setProfileSheetOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setTab('home');
    signOut();
  }, [signOut]);

  const openStory = useCallback((story: NewsStory) => {
    if (story.url) void Linking.openURL(story.url);
  }, []);

  // DataGate blocks these screens until the member resolves, so the fallback
  // only exists to satisfy the type before the first response lands.
  const member: Member = meQuery.data ?? { id: '', name: '', firstName: '', org: '' };
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const myGroups = useMemo(
    () => groups.filter((group) => subscribed[group.id] ?? group.joined),
    [groups, subscribed]
  );
  const posts = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const dashboardNews = libraryQuery.data?.newsRadar ?? [];
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
    if (next === 'resources') setResourcesNewsOpen(false);
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
                    event={eventQuery.data ?? null}
                    groups={myGroups}
                    news={dashboardNews}
                    showBadges={SHOW_BADGES}
                    onGoNews={() => setNewsOpen(true)}
                    onGoGroups={() => selectTab('groups')}
                    onPickGroup={pickGroup}
                    onOpenNewsStory={openStory}
                  />
                )}
              </DataGate>
            )}
            {tab === 'ask' && <AskScreen />}
            {tab === 'resources' && (
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
                    resources={libraryQuery.data?.resources ?? []}
                    episodes={podcastQuery.data ?? []}
                    jobs={jobsQuery.data ?? []}
                    news={libraryQuery.data?.newsRadar ?? []}
                    initialView={
                      resourcesRequest?.kind === 'episode'
                        ? 'podcasts'
                        : resourcesRequest?.kind === 'job'
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
                  initialOrgId={directoryRequest?.orgId ?? null}
                  onOpenJob={(job) => openInResources('job', job.id)}
                />
              </DataGate>
            )}

            {/* Over the tab rather than in place of it, so the tab underneath
                keeps its scroll position while the profile is open. */}
            {profileOpen && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: t.surfacePage }]}>
                <DataGate
                  loading={meQuery.loading || savedQuery.loading || repostsQuery.loading || orgsQuery.loading}
                  error={meQuery.error ?? savedQuery.error ?? repostsQuery.error ?? orgsQuery.error}
                  onRetry={() => {
                    meQuery.refetch();
                    savedQuery.refetch();
                    repostsQuery.refetch();
                    orgsQuery.refetch();
                  }}
                >
                  <MemberProfileScreen
                    member={member}
                    saved={savedQuery.data ?? []}
                    reposts={repostsQuery.data ?? []}
                    workingGroups={groups.filter((g) => subscribed[g.id] ?? g.joined).length}
                    org={memberOrg}
                    onBack={() => setProfileOpen(false)}
                    onOpenResource={openResource}
                    onOpenRepost={openRepost}
                    onOpenOrg={openOrgInDirectory}
                  />
                </DataGate>
              </View>
            )}
          </View>
          <PodcastNowPlayingBar onOpenEpisode={(slug) => openInResources('episode', slug)} />
          <PortalTabBar tab={tab} onSelect={selectTab} showBadges={SHOW_BADGES} />
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
