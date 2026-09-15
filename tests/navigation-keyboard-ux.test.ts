import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = join(import.meta.dirname, '..');

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

test('startup landing screen uses a paced logo reveal and staggered peer tagline', () => {
  const app = source('App.tsx');
  const splash = source('src/screens/SplashScreen.tsx');

  assert.match(app, /const SPLASH_MINIMUM_MS = 4000/);
  assert.match(splash, /duration: 1500,[\s\S]*?logoReveal/);
  assert.match(splash, /duration: 1900,[\s\S]*?arcSweep/);
  assert.match(splash, /styles\.logoArc/);
  assert.match(splash, /function PeerPhrase\(/);
  assert.match(splash, /label="OF PEERS" delay=\{1450\}/);
  assert.match(splash, /label="BY PEERS" delay=\{1750\}/);
  assert.match(splash, /label="FOR PEERS" delay=\{2050\}/);
  assert.match(splash, /color="#4d8ba8" fromX=\{-28\}/);
  assert.match(splash, /color="#4a9e4f" fromX=\{0\}/);
  assert.match(splash, /color="#b8544c" fromX=\{28\}/);
  assert.doesNotMatch(splash, /taglinePill|taglineDot/);
  assert.match(splash, /outputRange: \[0\.88, 1\.06, 1\]/);
});

test('tab-bar selections reset persistent roots and global overlays', () => {
  const app = source('App.tsx');

  assert.match(app, /setTabResetKeys\(\(current\) => \(\{ \.\.\.current, \[next\]: current\[next\] \+ 1 \}\)\)/);
  assert.match(app, /setProfileSheetOpen\(false\)/);
  assert.match(app, /setNotificationsOpen\(false\)/);
  assert.match(app, /setResourceViewer\(null\)/);
  assert.match(app, /setComposerOpen\(false\)/);
  assert.match(app, /setResourceComposerGroupId\(null\)/);
  assert.match(app, /setAskHistoryOpen\(false\)/);

  assert.match(app, /if \(next === 'groups'\) \{\s*setGroupId\(null\);\s*setThreadId\(null\);\s*\}/);
  assert.match(app, /if \(next === 'directory'\) \{\s*setDirectoryRequest\(null\);\s*\}/);
  assert.match(app, /key=\{`home-\$\{tabResetKeys\.home\}`\}/);
  assert.match(app, /key=\{`groups-\$\{tabResetKeys\.groups\}`\}/);
  assert.match(app, /key=\{`ask-\$\{tabResetKeys\.ask\}`\}/);
  assert.match(app, /key=\{`directory-\$\{tabResetKeys\.directory\}`\}/);
  assert.match(app, /key=\{`more-\$\{tabResetKeys\.more\}`\}/);
});

test('non-swipe tab navigation jumps directly to its destination', () => {
  const app = source('App.tsx');

  assert.match(app, /Only an intentional swipe animates between adjacent pages/);
  assert.match(app, /useEffect\(\(\) => \{\s*\/\/ Tab-bar[\s\S]*?tabTranslateX\.setValue\(tabOffset\);/);
});

test('resource submission keeps a large scrollable form and fixed keyboard-aware action footer', () => {
  const composer = source('src/components/groups/ResourceSubmissionComposer.tsx');

  assert.match(composer, /from 'react-native-keyboard-controller'/);
  assert.match(composer, /<KeyboardAvoidingView behavior="padding" style=\{styles\.keyboardAvoider\}>/);
  assert.match(composer, /style=\{styles\.formScroll\}/);
  assert.match(composer, /<View style=\{\[styles\.actions, \{ borderTopColor: t\.rule \}\]\}>/);
  assert.match(composer, /maxHeight: '94%'/);
  assert.match(composer, /formScroll: \{ flexShrink: 1, minHeight: 0 \}/);
  assert.match(composer, /Gesture\.Pan\(\)/);
  assert.match(composer, /event\.translationY >= dismissDistance \|\| event\.velocityY >= 900/);
  assert.match(composer, /<GestureDetector gesture=\{dismissGesture\}>/);
  assert.equal((composer.match(/<X\b/g) ?? []).length, 1, 'only attached files keep a remove X');
});

test('post composer dismisses from the backdrop or a downward swipe without an X button', () => {
  const composer = source('src/components/PostComposer.tsx');

  assert.match(composer, /onPress=\{\(\) => requestClose\(\)\}/);
  assert.match(composer, /Gesture\.Pan\(\)/);
  assert.match(composer, /event\.translationY >= dismissDistance \|\| event\.velocityY >= 900/);
  assert.match(composer, /<GestureDetector gesture=\{dismissGesture\}>/);
  assert.match(composer, /sheet: \{[\s\S]*?height: '90%'/);
  assert.match(composer, /formScroll: \{ flex: 1, minHeight: 0 \}/);
  assert.doesNotMatch(composer, /maxHeight: '90%'/);
  assert.doesNotMatch(composer, /<X\b|\bX, type Icon/);
});

test('resource, podcast, and job details support swipe-down dismissal', () => {
  const resources = source('src/screens/ResourcesScreen.tsx');
  const job = source('src/components/jobs/JobPosting.tsx');

  assert.match(resources, /function Sheet_\(/);
  assert.match(resources, /Gesture\.Pan\(\)/);
  assert.match(resources, /event\.translationY >= dismissDistance \|\| event\.velocityY >= 900/);
  assert.match(resources, /<GestureDetector gesture=\{dismissGesture\}>/);
  assert.match(resources, /Animated\.add\([\s\S]*?dragOffset/);
  assert.doesNotMatch(resources, /<X\b/);
  assert.match(job, /Gesture\.Pan\(\)/);
  assert.match(job, /event\.translationY >= 72 \|\| event\.velocityY >= 900/);
  assert.match(job, /style=\{styles\.dismissHandle\} accessible=\{false\}/);
  assert.doesNotMatch(job, /<X\b/);
});

test('message and Ask composers clear the keyboard and respect safe areas', () => {
  const thread = source('src/components/directory/ConversationThread.tsx');
  const ask = source('src/screens/AskScreen.tsx');

  assert.match(thread, /useSafeAreaInsets/);
  assert.match(thread, /<KeyboardAvoidingView style=\{styles\.fill\} behavior="padding">/);
  assert.match(thread, /paddingBottom: Math\.max\(insets\.bottom, 10\)/);
  assert.doesNotMatch(thread, /keyboardVerticalOffset=\{84\}/);

  assert.match(ask, /paddingBottom: Math\.max\(insets\.bottom, 10\)/);
});

test('dashboard event cards open from their title without a redundant details link', () => {
  const home = source('src/screens/HomeScreen.tsx');

  assert.match(home, /onPress=\{\(\) => onOpenEvent\(event\.id\)\}/);
  assert.doesNotMatch(home, /detailsLink|View details for|>Details<\/Text>/);
});

test('other bottom-input screens remain keyboard and safe-area aware', () => {
  for (const path of [
    'src/components/groups/PostDetail.tsx',
    'src/screens/UpdatesScreen.tsx',
    'src/screens/AnnualMeetingScreen.tsx',
  ]) {
    const screen = source(path);
    assert.match(screen, /KeyboardAvoidingView/, `${path} should avoid the keyboard`);
    assert.match(screen, /paddingBottom: Math\.max\(insets\.bottom, /, `${path} should respect the bottom safe area`);
  }
});

test('notifications support sheet dismissal and swipe-left item dismissal without X controls', () => {
  const sheet = source('src/components/NotificationsSheet.tsx');
  const banner = source('src/components/NotificationArrivalBanner.tsx');

  assert.match(sheet, /useWindowDimensions\(\)/);
  assert.match(sheet, /maxHeight: maxSheetHeight/);
  assert.match(sheet, /maxWidth: 680/);
  assert.match(sheet, /Gesture\.Pan\(\)/);
  assert.match(sheet, /event\.translationY >= dismissDistance \|\| event\.velocityY >= 900/);
  assert.match(sheet, /<GestureDetector gesture=\{dismissGesture\}>/);
  assert.match(sheet, /\.activeOffsetX\(-12\)/);
  assert.match(sheet, /event\.translationX <= -56 \|\| event\.velocityX <= -700/);
  assert.match(sheet, /inputRange: \[-96, -20, 0\][\s\S]*?outputRange: \[1, 0, 0\]/);
  assert.match(sheet, /backgroundColor: t\.brandBrickInk, opacity: actionOpacity/);
  assert.match(sheet, /name: 'markRead', label: 'Mark notification as read'/);
  assert.match(sheet, /name: 'dismiss', label: 'Dismiss notification'/);
  assert.match(sheet, /backgroundColor: notification\.read \? t\.surfacePaper : t\.brandGreenSoft/);
  assert.match(sheet, /borderLeftColor: notification\.read \? t\.rule : t\.brandGreen/);
  assert.match(sheet, />Unread<\/Text>/);
  assert.match(sheet, /swipeContent: \{ width: '100%' \}/);
  assert.doesNotMatch(sheet, /<X\b/);
  assert.match(banner, /maxWidth: 560/);
});

test('primary screens and dense cards reflow across phone and tablet widths', () => {
  const app = source('App.tsx');
  const primitives = source('src/ds/primitives.tsx');
  const directory = source('src/screens/DirectoryScreen.tsx');
  const group = source('src/components/groups/GroupView.tsx');
  const notifications = source('src/components/NotificationsSheet.tsx');
  const resourceViewer = source('src/components/ResourceViewer.tsx');
  const organizationProfile = source('src/components/directory/OrgProfile.tsx');

  assert.match(app, /const pageHorizontalInset = Math\.max\(\(screenWidth - 960\) \/ 2, 0\)/);
  assert.equal((app.match(/paddingHorizontal: pageHorizontalInset/g) ?? []).length, 5);
  assert.match(primitives, /title: \{ flex: 1, minWidth: 0/);
  assert.match(primitives, /minHeight: size/);
  assert.match(directory, /const wideCards = windowWidth >= 700/);
  assert.match(directory, /cardWide: \{ width: '48\.5%' \}/);
  assert.match(group, /const wideCards = resourceListWidth >= 620 && fontScale < 1\.35/);
  assert.match(group, /onLayout=\{\(event\) => setResourceListWidth\(event\.nativeEvent\.layout\.width\)\}/);
  assert.match(group, /wide && styles\.resourceCardWide/);
  assert.match(group, /resourceList: \{ flexDirection: 'row', flexWrap: 'wrap'/);
  assert.match(resourceViewer, /actionBar: \{[\s\S]*?flexWrap: 'wrap'/);
  assert.match(organizationProfile, /rows: \{[\s\S]*?marginHorizontal: 16,[\s\S]*?borderRadius: 12/);
  assert.match(
    organizationProfile,
    /<Animated\.ScrollView[\s\S]*?<PageHead[\s\S]*?styles\.stats[\s\S]*?styles\.tabs[\s\S]*?tab === 'members'/
  );
  assert.match(organizationProfile, /fill: \{ flex: 1, overflow: 'hidden' \}/);
  assert.match(organizationProfile, /stat: \{ flex: 1, minWidth: 0/);
  assert.match(organizationProfile, /personRow: \{[\s\S]*?width: '100%',[\s\S]*?minWidth: 0/);
  assert.match(organizationProfile, /numberOfLines=\{2\} style=\{\[styles\.jobTitle/);
  assert.match(notifications, /itemContent: \{ flex: 1, minWidth: 0/);
  assert.match(notifications, /itemMeta: \{ minHeight: 20/);
});

test('member directory labels its full index and filters organizations by sector', () => {
  const directory = source('src/screens/DirectoryScreen.tsx');

  assert.match(directory, /\['directory', 'Directory'\]/);
  assert.match(directory, /Search \$\{orgs\.length\}.*organization.*\$\{people\.length\}.*member/);
  assert.match(directory, /\{ id: 'Pension Fund', label: 'Pension funds' \}/);
  assert.match(directory, /\{ id: 'Sovereign Wealth Fund', label: 'Sovereign wealth' \}/);
  assert.match(directory, /sector === 'all' \|\| o\.sector === sector/);
  assert.match(directory, /<FilterChipRow>/);
});

test('authenticated page headers expose an icon-only global search action beside appearance', () => {
  const app = source('App.tsx');
  const memberProvider = source('src/auth/MemberProvider.tsx');
  const primitives = source('src/ds/primitives.tsx');
  const searchScreen = source('src/screens/SearchScreen.tsx');

  assert.match(app, /onOpenSearch=\{isSignedIn \? openSearch : undefined\}/);
  assert.match(app, /const openSearch = useCallback\(\(\) => \{[\s\S]*?setSearchOpen\(true\)/);
  assert.match(app, /\{searchOpen \? \([\s\S]*?<ScreenEnter style=\{\[StyleSheet\.absoluteFill/);
  assert.match(app, /<SearchScreen[\s\S]*?onClose=\{closeSearch\}/);
  assert.match(memberProvider, /openSearch\?: \(\) => void/);
  assert.match(primitives, /accessibilityLabel="Search the member portal"/);
  assert.match(primitives, /accessibilityHint="Opens the global search screen"/);
  assert.match(primitives, /<MagnifyingGlass size=\{19\} color=\{t\.inkMuted\} \/>[\s\S]*?<Pressable[\s\S]*?accessibilityLabel="Appearance"/);
  assert.match(primitives, /iconButton: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  assert.doesNotMatch(primitives, /searchLabel|>Search<\/Text>/);
  assert.match(searchScreen, /<TextInput[\s\S]*?autoFocus/);
});

test('working-group resources open from artifacts and tab badges stay disabled', () => {
  const app = source('App.tsx');
  const home = source('src/screens/HomeScreen.tsx');
  const group = source('src/components/groups/GroupView.tsx');
  const directory = source('src/components/groups/GroupDirectory.tsx');

  assert.match(group, /const canOpen = resource\.artifact\.kind !== 'none'/);
  assert.match(group, /disabled=\{!canOpen\}/);
  assert.doesNotMatch(group, /disabled=\{!resource\.href\}/);
  assert.match(app, /<PortalTabBar[\s\S]*?showBadges=\{false\}/);
  assert.doesNotMatch(app, /groups: myGroups\.reduce/);
  assert.doesNotMatch(home, /group\.unread/);
  assert.doesNotMatch(directory, /g\.unread/);
});

test('working-group navigation remains visible while every panel scrolls independently', () => {
  const group = source('src/components/groups/GroupView.tsx');

  assert.match(group, /<SwipeBack[\s\S]*?\{head\}\s*<View style=\{styles\.fill\}>/);
  assert.equal((group.match(/\{head\}/g) ?? []).length, 1);
  assert.doesNotMatch(group, /StickyTitle|useStickyScroll|\.\.\.handlers/);
  assert.match(group, /tab === 'resources'[\s\S]*?<ScrollView showsVerticalScrollIndicator=\{false\}>[\s\S]*?<GroupResourcesPanel/);
  assert.match(group, /tab === 'moderation'[\s\S]*?<ScrollView contentContainerStyle=\{styles\.resources\}/);
  assert.match(group, /tabScroller: \{ flex: 1, minWidth: 0 \}/);
});

test('working-group member cards, directory cards, and moderation controls reflow', () => {
  const group = source('src/components/groups/GroupView.tsx');
  const directory = source('src/components/groups/GroupDirectory.tsx');
  const forumModeration = source('src/components/groups/ForumModerationPanel.tsx');
  const resourceModeration = source('src/components/groups/ResourceModerationPanel.tsx');
  const parts = source('src/components/groups/parts.tsx');

  assert.match(group, /style=\{styles\.memberDetails\}[\s\S]*?style=\{styles\.memberOrganization\}/);
  assert.match(group, /memberNameRow: \{ flexDirection: 'row', flexWrap: 'wrap'/);
  assert.match(group, /cardActions: \{[^\n]*flexWrap: 'wrap'/);
  assert.match(directory, /const wideCards = windowWidth >= 700 && fontScale < 1\.35/);
  assert.match(directory, /wideCards && styles\.cardWide/);
  assert.match(forumModeration, /actions: \{[^\n]*flexWrap: 'wrap'/);
  assert.match(resourceModeration, /filters: \{ flexDirection: 'row', flexWrap: 'wrap'/);
  assert.match(parts, /minHeight: height/);
});
