/**
 * The Groups tab: working group directory → one group → one post.
 *
 * From the Mobile Groups Tab design, frame 1a ("neutral cards, web-style meta
 * line") — the only frame `renderVals` puts on the canvas.
 *
 * Presentational. Navigation and every mutation arrive as props; what lives
 * here is the search text, the active group tab and the post-type filter, none
 * of which the server needs to know about.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import GroupDirectory from '../components/groups/GroupDirectory';
import GroupView, { type GroupTab } from '../components/groups/GroupView';
import type { GroupSortId } from '../components/groups/GroupDirectory';
import PostDetail from '../components/groups/PostDetail';
import type { MutationNoticeValue } from '../components/MutationNotice';
import { initials } from '../lib/format';
import { DEFAULT_WORKING_GROUP_FEED_CONTROLS } from '../lib/workingGroupFeedControls';
import type {
  FeedEntry,
  ForumAttachment,
  ForumUploadFile,
  Group,
  LibraryResource,
  Member,
  MemberPoll,
  MemberPollUpdateInput,
  Reply,
  RsvpChoice,
  WorkingGroupFeedControls,
  WorkingGroupResourceModerationSubmission,
  WorkingGroupResourceReviewInput,
} from '../api/types';

export interface GroupsScreenProps {
  /** The signed-in member — authors replies and fills the directory avatar. */
  member: Member;
  /** All working groups, from the API. */
  groups: Group[];
  /** Posts composed this session, newest first. */
  newPosts: FeedEntry[];
  selectedGroupFeed?: FeedEntry[];
  selectedGroupLoading?: boolean;
  selectedGroupLoadingMore?: boolean;
  selectedGroupError?: Error | null;
  selectedGroupNextCursor?: string | null;
  selectedGroupTotalMatching?: number;
  selectedGroupFeedControls?: WorkingGroupFeedControls;
  selectedGroupCoLeads?: Group['members'];
  selectedGroupMembers?: Group['members'];
  selectedGroupMembershipRole?: 'member' | 'co_lead' | null;
  resources?: LibraryResource[];
  moderationSubmissions?: WorkingGroupResourceModerationSubmission[];
  moderationLoading?: boolean;
  moderationError?: Error | null;
  moderationPendingSubmissionId?: string | null;
  onRefreshModeration: () => void;
  onReviewResource: (
    submissionId: string,
    input: WorkingGroupResourceReviewInput
  ) => Promise<boolean>;
  onRemoveResource: (submissionId: string) => Promise<boolean>;
  onLoadMoreGroupFeed?: () => void;
  onApplyGroupFeedControls: (groupId: string, controls: WorkingGroupFeedControls) => void;
  /** The group whose page is open; null shows the directory. */
  groupId: string | null;
  onOpenGroup: (id: string) => void;
  onCloseGroup: () => void;
  threadId: string | null;
  onOpenThread: (id: string) => void;
  onCloseThread: () => void;
  postSummaries?: Record<string, string | undefined>;
  summarizing?: Record<string, boolean | undefined>;
  onSummarize?: (threadId: string) => void;
  onUpdatePost?: (threadId: string, input: { title?: string; body?: string }) => void;
  onDeletePost?: (threadId: string) => void;
  onChangePostStatus?: (threadId: string, status: 'open' | 'answered' | 'closed') => void;
  /** Replies posted this session, kept out of the static data and keyed by thread. */
  extraReplies: Record<string, Reply[] | undefined>;
  onReply: (threadId: string, reply: Reply) => Promise<boolean>;
  onDeleteReply: (threadId: string, replyId: string) => Promise<void>;
  mutationNotice: MutationNoticeValue | null;
  onDismissMutationNotice: () => void;
  pendingMutations: Record<string, boolean | undefined>;
  pollEditors: Record<string, MemberPoll | undefined>;
  pollEditorErrors: Record<string, string | undefined>;
  onOpenPollEditor: (pollId: string) => Promise<void>;
  onClosePollEditor: (pollId: string) => void;
  onSavePoll: (pollId: string, input: MemberPollUpdateInput) => Promise<boolean>;
  onClosePoll: (pollId: string) => Promise<void>;
  onDeletePoll: (pollId: string) => Promise<void>;
  /** Chosen option index per thread; absent means this member has not voted. */
  votes: Record<string, number | undefined>;
  onVote: (threadId: string, option: number) => void;
  /** Whether this member has upvoted a post; adds 1 to its stored count. */
  upvoted: Record<string, boolean | undefined>;
  onToggleUpvote: (threadId: string) => void;
  /** Whether this member has reposted a post. */
  reposted: Record<string, boolean | undefined>;
  onToggleRepost: (threadId: string) => void;
  /** Subscription overrides; absent falls back to the group's own `joined`. */
  subscribed: Record<string, boolean | undefined>;
  onToggleSubscribe: (groupId: string) => void;
  /** RSVP per event post. */
  rsvps: Record<string, RsvpChoice | undefined>;
  onRsvp: (threadId: string, choice: RsvpChoice) => void;
  onCompose: () => void;
  onOpenResourceSubmission: (group: Group) => void;
  onOpenResource?: (resource: LibraryResource) => void;
  onOpenAttachment: (attachment: ForumAttachment) => void;
  /** Design prop: show the #topic chips on feed cards. */
  showTagsInFeed?: boolean;
  /** Design prop: which tab a group opens on. */
  defaultGroupTab?: GroupTab;
}

