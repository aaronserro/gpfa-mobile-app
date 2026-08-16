import { useCallback, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
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

import PortalTabBar, { type TabId } from './src/components/PortalTabBar';
import PostComposer from './src/components/PostComposer';
import PodcastNowPlayingBar from './src/components/podcast/PodcastNowPlayingBar';
import { PodcastPlayerProvider } from './src/components/podcast/PlayerProvider';
import { ThemeProvider, useTheme } from './src/ds/ThemeProvider';
import AskScreen from './src/screens/AskScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import HomeScreen from './src/screens/HomeScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import SignInScreen from './src/screens/SignInScreen';
import {
  castVote,
  createPost as createPostRequest,
  createReply,
  getDirectoryPeople,
  getFeed,
  getGroups,
  getJobs,
  getMemberOrgs,
  getLibrary,
  getMe,
  getNews,
  getNextEvent,
  getPodcasts,
  setReplyUpvote,
  setRsvp as setRsvpRequest,
  setSaved as setSavedRequest,
  setSubscribed as setSubscribedRequest,
  setUpvote,
} from './src/api/portal';
import { useQuery } from './src/api/useQuery';
import type { FeedEntry, Member, NewPostInput, Reply, RsvpChoice, Thread } from './src/api/types';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import DataGate from './src/components/DataGate';

// The design exposes these as editor props on the component.
const DEFAULT_TAB: TabId = 'home';
const DARK_MODE = false;
const SHOW_BADGES = true;

function Portal() {
  const { t, isDark } = useTheme();

  const { isSignedIn, status, signOut } = useAuth();
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB);
  // The Groups tab is a directory; this is the group whose page is open.
  const [groupId, setGroupId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  // Replies the member posts are kept outside the static data, keyed by thread.
  const [extraReplies, setExtraReplies] = useState<Record<string, Reply[] | undefined>>({});
  const [votes, setVotes] = useState<Record<string, number | undefined>>({});
  const [upvoted, setUpvoted] = useState<Record<string, boolean | undefined>>({});
  const [replyUpvoted, setReplyUpvoted] = useState<Record<string, boolean | undefined>>({});
  const [saved, setSaved] = useState<Record<string, boolean | undefined>>({});
  // Overrides on each group's own `joined`; absent means unchanged this session.
  const [subscribed, setSubscribed] = useState<Record<string, boolean | undefined>>({});
  const [rsvps, setRsvps] = useState<Record<string, RsvpChoice | undefined>>({});
  // Posts composed this session, newest first. Kept out of the static data.
  const [newPosts, setNewPosts] = useState<FeedEntry[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);

  // Portal data. Resolves from fixtures until EXPO_PUBLIC_API_URL is set.
  const meQuery = useQuery(getMe, []);
  const eventQuery = useQuery(getNextEvent, []);
  const groupsQuery = useQuery(getGroups, []);
  const feedQuery = useQuery(getFeed, []);
  const newsQuery = useQuery(getNews, []);
  const libraryQuery = useQuery(getLibrary, []);
  const podcastQuery = useQuery(getPodcasts, []);
  const jobsQuery = useQuery(getJobs, []);
  const orgsQuery = useQuery(getMemberOrgs, []);
  const directoryPeopleQuery = useQuery(getDirectoryPeople, []);

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
    setTab('resources');
  }, []);

  // DataGate blocks these screens until the member resolves, so the fallback
  // only exists to satisfy the type before the first response lands.
  const member: Member = meQuery.data ?? { id: '', name: '', firstName: '', org: '' };
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const posts = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);

  // Tapping a group on Home opens that group's page.
  const pickGroup = useCallback((id: string) => {
    setGroupId(id);
    setThreadId(null);
    setTab('groups');
  }, []);

  // Mutations apply optimistically, then reconcile with the server. Against
  // fixtures the requests resolve as no-ops, so behaviour is identical.
  const addReply = useCallback((id: string, reply: Reply) => {
    setExtraReplies((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), reply] }));
    void createReply(id, reply.text).catch(() => {
      setExtraReplies((prev) => ({
        ...prev,
        [id]: (prev[id] ?? []).filter((r) => r !== reply),
      }));
    });
  }, []);

  // One vote per organization — the first choice sticks.
  const vote = useCallback((id: string, option: number) => {
    let cast = false;
    setVotes((prev) => {
      if (prev[id] !== undefined) return prev;
      cast = true;
      return { ...prev, [id]: option };
    });
    if (cast) {
      void castVote(id, option).catch(() => {
        setVotes((prev) => ({ ...prev, [id]: undefined }));
      });
    }
  }, []);

  const toggleUpvote = useCallback((id: string) => {
    setUpvoted((prev) => {
      const next = !prev[id];
      void setUpvote(id, next).catch(() => {
        setUpvoted((current) => ({ ...current, [id]: !next }));
      });
      return { ...prev, [id]: next };
    });
  }, []);

  const toggleReplyUpvote = useCallback(
    (postId: string, key: string, replyId: string | undefined) => {
      setReplyUpvoted((prev) => {
        const next = !prev[key];
        // A reply with no id has nowhere to send this; the repository resolves
        // it as a no-op and the toggle stays on the device.
        void setReplyUpvote(postId, replyId, next).catch(() => {
          setReplyUpvoted((current) => ({ ...current, [key]: !next }));
        });
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = !prev[id];
      void setSavedRequest(id, next).catch(() => {
        setSaved((current) => ({ ...current, [id]: !next }));
      });
      return { ...prev, [id]: next };
    });
  }, []);

  const toggleSubscribe = useCallback(
    (id: string) => {
      const current = subscribed[id] ?? groups.find((g) => g.id === id)?.joined ?? false;
      const next = !current;
      setSubscribed((prev) => ({ ...prev, [id]: next }));
      void setSubscribedRequest(id, next).catch(() => {
        setSubscribed((prev) => ({ ...prev, [id]: current }));
      });
    },
    [groups, subscribed]
  );

  const setRsvp = useCallback((id: string, choice: RsvpChoice) => {
    setRsvps((prev) => {
      const previous = prev[id];
      void setRsvpRequest(id, choice).catch(() => {
        setRsvps((current) => ({ ...current, [id]: previous }));
      });
      return { ...prev, [id]: choice };
    });
  }, []);

  const createPost = useCallback(
    (draft: NewPostInput, member: Member) => {
    const post: Thread = {
      id: `new-${Date.now()}`,
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
      })
      .catch(() => {
        setNewPosts((prev) => prev.filter((e) => e !== entry));
      });
    },
    []
  );

  const selectTab = useCallback((next: TabId) => {
    setTab(next);
    if (next === 'groups') setThreadId(null);
  }, []);

  // `statusDark` in the design: light status-bar glyphs over the anchor surface.
  // The directory index has one too; its profile is paper and overrides this
  // from inside, since the tab alone can't tell the two apart.
  const lightStatusBar = isDark || !isSignedIn || tab === 'home' || tab === 'directory';

  return (
    <View style={[styles.root, { backgroundColor: t.surfacePage }]}>
      <StatusBar style={lightStatusBar ? 'light' : 'dark'} />

      {status === 'restoring' ? (
        <View style={styles.blank} />
      ) : !isSignedIn ? (
        <SignInScreen onSignedIn={() => setTab('home')} />
      ) : (
        <>
          <View style={styles.screen}>
            {tab === 'home' && (
              <DataGate
                loading={meQuery.loading || groupsQuery.loading || newsQuery.loading}
                error={meQuery.error ?? groupsQuery.error ?? newsQuery.error}
                onRetry={() => {
                  meQuery.refetch();
                  groupsQuery.refetch();
                  newsQuery.refetch();
                }}
              >
                <HomeScreen
                  member={member}
                  event={eventQuery.data ?? null}
                  groups={groups}
                  news={newsQuery.data ?? []}
                  showBadges={SHOW_BADGES}
                  onGoAsk={() => setTab('ask')}
                  onGoGroups={() => selectTab('groups')}
                  onPickGroup={pickGroup}
                />
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
                  meQuery.error ?? libraryQuery.error ?? podcastQuery.error ?? jobsQuery.error
                }
                onRetry={() => {
                  meQuery.refetch();
                  libraryQuery.refetch();
                  podcastQuery.refetch();
                  jobsQuery.refetch();
                }}
              >
                <ResourcesScreen
                  // Remounts on a request from another screen, so it opens on
                  // that episode or posting rather than the hub.
                  key={
                    resourcesRequest
                      ? `${resourcesRequest.kind}-${resourcesRequest.id}-${resourcesRequest.n}`
                      : 'resources'
                  }
                  member={member}
                  resources={libraryQuery.data ?? []}
                  episodes={podcastQuery.data ?? []}
                  jobs={jobsQuery.data ?? []}
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
                  onOpenResource={(r) => r.href && void Linking.openURL(r.href)}
                  onOpenTranscript={(e) => e.transcriptUrl && void Linking.openURL(e.transcriptUrl)}
                  onApplyToJob={(j) => j.applyUrl && void Linking.openURL(j.applyUrl)}
                />
              </DataGate>
            )}
            {tab === 'groups' && (
              <DataGate
                loading={meQuery.loading || groupsQuery.loading || feedQuery.loading}
                error={meQuery.error ?? groupsQuery.error ?? feedQuery.error}
                onRetry={() => {
                  meQuery.refetch();
                  groupsQuery.refetch();
                  feedQuery.refetch();
                }}
              >
              <GroupsScreen
                member={member}
                groups={groups}
                posts={posts}
                newPosts={newPosts}
                groupId={groupId}
                onOpenGroup={setGroupId}
                onCloseGroup={() => setGroupId(null)}
                threadId={threadId}
                onOpenThread={setThreadId}
                onCloseThread={() => setThreadId(null)}
                extraReplies={extraReplies}
                onReply={addReply}
                votes={votes}
                onVote={vote}
                upvoted={upvoted}
                onToggleUpvote={toggleUpvote}
                replyUpvoted={replyUpvoted}
                onToggleReplyUpvote={toggleReplyUpvote}
                saved={saved}
                onToggleSave={toggleSave}
                subscribed={subscribed}
                onToggleSubscribe={toggleSubscribe}
                rsvps={rsvps}
                onRsvp={setRsvp}
                onCompose={() => setComposerOpen(true)}
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
                  orgs={orgsQuery.data ?? []}
                  people={directoryPeopleQuery.data ?? []}
                  jobs={jobsQuery.data ?? []}
                  onOpenJob={(job) => openInResources('job', job.id)}
                />
              </DataGate>
            )}
          </View>
          <PodcastNowPlayingBar onOpenEpisode={(slug) => openInResources('episode', slug)} />
          <PortalTabBar tab={tab} onSelect={selectTab} showBadges={SHOW_BADGES} />
          {composerOpen && (
            <PostComposer
              groups={groups}
              // The composer opens from inside a group, so that group is the default.
              initialGroupId={groupId ?? groups[0]?.id ?? ''}
              onClose={() => setComposerOpen(false)}
              onCreate={(draft) => createPost(draft, member)}
            />
          )}
        </>
      )}
    </View>
  );
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
