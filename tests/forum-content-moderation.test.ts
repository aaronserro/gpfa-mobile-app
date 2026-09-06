import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

async function source(path: string) {
  return readFile(join(process.cwd(), path), 'utf8');
}

test('forum reporting routes and authenticated repository calls are centralized', async () => {
  const [config, portal] = await Promise.all([
    source('src/api/config.ts'),
    source('src/api/portal.ts'),
  ]);

  assert.match(config, /forumReports: '\/api\/members\/forum\/reports'/);
  assert.match(config, /forumReport: \(reportId: string\)/);
  assert.match(config, /forumModerationRemove: '\/api\/members\/forum\/moderation\/remove'/);
  assert.match(portal, /export function submitForumContentReport/);
  assert.match(portal, /export function getForumModerationQueue/);
  assert.match(portal, /export function resolveForumContentReport/);
  assert.match(portal, /export function removeForumContent/);
  assert.match(portal, /request<ForumContentReportResponse>\(ROUTES\.forumReports/);
  assert.match(portal, /request<StatusResponse>\(ROUTES\.forumReport\(reportId\)/);
  assert.match(portal, /request<StatusResponse>\(ROUTES\.forumModerationRemove/);
});

test('moderation queue mapping rejects malformed required server fields', async () => {
  const portal = await source('src/api/portal.ts');

  assert.match(portal, /objectRecord\(value, path\)/);
  assert.match(portal, /requiredString\(report\.workingGroupSlug/);
  assert.match(portal, /requiredString\(report\.workingGroupName/);
  assert.match(portal, /requiredString\(report\.targetId/);
  assert.match(portal, /requiredString\(report\.threadId/);
  assert.match(portal, /requiredString\(report\.targetBody/);
  assert.match(portal, /mapForumModerationPerson\(report\.reporter/);
  assert.match(portal, /mapForumModerationPerson\(report\.author/);
  assert.match(portal, /The forum moderation queue response is invalid/);
  assert.doesNotMatch(portal, /workingGroupSlug:\s*report\.workingGroupSlug\s*\?\?/);
});

test('report and moderation components stay presentational', async () => {
  const [reportSheet, moderationPanel, postDetail, groupView] = await Promise.all([
    source('src/components/groups/ForumReportSheet.tsx'),
    source('src/components/groups/ForumModerationPanel.tsx'),
    source('src/components/groups/PostDetail.tsx'),
    source('src/components/groups/GroupView.tsx'),
  ]);

  for (const component of [reportSheet, moderationPanel, postDetail, groupView]) {
    assert.doesNotMatch(component, /from ['"].*data\/fixtures/);
    assert.doesNotMatch(component, /\bfetch\(/);
  }
  assert.match(reportSheet, /A co-lead will review this report privately/);
  assert.match(reportSheet, /MAX_DETAILS_LENGTH = 1000/);
  assert.match(moderationPanel, /onDismiss: \(reportId: string\) => Promise<boolean>/);
  assert.match(moderationPanel, /onRemove: \(reportId: string\) => Promise<boolean>/);
  assert.match(groupView, /<ForumModerationPanel/);
});

test('member, author, moderator, and tombstone actions are distinct', async () => {
  const [screen, detail, app] = await Promise.all([
    source('src/screens/GroupsScreen.tsx'),
    source('src/components/groups/PostDetail.tsx'),
    source('App.tsx'),
  ]);

  assert.match(screen, /selectedGroupMembershipRole === 'co_lead'/);
  assert.match(screen, /member\.appRole === 'admin'/);
  assert.doesNotMatch(screen, /member\.role\?\.toLowerCase\(\) === 'admin'/);
  assert.match(detail, /post\.authorId !== memberId/);
  assert.match(detail, /node\.reply\.authorId !== memberId/);
  assert.match(detail, /Reply removed by a co-lead/);
  assert.match(detail, /if \(r\.deleted\)/);
  assert.match(detail, /<ForumReportSheet/);
  assert.match(app, /membership\?\.role === 'co_lead' \|\| member\.appRole === 'admin'/);
  assert.match(app, /setForumModeration\(\(current\) => \(\{ \.\.\.current, \[id\]: undefined \}\)\)/);
});

test('App owns report state and reconciles canonical forum data', async () => {
  const app = await source('App.tsx');

  assert.match(app, /const \[forumModeration, setForumModeration\]/);
  assert.match(app, /const \[reportingTarget, setReportingTarget\]/);
  assert.match(app, /const submitForumReport = useCallback/);
  assert.match(app, /const resolveForumReport = useCallback/);
  assert.match(app, /const removeContentAsModerator = useCallback/);
  assert.match(app, /loadForumModeration\(groupId\)/);
  assert.match(app, /refreshThreadDetail\(target\.threadId\)/);
  assert.match(app, /notificationsQuery\.refetch\(\)/);
  assert.match(app, /tombstoneReplyInGroupDetails/);
});