export default function GroupsScreen({
  member,
  groups,
  newPosts,
  selectedGroupFeed,
  selectedGroupLoading = false,
  selectedGroupLoadingMore = false,
  selectedGroupError = null,
  selectedGroupNextCursor = null,
  selectedGroupTotalMatching = 0,
  selectedGroupFeedControls = DEFAULT_WORKING_GROUP_FEED_CONTROLS,
  selectedGroupCoLeads = [],
  selectedGroupMembers = [],
  selectedGroupMembershipRole = null,
  resources = [],
  moderationSubmissions = [],
  moderationLoading = false,
  moderationError = null,
  moderationPendingSubmissionId = null,
  onRefreshModeration,
  onReviewResource,
  onRemoveResource,
  onLoadMoreGroupFeed,
  onApplyGroupFeedControls,
  groupId,
  onOpenGroup,
  onCloseGroup,
  threadId,
  onOpenThread,
  onCloseThread,
  postSummaries = {},
  summarizing = {},
  onSummarize,
  onUpdatePost,
  onDeletePost,
  onChangePostStatus,
  extraReplies,
  onReply,
  onDeleteReply,
  mutationNotice,
  onDismissMutationNotice,
  pendingMutations,
  pollEditors,
  pollEditorErrors,
  onOpenPollEditor,
  onClosePollEditor,
  onSavePoll,
  onClosePoll,
  onDeletePoll,
  votes,
  onVote,
  upvoted,
  onToggleUpvote,
  reposted,
  onToggleRepost,
  subscribed,
  onToggleSubscribe,
  rsvps,
  onRsvp,
  onCompose,
  onOpenResourceSubmission,
  onOpenResource,
  onOpenAttachment,
  showTagsInFeed = true,
  defaultGroupTab = 'posts',
}: GroupsScreenProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<GroupSortId>('recommended');
  const [tab, setTab] = useState<GroupTab>(defaultGroupTab);

  const allPosts = useMemo(() => [...newPosts, ...(selectedGroupFeed ?? [])], [newPosts, selectedGroupFeed]);

  const repliesFor = (id: string): Reply[] => {
    const base = allPosts.find((x) => x.post.id === id)?.post.replies ?? [];
    return [...base, ...(extraReplies[id] ?? [])];
  };

  const isSubscribed = (g: Group) => subscribed[g.id] ?? g.joined;

  const group = groupId ? groups.find((g) => g.id === groupId) ?? null : null;
  const thread = threadId ? allPosts.find((x) => x.post.id === threadId)?.post ?? null : null;

  /* ── post detail ─────────────────────────────────────────────────────── */
  if (group && thread) {
    return (
      <PostDetail
        groupName={group.n}
        post={thread}
        replies={repliesFor(thread.id)}
        summary={postSummaries[thread.id]}
        summarizing={!!summarizing[thread.id]}
        onSummarize={() => onSummarize?.(thread.id)}
        onUpdate={(input) => onUpdatePost?.(thread.id, input)}
        onDelete={() => onDeletePost?.(thread.id)}
        onChangeStatus={(status) => onChangePostStatus?.(thread.id, status)}
        memberId={member.id}
        mentionMembers={selectedGroupMembers}
        mutationNotice={mutationNotice}
        onDismissMutationNotice={onDismissMutationNotice}
        replyPending={!!pendingMutations[`reply:create:${thread.id}`]}
        deletingReplies={pendingMutations}
        onDeleteReply={(replyId) => onDeleteReply(thread.id, replyId)}
        pollEditor={pollEditors[thread.id]}
        pollEditorError={pollEditorErrors[thread.id]}
        pollLoading={!!pendingMutations[`poll:load:${thread.id}`]}
        pollUpdating={!!pendingMutations[`poll:update:${thread.id}`]}
        pollClosing={!!pendingMutations[`poll:close:${thread.id}`]}
        pollDeleting={!!pendingMutations[`poll:delete:${thread.id}`]}
        onOpenPollEditor={() => onOpenPollEditor(thread.id)}
        onClosePollEditor={() => onClosePollEditor(thread.id)}
        onSavePoll={(input) => onSavePoll(thread.id, input)}
        onClosePoll={() => onClosePoll(thread.id)}
        onDeletePoll={() => onDeletePoll(thread.id)}
        upvoted={!!upvoted[thread.id]}
        onToggleUpvote={() => onToggleUpvote(thread.id)}
        reposted={reposted[thread.id] ?? thread.hasReposted ?? false}
        onToggleRepost={() => onToggleRepost(thread.id)}
        vote={votes[thread.id]}
        onVote={(option) => onVote(thread.id, option)}
        rsvp={rsvps[thread.id]}
        onRsvp={(choice) => onRsvp(thread.id, choice)}
        onReply={(text, parentPostId, files) =>
          onReply(thread.id, {
            a: member.name,
            org: member.org,
            time: 'Just now',
            initials: member.initials ?? initials(member.name),
            parentPostId,
            text,
            uploadFiles: files,
            attachments: optimisticAttachments(files),
          })
        }
        onOpenAttachment={onOpenAttachment}
        onBack={onCloseThread}
      />
    );
  }

  /* ── one group ───────────────────────────────────────────────────────── */
  if (group) {
    const groupPosts = selectedGroupFeed?.map((entry) => entry.post) ?? [];

    const replyCounts = Object.fromEntries(
      groupPosts.map((p) => [p.id, repliesFor(p.id).length])
    );
    const canModerate =
      member.role?.toLowerCase() === 'admin' ||
      selectedGroupMembershipRole === 'co_lead';

    return (
      <GroupView
        group={group}
        posts={groupPosts}
        allPosts={groupPosts}
        coLeads={selectedGroupCoLeads}
        members={selectedGroupMembers}
        resources={resources}
        loading={selectedGroupLoading}
        loadingMore={selectedGroupLoadingMore}
        error={selectedGroupError}
        hasMore={!!selectedGroupNextCursor}
        totalMatching={selectedGroupTotalMatching}
        onLoadMore={onLoadMoreGroupFeed}
        tab={tab}
        onTab={setTab}
        feedControls={selectedGroupFeedControls}
        onApplyFeedControls={(controls) => onApplyGroupFeedControls(group.id, controls)}
        mutationNotice={mutationNotice}
        onDismissMutationNotice={onDismissMutationNotice}
        pendingMutations={pendingMutations}
        subscribed={isSubscribed(group)}
        onToggleSubscribe={() => onToggleSubscribe(group.id)}
        canModerate={canModerate}
        moderationSubmissions={moderationSubmissions}
        moderationLoading={moderationLoading}
        moderationError={moderationError}
        moderationPendingSubmissionId={moderationPendingSubmissionId}
        onRefreshModeration={onRefreshModeration}
        onReviewResource={onReviewResource}
        onRemoveResource={onRemoveResource}
        onChangePostStatus={onChangePostStatus}
        replyCounts={replyCounts}
        upvoted={upvoted}
        onToggleUpvote={onToggleUpvote}
        reposted={reposted}
        onToggleRepost={onToggleRepost}
        showTags={showTagsInFeed}
        onBack={onCloseGroup}
        onOpenPost={onOpenThread}
        onCompose={onCompose}
        onOpenResourceSubmission={() => onOpenResourceSubmission(group)}
        onOpenResource={onOpenResource}
      />
    );
  }

  /* ── directory ───────────────────────────────────────────────────────── */
  const q = query.trim().toLowerCase();
  const matches = q
    ? groups.filter((g) => `${g.n} ${g.short} ${g.meta}`.toLowerCase().includes(q))
    : groups;
  const postCounts = Object.fromEntries(
    groups.map((g) => [g.id, g.threads.length + newPosts.filter((entry) => entry.groupId === g.id).length])
  );
  const sorted = sortGroups(matches, sort, postCounts);

  return (
    <View style={styles.fill}>
      <GroupDirectory
        subscribed={sorted.filter(isSubscribed)}
        rest={sorted.filter((g) => !isSubscribed(g))}
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        onOpen={(id) => {
          // A group always opens on the configured tab with the filter cleared.
          setTab(defaultGroupTab);
          onOpenGroup(id);
        }}
      />
    </View>
  );
}

function optimisticAttachments(files: ForumUploadFile[]): ForumAttachment[] {
  return files.map((file) => ({
    id: file.uri,
    name: file.name,
    contentType: file.mimeType,
    byteSize: file.size,
  }));
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

function sortGroups(groups: Group[], sort: GroupSortId, postCounts: Record<string, number>): Group[] {
  const originalIndex = new Map(groups.map((group, index) => [group.id, index]));
  return [...groups].sort((a, b) => {
    if (sort === 'name') return a.n.localeCompare(b.n);
    if (sort === 'members') return (b.memberCount ?? b.members.length) - (a.memberCount ?? a.members.length);
    if (sort === 'active') return (b.unread || postCounts[b.id] || 0) - (a.unread || postCounts[a.id] || 0);
    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  });
}
