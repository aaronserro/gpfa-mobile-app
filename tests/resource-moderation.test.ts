import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

async function source(path: string) {
  return readFile(join(process.cwd(), path), 'utf8');
}

test('mobile resource moderation calls the existing admin endpoints', async () => {
  const [config, portal] = await Promise.all([
    source('src/api/config.ts'),
    source('src/api/portal.ts'),
  ]);

  assert.match(config, /workingGroupResourceModeration: '\/api\/admin\/resource-submissions'/);
  assert.match(
    config,
    /`\/api\/admin\/resource-submissions\/\$\{submissionId\}\/status`/,
  );
  assert.match(portal, /export function getWorkingGroupResourceModeration/);
  assert.match(portal, /export function reviewWorkingGroupResourceSubmission/);
  assert.match(portal, /export function removeWorkingGroupApprovedResource/);
});

test('mobile moderation remains presentational and uses authoritative membership', async () => {
  const [app, screen, groupView, panel] = await Promise.all([
    source('App.tsx'),
    source('src/screens/GroupsScreen.tsx'),
    source('src/components/groups/GroupView.tsx'),
    source('src/components/groups/ResourceModerationPanel.tsx'),
  ]);

  assert.match(app, /membershipRole: membership\?\.role \?\? null/);
  const metadataStart = app.indexOf('const loadGroupMetadata');
  const metadataEnd = app.indexOf('const loadGroupFeed', metadataStart);
  const metadataLoader = app.slice(metadataStart, metadataEnd);
  assert.match(metadataLoader, /Promise\.allSettled/);
  assert.doesNotMatch(metadataLoader, /getWorkingGroupMembership/);
  assert.match(app, /getWorkingGroupResourceModeration/);
  assert.match(screen, /selectedGroupMembershipRole === 'co_lead'/);
  assert.doesNotMatch(screen, /selectedGroupCoLeads\.some/);
  assert.match(await source('src/api/portal.ts'), /id: member\.id/);
  assert.match(groupView, /<ResourceModerationPanel/);
  assert.doesNotMatch(panel, /from ['"].*data\/fixtures/);
  assert.doesNotMatch(panel, /\bfetch\(/);
});

test('mobile moderation exposes every required review action', async () => {
  const panel = await source('src/components/groups/ResourceModerationPanel.tsx');

  assert.match(panel, /decide\('approved'\)/);
  assert.match(panel, /decide\('changes_requested'\)/);
  assert.match(panel, /decide\('rejected'\)/);
  assert.match(panel, /Remove From Library/);
  assert.match(panel, /submission\.files\.map/);
  assert.match(panel, /reviewerNotes/);
});

test('mobile thread moderation filters non-poll threads and exposes every status action', async () => {
  const [screen, groupView] = await Promise.all([
    source('src/screens/GroupsScreen.tsx'),
    source('src/components/groups/GroupView.tsx'),
  ]);

  assert.match(screen, /onChangePostStatus=\{onChangePostStatus\}/);
  assert.match(groupView, /post\.type !== 'poll'/);
  assert.match(groupView, /useState<ModerationThreadStatus>\('open'\)/);
  assert.match(groupView, /\(\['open', 'answered', 'closed'\] as const\)/);
  assert.match(groupView, /moderationThreadStatus\(post\) === threadStatusFilter/);
  assert.match(groupView, /type === 'discussion' && status !== 'answered'/);
  assert.match(groupView, /onChangePostStatus\(post\.id, 'open'\)/);
  assert.match(groupView, /onChangePostStatus\(post\.id, 'answered'\)/);
  assert.match(groupView, /onChangePostStatus\(post\.id, 'closed'\)/);
  assert.match(groupView, /Reopen Thread/);
  assert.match(groupView, /pendingMutations\[`thread:status:\$\{post\.id\}`\]/);
  assert.match(groupView, /disabled=\{statusPending\}/);
  assert.match(groupView, /<MutationNotice notice=\{mutationNotice\}/);
});
