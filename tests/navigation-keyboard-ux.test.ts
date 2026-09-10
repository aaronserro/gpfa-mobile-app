import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = join(import.meta.dirname, '..');

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

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

test('resource submission keeps a large scrollable form and fixed keyboard-aware action footer', () => {
  const composer = source('src/components/groups/ResourceSubmissionComposer.tsx');

  assert.match(composer, /from 'react-native-keyboard-controller'/);
  assert.match(composer, /<KeyboardAvoidingView behavior="padding" style=\{styles\.keyboardAvoider\}>/);
  assert.match(composer, /style=\{styles\.formScroll\}/);
  assert.match(composer, /<View style=\{\[styles\.actions, \{ borderTopColor: t\.rule \}\]\}>/);
  assert.match(composer, /maxHeight: '94%'/);
  assert.match(composer, /formScroll: \{ flexShrink: 1, minHeight: 0 \}/);
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
