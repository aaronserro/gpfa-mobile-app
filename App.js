import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import ComposeSheet from './src/components/ComposeSheet';
import MoreSheet from './src/components/MoreSheet';
import TabBar from './src/components/TabBar';
import { FadeIn } from './src/components/common';
import { initialGroups, initialThreads } from './src/data';
import { colors } from './src/theme';

import Announcements from './src/screens/Announcements';
import Ask from './src/screens/Ask';
import Directory from './src/screens/Directory';
import GroupThreads from './src/screens/GroupThreads';
import Groups from './src/screens/Groups';
import Home from './src/screens/Home';
import News from './src/screens/News';
import Profile from './src/screens/Profile';
import SignIn from './src/screens/SignIn';
import Thread from './src/screens/Thread';

const NOTIF_COUNT = 2;

export default function App() {
  const [screen, setScreen] = useState('signin');
  const [groups, setGroups] = useState(initialGroups);
  const [threads, setThreads] = useState(initialThreads);
  const [groupFilter, setGroupFilter] = useState('All');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  const group = groups.find((g) => g.id === selectedGroup) || null;
  const thread = threads.find((t) => t.id === selectedThread) || null;
  const groupThreads = threads.filter((t) => t.group === selectedGroup);

  const go = (next) => {
    setShowMore(false);
    setScreen(next);
  };

  const openThread = (t) => {
    setSelectedGroup(t.group);
    setSelectedThread(t.id);
    go('thread');
  };

  const toggleSub = (id) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, subscribed: !g.subscribed } : g)));

  const postReply = (text) =>
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThread
          ? { ...t, posts: [...t.posts, { author: 'Aaron Serro', time: 'now', text }] }
          : t
      )
    );

  const createThread = (title, tags) => {
    if (!group) return;
    setThreads((prev) => [
      {
        id: `new${Date.now()}`,
        group: group.id,
        title,
        author: 'Aaron Serro',
        time: 'now',
        tags: tags.length ? tags : ['#discussion'],
        posts: [{ author: 'Aaron Serro', time: 'now', text: 'Opening this thread for the group — replies welcome.' }],
      },
      ...prev,
    ]);
    setShowCompose(false);
  };

  const onTab = (key) => {
    if (key === 'more') {
      setShowMore((v) => !v);
      return;
    }
    go(key);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'signin':
        return <SignIn onContinue={() => go('home')} />;
      case 'home':
        return (
          <Home
            threads={threads}
            notifCount={NOTIF_COUNT}
            onOpenThread={openThread}
            onGoGroups={() => go('groups')}
            onGoNews={() => go('news')}
            onGoProfile={() => go('profile')}
          />
        );
      case 'groups':
        return (
          <Groups
            groups={groups}
            threads={threads}
            filter={groupFilter}
            onFilter={setGroupFilter}
            onToggleSub={toggleSub}
            onOpenGroup={(id) => {
              setSelectedGroup(id);
              go('group');
            }}
          />
        );
      case 'group':
        return (
          <GroupThreads
            group={group}
            threads={groupThreads}
            onBack={() => go('groups')}
            onOpenThread={openThread}
            onCompose={() => setShowCompose(true)}
          />
        );
      case 'thread':
        return (
          <Thread
            thread={thread}
            groupName={group ? group.name : 'Back'}
            onBack={() => go('group')}
            onReply={postReply}
          />
        );
      case 'directory':
        return <Directory />;
      case 'ask':
        return <Ask />;
      case 'news':
        return <News />;
      case 'announcements':
        return <Announcements />;
      case 'profile':
        return <Profile onSignOut={() => go('signin')} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Keyed so every screen change replays the design's `screenIn` entrance. */}
      <FadeIn key={screen} offset={14} duration={380} style={styles.screen}>
        {renderScreen()}
      </FadeIn>

      {screen !== 'signin' && <TabBar screen={screen} showMore={showMore} onSelect={onTab} />}

      {showMore && <MoreSheet onClose={() => setShowMore(false)} onNavigate={go} />}
      {showCompose && <ComposeSheet onClose={() => setShowCompose(false)} onCreate={createThread} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screen: {
    flex: 1,
  },
});
