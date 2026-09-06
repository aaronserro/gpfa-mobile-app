import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

async function source(path: string) {
  return readFile(join(process.cwd(), path), 'utf8');
}

test('member block routes and authenticated repository calls are centralized', async () => {
  const [config, portal, client] = await Promise.all([
    source('src/api/config.ts'),
    source('src/api/portal.ts'),
    source('src/api/client.ts'),
  ]);

  assert.match(config, /memberBlocks: '\/api\/members\/blocks'/);
  assert.match(config, /memberBlock: \(targetMemberId: string\)/);
  assert.match(config, /encodeURIComponent\(targetMemberId\)/);
  assert.match(portal, /export function getBlockedMembers\(cursor\?: string\)/);
  assert.match(portal, /request<unknown>\(`\$\{ROUTES\.memberBlocks\}\$\{queryString\(\{ cursor \}\)\}`\)/);
  assert.match(portal, /export function blockMember\(targetMemberId: string\)/);
  assert.match(portal, /request<unknown>\(ROUTES\.memberBlocks, \{\s*method: 'POST',\s*body: \{ targetMemberId \}/s);
  assert.match(portal, /export function unblockMember\(targetMemberId: string\)/);
  assert.match(portal, /request<unknown>\(ROUTES\.memberBlock\(targetMemberId\), \{ method: 'DELETE' \}\)/);
  assert.match(client, /headers\.Authorization = `Bearer \$\{token\}`/);
});

test('block DTOs and messaging capabilities reject malformed required fields', async () => {
  const [types, portal] = await Promise.all([
    source('src/api/types.ts'),
    source('src/api/portal.ts'),
  ]);

  assert.match(types, /availability: 'active'/);
  assert.match(types, /availability: 'unavailable'/);
  assert.match(types, /canSend: boolean/);
  assert.match(types, /blockedByCurrentMember: boolean/);
  assert.match(portal, /response\.members\.map\(normalizeBlockedMember\)/);
  assert.match(portal, /member\.availability === 'unavailable'/);
  assert.match(portal, /member\.availability !== 'active'/);
  assert.match(portal, /throw new Error\(`Blocked member \$\{index \+ 1\} response is invalid\.`\)/);
  assert.match(portal, /typeof conversation\.canSend !== 'boolean'/);
  assert.match(portal, /typeof conversation\.blockedByCurrentMember !== 'boolean'/);
  assert.match(portal, /missing required messaging capabilities/);
  assert.doesNotMatch(portal, /canSend:\s*conversation\.canSend\s*\?\?/);
  assert.doesNotMatch(portal, /blockedByCurrentMember:\s*conversation\.blockedByCurrentMember\s*\?\?/);
});

test('blocking UI remains presentational and fixture mutations cannot invent success', async () => {
  const paths = [
    'src/components/directory/BlockMemberAction.tsx',
    'src/components/directory/BlockedMembersPanel.tsx',
    'src/components/directory/ConversationThread.tsx',
    'src/components/directory/MessagesInbox.tsx',
    'src/screens/DirectoryMemberProfileScreen.tsx',
    'src/screens/ProfileSettingsScreen.tsx',
  ];
  const [portal, ...components] = await Promise.all([
    source('src/api/portal.ts'),
    ...paths.map(source),
  ]);

  for (const component of components) {
    assert.doesNotMatch(component, /from ['"].*data\/fixtures/);
    assert.doesNotMatch(component, /\bfetch\(/);
    assert.doesNotMatch(component, /supabase/i);
  }
  assert.match(portal, /if \(!USING_REMOTE_API\) return memberBlockingRequiresApi<StatusResponse>\(\)/);
  assert.match(components[0], /Alert\.alert\(/);
  assert.match(components[0], /Existing group conversations are not affected/);
  assert.match(components[0], /accessibilityState=\{\{ disabled: pending, busy: pending \}\}/);
  assert.match(components[1], /member\.availability === 'active'/);
  assert.match(components[1], /Unavailable member/);
});

test('App owns block state, closes affected views, and performs canonical refreshes', async () => {
  const app = await source('App.tsx');

  assert.match(app, /const \[blockedMembers, setBlockedMembers\]/);
  assert.match(app, /const \[pendingBlockedMemberId, setPendingBlockedMemberId\]/);
  assert.match(app, /const handleBlockMember = useCallback/);
  assert.match(app, /const handleUnblockMember = useCallback/);
  assert.match(app, /await blockMember\(targetMemberId\)/);
  assert.match(app, /await unblockMember\(targetMemberId\)/);
  assert.match(app, /draftMessageRecipient\?\.id === targetMemberId/);
  assert.match(app, /closeMessageConversation\(\)/);
  assert.match(app, /if \(profileTargetId === targetMemberId\) setProfileOpen\(false\)/);
  assert.match(app, /directoryPeopleQuery\.refetch\(\)/);
  assert.match(app, /orgsQuery\.refetch\(\)/);
  assert.match(app, /messageConversationsQuery\.refetch\(\)/);
  assert.match(app, /notificationsQuery\.refetch\(\)/);
  assert.match(app, /mentionsQuery\.refetch\(\)/);
  assert.match(app, /loadGroupMetadata\(groupId\)/);
  assert.match(app, /void refreshBlockedMemberList\(\)/);
  assert.match(app, /A reciprocal block may remain/);
  assert.doesNotMatch(app, /canSend:\s*true[^}]*unblockMember/s);
});

test('restricted direct threads stay readable while prohibited actions are removed', async () => {
  const [thread, inbox, screen] = await Promise.all([
    source('src/components/directory/ConversationThread.tsx'),
    source('src/components/directory/MessagesInbox.tsx'),
    source('src/screens/DirectoryScreen.tsx'),
  ]);

  assert.match(thread, /restrictedDirect = conversation\?\.kind === 'direct' && !conversation\.canSend/);
  assert.match(thread, /Messaging unavailable/);
  assert.match(thread, /This conversation is read-only\. Existing messages remain available\./);
  assert.match(thread, /const actionsAvailable = !restrictedDirect/);
  assert.match(thread, /!restrictedDirect && reactionPickerMessageId/);
  assert.match(thread, /!managing && restrictedDirect/);
  assert.match(thread, /mode=\{conversation\.blockedByCurrentMember \? 'unblock' : 'block'\}/);
  assert.match(thread, /onReachLatest\(latestOrdinal\)/);
  assert.match(thread, /const isGroup = conversation\?\.kind === 'group'/);
  assert.match(inbox, /conversation\.canSend && other\.isAvailable/);
  assert.match(screen, /onBlockMember=\{onBlockMember\}/);
  assert.match(screen, /onUnblockMember=\{onUnblockMember\}/);
});

test('profile, settings, mentions, and realtime preserve privacy boundaries', async () => {
  const [profile, settings, mentions, realtime] = await Promise.all([
    source('src/screens/DirectoryMemberProfileScreen.tsx'),
    source('src/screens/ProfileSettingsScreen.tsx'),
    source('src/components/groups/MentionInput.tsx'),
    source('src/api/messaging-realtime.ts'),
  ]);

  assert.match(profile, /This member profile is unavailable\./);
  assert.match(profile, /More actions for \$\{profile\.fullName\}/);
  assert.match(profile, /await onBlockMember\(memberId\);\s*onBack\(\)/s);
  assert.match(settings, /<BlockedMembersPanel/);
  assert.match(mentions, /server-filtered roster replaces the candidate set/);
  assert.match(mentions, /members\.filter\(\(member\) => member\.id && member\.name && member\.mentionHandle\)/);
  assert.match(realtime, /conversation\.created/);
  assert.match(realtime, /conversation\.member_left/);
  assert.match(realtime, /message\.created/);
  assert.match(realtime, /reaction\.changed/);
  assert.doesNotMatch(realtime, /member\.blocked|member\.unblocked|block\.changed/);
});
