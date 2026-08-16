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
  /** Every post across those groups, from the API. */
  posts: FeedEntry[];
  /** Posts composed this session, newest first. */
  newPosts: FeedEntry[];
  /** The group whose page is open; null shows the directory. */
  groupId: string | null;
  onOpenGroup: (id: string) => void;
  onCloseGroup: () => void;
  threadId: string | null;
  onOpenThread: (id: string) => void;
  onCloseThread: () => void;
  /** Replies posted this session, kept out of the static data and keyed by thread. */
  extraReplies: Record<string, Reply[] | undefined>;
  onReply: (threadId: string, reply: Reply) => void;
  /** Chosen option index per thread; absent means this member has not voted. */
  votes: Record<string, number | undefined>;
  onVote: (threadId: string, option: number) => void;
  /** Whether this member has upvoted a post; adds 1 to its stored count. */
  upvoted: Record<string, boolean | undefined>;
  onToggleUpvote: (threadId: string) => void;
  /** Whether this member has upvoted a reply, keyed by reply id or position. */
  replyUpvoted: Record<string, boolean | undefined>;
  onToggleReplyUpvote: (threadId: string, key: string, replyId: string | undefined) => void;
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
  posts,
  newPosts,
  groupId,
  onOpenGroup,
  onCloseGroup,
  threadId,
  onOpenThread,
  onCloseThread,
  extraReplies,
  onReply,
  votes,
  onVote,
  upvoted,
  onToggleUpvote,
  replyUpvoted,
  onToggleReplyUpvote,
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
  const [tab, setTab] = useState<GroupTab>(defaultGroupTab);
  const [filter, setFilter] = useState<PostFilterId>('all');

  const allPosts = useMemo(() => [...newPosts, ...posts], [newPosts, posts]);

  const repliesFor = (id: string): Reply[] => {
    const base = allPosts.find((x) => x.post.id === id)?.post.replies ?? [];
    return [...base, ...(extraReplies[id] ?? [])];
  };

  const isSubscribed = (g: Group) => subscribed[g.id] ?? g.joined;

  /** Posts per group, newest first — `mins` is the only ordering key posts carry. */
  const byGroup = useMemo(() => {
    const map = new Map<string, Thread[]>();
    for (const { post, groupId: gid } of allPosts) {
      const list = map.get(gid);
      if (list) list.push(post);
      else map.set(gid, [post]);
    }
    for (const list of map.values()) list.sort((a, b) => (a.mins ?? 0) - (b.mins ?? 0));
    return map;
  }, [allPosts]);

  const group = groupId ? groups.find((g) => g.id === groupId) ?? null : null;
  const thread = threadId ? allPosts.find((x) => x.post.id === threadId)?.post ?? null : null;

  /* ── post detail ─────────────────────────────────────────────────────── */
  if (group && thread) {
    return (
      <PostDetail
        groupName={group.n}
        post={thread}
        replies={repliesFor(thread.id)}
        upvoted={!!upvoted[thread.id]}
        onToggleUpvote={() => onToggleUpvote(thread.id)}
        saved={!!saved[thread.id]}
        onToggleSave={() => onToggleSave(thread.id)}
        replyUpvoted={replyUpvoted}
        onToggleReplyUpvote={(key, replyId) => onToggleReplyUpvote(thread.id, key, replyId)}
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
    const groupPosts = byGroup.get(group.id) ?? [];
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
  const matches = q ? groups.filter((g) => g.n.toLowerCase().includes(q)) : groups;

  return (
    <View style={styles.fill}>
      <GroupDirectory
        subscribed={matches.filter(isSubscribed)}
        rest={matches.filter((g) => !isSubscribed(g))}
        postCounts={Object.fromEntries(groups.map((g) => [g.id, (byGroup.get(g.id) ?? []).length]))}
        unreadTotal={groups.reduce((n, g) => n + g.unread, 0)}
        totalGroups={groups.length}
        memberInitials={member.initials ?? initials(member.name)}
        query={query}
        onQuery={setQuery}
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
