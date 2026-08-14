import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { ThemeProvider, useTheme } from './src/ds/ThemeProvider';
import AskScreen from './src/screens/AskScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import HomeScreen from './src/screens/HomeScreen';
import SignInScreen from './src/screens/SignInScreen';
import {
  castVote,
  createPost as createPostRequest,
  createReply,
  getFeed,
  getGroups,
  getNews,
  setRsvp as setRsvpRequest,
  setUpvote,
} from './src/api/portal';
import { useQuery } from './src/api/useQuery';
import type { FeedEntry, NewPostInput, Reply, RsvpChoice, Thread } from './src/api/types';
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
  // The Groups tab is a cross-group feed; this is the set of groups it shows.
  // Empty until the groups load, then defaulted to all of them.
  const [feedGroupIds, setFeedGroupIds] = useState<string[] | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  // Replies the member posts are kept outside the static data, keyed by thread.
  const [extraReplies, setExtraReplies] = useState<Record<string, Reply[] | undefined>>({});
  const [votes, setVotes] = useState<Record<string, number | undefined>>({});
  const [upvoted, setUpvoted] = useState<Record<string, boolean | undefined>>({});
  const [rsvps, setRsvps] = useState<Record<string, RsvpChoice | undefined>>({});
  // Posts composed this session, newest first. Kept out of the static data.
  const [newPosts, setNewPosts] = useState<FeedEntry[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);

  // Portal data. Resolves from fixtures until EXPO_PUBLIC_API_URL is set.
  const groupsQuery = useQuery(getGroups, []);
  const feedQuery = useQuery(getFeed, []);
  const newsQuery = useQuery(getNews, []);

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const posts = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);

  // Default the feed to every group once they arrive.
  const visibleGroupIds = feedGroupIds ?? groups.map((g) => g.id);

  // Tapping a group on Home narrows the feed to just that group.
  const pickGroup = useCallback((id: string) => {
    setFeedGroupIds([id]);
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

  const setRsvp = useCallback((id: string, choice: RsvpChoice) => {
    setRsvps((prev) => {
      const previous = prev[id];
      void setRsvpRequest(id, choice).catch(() => {
        setRsvps((current) => ({ ...current, [id]: previous }));
      });
      return { ...prev, [id]: choice };
    });
  }, []);

  const createPost = useCallback((draft: NewPostInput) => {
    const post: Thread = {
      id: `new-${Date.now()}`,
      type: draft.type,
      title: draft.title,
      author: 'Robert Goobie',
      initials: 'RG',
      org: 'HOOPP',
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
  }, []);

  const selectTab = useCallback((next: TabId) => {
    setTab(next);
    if (next === 'groups') setThreadId(null);
  }, []);

  // `statusDark` in the design: light status-bar glyphs over the anchor surface.
  const lightStatusBar = isDark || !isSignedIn || tab === 'home';

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
                loading={groupsQuery.loading || newsQuery.loading}
                error={groupsQuery.error ?? newsQuery.error}
                onRetry={() => {
                  groupsQuery.refetch();
                  newsQuery.refetch();
                }}
              >
                <HomeScreen
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
            {tab === 'groups' && (
              <DataGate
                loading={groupsQuery.loading || feedQuery.loading}
                error={groupsQuery.error ?? feedQuery.error}
                onRetry={() => {
                  groupsQuery.refetch();
                  feedQuery.refetch();
                }}
              >
              <GroupsScreen
                groups={groups}
                posts={posts}
                groupIds={visibleGroupIds}
                onSetGroupIds={setFeedGroupIds}
                threadId={threadId}
                onOpenThread={setThreadId}
                onCloseThread={() => setThreadId(null)}
                extraReplies={extraReplies}
                onReply={addReply}
                votes={votes}
                onVote={vote}
                upvoted={upvoted}
                onToggleUpvote={toggleUpvote}
                rsvps={rsvps}
                onRsvp={setRsvp}
                newPosts={newPosts}
                onCompose={() => setComposerOpen(true)}
              />
              </DataGate>
            )}
          </View>
          <PortalTabBar tab={tab} onSelect={selectTab} showBadges={SHOW_BADGES} />
          {composerOpen && (
            <PostComposer
              groups={groups}
              initialGroupId={visibleGroupIds[0] ?? groups[0]?.id ?? ''}
              onClose={() => setComposerOpen(false)}
              onCreate={createPost}
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
          <Portal />
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
