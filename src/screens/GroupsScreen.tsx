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
import GroupView, { type GroupTab, type PostFilterId } from '../components/groups/GroupView';
import type { GroupSortId } from '../components/groups/GroupDirectory';
import PostDetail from '../components/groups/PostDetail';
import { initials } from '../lib/format';
import type {
  FeedEntry,
  Group,
  Member,
  PostType,
  Reply,
  RsvpChoice,
  Thread,
} from '../api/types';

const POST_TYPES: PostType[] = ['discussion', 'poll', 'announcement', 'event'];

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
  selectedGroupCoLeads?: Group['members'];
  selectedGroupMembers?: Group['members'];
  onLoadMoreGroupFeed?: () => void;
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
  onReply: (threadId: string, reply: Reply) => void;
  /** Chosen option index per thread; absent means this member has not voted. */
  votes: Record<string, number | undefined>;
  onVote: (threadId: string, option: number) => void;
  /** Whether this member has upvoted a post; adds 1 to its stored count. */
  upvoted: Record<string, boolean | undefined>;
  onToggleUpvote: (threadId: string) => void;
  /** Whether this member has saved a post. */
  saved: Record<string, boolean | undefined>;
  onToggleSave: (threadId: string) => void;
  /** Subscription overrides; absent falls back to the group's own `joined`. */
  subscribed: Record<string, boolean | undefined>;
  onToggleSubscribe: (groupId: string) => void;
  /** RSVP per event post. */
  rsvps: Record<string, RsvpChoice | undefined>;
  onRsvp: (threadId: string, choice: RsvpChoice) => void;
  onCompose: () => void;
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
  selectedGroupCoLeads = [],
  selectedGroupMembers = [],
  onLoadMoreGroupFeed,
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
  votes,
  onVote,
  upvoted,
  onToggleUpvote,
  saved,
  onToggleSave,
  subscribed,
  onToggleSubscribe,
  rsvps,
  onRsvp,
  onCompose,
  showTagsInFeed = true,
  defaultGroupTab = 'posts',
}: GroupsScreenProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<GroupSortId>('recommended');
  const [tab, setTab] = useState<GroupTab>(defaultGroupTab);
  const [filter, setFilter] = useState<PostFilterId>('all');

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
        upvoted={!!upvoted[thread.id]}
        onToggleUpvote={() => onToggleUpvote(thread.id)}
        saved={!!saved[thread.id]}
        onToggleSave={() => onToggleSave(thread.id)}
        vote={votes[thread.id]}
        onVote={(option) => onVote(thread.id, option)}
        rsvp={rsvps[thread.id]}
        onRsvp={(choice) => onRsvp(thread.id, choice)}
        onReply={(text, mention) =>
          onReply(thread.id, {
            a: member.name,
            org: member.org,
            time: 'Just now',
            initials: member.initials ?? initials(member.name),
            ...(mention ? { mention: `@${mention}` } : {}),
            text,
          })
        }
        onBack={onCloseThread}
      />
    );
  }

  /* ── one group ───────────────────────────────────────────────────────── */
  if (group) {
    const groupPosts = selectedGroupFeed?.map((entry) => entry.post) ?? [];
    const shown =
      filter === 'all' ? groupPosts : groupPosts.filter((p) => (p.type ?? 'discussion') === filter);

    const typeCounts = Object.fromEntries(
      POST_TYPES.map((k) => [k, groupPosts.filter((p) => (p.type ?? 'discussion') === k).length])
    ) as Record<PostType, number>;

    const replyCounts = Object.fromEntries(
      groupPosts.map((p) => [p.id, repliesFor(p.id).length])
    );

    return (
      <GroupView
        group={group}
        posts={shown}
        totalPosts={groupPosts.length}
        typeCounts={typeCounts}
        coLeads={selectedGroupCoLeads}
        members={selectedGroupMembers}
        loading={selectedGroupLoading}
        loadingMore={selectedGroupLoadingMore}
        error={selectedGroupError}
        hasMore={!!selectedGroupNextCursor}
        onLoadMore={onLoadMoreGroupFeed}
        tab={tab}
        onTab={setTab}
        filter={filter}
        onFilter={setFilter}
        subscribed={isSubscribed(group)}
        onToggleSubscribe={() => onToggleSubscribe(group.id)}
        replyCounts={replyCounts}
        upvoted={upvoted}
        onToggleUpvote={onToggleUpvote}
        saved={saved}
        onToggleSave={onToggleSave}
        showTags={showTagsInFeed}
        onBack={onCloseGroup}
        onOpenPost={onOpenThread}
        onCompose={onCompose}
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
        postCounts={postCounts}
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        onOpen={(id) => {
          // A group always opens on the configured tab with the filter cleared.
          setTab(defaultGroupTab);
          setFilter('all');
          onOpenGroup(id);
        }}
      />
    </View>
  );
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
