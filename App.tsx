import { useCallback, useState } from 'react';
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
import { ThemeProvider, useTheme } from './src/ds/ThemeProvider';
import AskScreen from './src/screens/AskScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import HomeScreen from './src/screens/HomeScreen';
import SignInScreen from './src/screens/SignInScreen';
import type { Reply } from './src/data/portal';

// The design exposes these as editor props on the component.
const START_SIGNED_IN = false;
const DEFAULT_TAB: TabId = 'home';
const DARK_MODE = false;
const SHOW_BADGES = true;

function Portal() {
  const { t, isDark } = useTheme();

  const [signedIn, setSignedIn] = useState(START_SIGNED_IN);
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB);
  const [groupIndex, setGroupIndex] = useState(0);
  const [threadId, setThreadId] = useState<string | null>(null);
  // Replies the member posts are kept outside the static data, keyed by thread.
  const [extraReplies, setExtraReplies] = useState<Record<string, Reply[] | undefined>>({});
  const [votes, setVotes] = useState<Record<string, number | undefined>>({});

  const pickGroup = useCallback((i: number) => {
    setGroupIndex(i);
    setThreadId(null);
    setTab('groups');
  }, []);

  const addReply = useCallback((id: string, reply: Reply) => {
    setExtraReplies((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), reply] }));
  }, []);

  // One vote per organization — the first choice sticks.
  const vote = useCallback((id: string, option: number) => {
    setVotes((prev) => (prev[id] === undefined ? { ...prev, [id]: option } : prev));
  }, []);

  const selectTab = useCallback((next: TabId) => {
    setTab(next);
    if (next === 'groups') setThreadId(null);
  }, []);

  // `statusDark` in the design: light status-bar glyphs over the anchor surface.
  const lightStatusBar = isDark || !signedIn || tab === 'home';

  return (
    <View style={[styles.root, { backgroundColor: t.surfacePage }]}>
      <StatusBar style={lightStatusBar ? 'light' : 'dark'} />

      {!signedIn ? (
        <SignInScreen
          onSignIn={() => {
            setSignedIn(true);
            setTab('home');
          }}
        />
      ) : (
        <>
          <View style={styles.screen}>
            {tab === 'home' && (
              <HomeScreen
                showBadges={SHOW_BADGES}
                onGoAsk={() => setTab('ask')}
                onGoGroups={() => selectTab('groups')}
                onPickGroup={pickGroup}
              />
            )}
            {tab === 'ask' && <AskScreen />}
            {tab === 'groups' && (
              <GroupsScreen
                groupIndex={groupIndex}
                onPickGroup={(i: number) => {
                  setGroupIndex(i);
                  setThreadId(null);
                }}
                threadId={threadId}
                onOpenThread={setThreadId}
                onCloseThread={() => setThreadId(null)}
                extraReplies={extraReplies}
                onReply={addReply}
                votes={votes}
                onVote={vote}
              />
            )}
          </View>
          <PortalTabBar tab={tab} onSelect={selectTab} showBadges={SHOW_BADGES} />
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
        <Portal />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blank: { backgroundColor: '#f7fafb' },
  screen: { flex: 1, minHeight: 0 },
});
