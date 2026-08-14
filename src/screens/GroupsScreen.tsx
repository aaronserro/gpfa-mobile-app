import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowBendUpLeft,
  ArrowFatUp,
  ArrowUp,
  Bell,
  BookmarkSimple,
  CalendarDots,
  CaretDown,
  CaretLeft,
  ChartBar,
  ChatCircle,
  Check,
  CheckCircle,
  DotsThreeOutline,
  DownloadSimple,
  FileXls,
  MagnifyingGlass,
  MapPin,
  Megaphone,
  PaperPlaneTilt,
  ShareFat,
  SlidersHorizontal,
  UsersThree,
  X,
  type Icon,
} from '../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Eyebrow, Input, MastheadMeta } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, postTypeStyle, sans, topPad, trackDisplay, wgRule } from '../ds/tokens';
import { GROUPS, initials, type PostType, type Reply, type Thread } from '../data/portal';

export type RsvpChoice = 'yes' | 'no';

const POST_TYPES: PostType[] = ['discussion', 'poll', 'announcement', 'event'];

const TYPE_ICON: Record<PostType, Icon> = {
  discussion: ChatCircle,
  poll: ChartBar,
  announcement: Megaphone,
  event: CalendarDots,
};

const ROW_ICON = { calendar: CalendarDots, pin: MapPin, people: UsersThree };

const SORTS = [
  { id: 'newest', label: 'Newest', meta: 'NEWEST' },
  { id: 'upvoted', label: 'Most upvoted', meta: 'MOST UPVOTED' },
  { id: 'replies', label: 'Most replies', meta: 'MOST REPLIES' },
] as const;
type SortId = (typeof SORTS)[number]['id'];

/** Every post paired with the group it belongs to — the feed spans all groups. */
const ALL_POSTS: { post: Thread; groupId: string }[] = GROUPS.flatMap((g) =>
  g.threads.map((post) => ({ post, groupId: g.id }))
);

const groupOf = (id: string) => GROUPS.find((g) => g.id === id);

export interface GroupsScreenProps {
  /** Ids of the working groups whose posts appear in the feed. */
  groupIds: string[];
  onSetGroupIds: (ids: string[]) => void;
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
  /** RSVP per event post. */
  rsvps: Record<string, RsvpChoice | undefined>;
  onRsvp: (threadId: string, choice: RsvpChoice) => void;
  /** Design prop: colour each card's left rule by working group. */
  showRules?: boolean;
}

export default function GroupsScreen({
  groupIds,
  onSetGroupIds,
  threadId,
  onOpenThread,
  onCloseThread,
  extraReplies,
  onReply,
  votes,
  onVote,
  upvoted,
  onToggleUpvote,
  rsvps,
  onRsvp,
  showRules = true,
}: GroupsScreenProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [types, setTypes] = useState<PostType[]>(POST_TYPES);
  const [sortId, setSortId] = useState<SortId>('newest');
  const [expanded, setExpanded] = useState<Record<string, boolean | undefined>>({});

  const thread = threadId ? ALL_POSTS.find((x) => x.post.id === threadId)?.post ?? null : null;
  const group = threadId ? groupOf(ALL_POSTS.find((x) => x.post.id === threadId)?.groupId ?? '') : undefined;

  const repliesFor = (id: string): Reply[] => {
    const base = ALL_POSTS.find((x) => x.post.id === id)?.post.replies ?? [];
    return [...base, ...(extraReplies[id] ?? [])];
  };

  /* ── post detail ─────────────────────────────────────────────────────── */
  if (thread) {
    const replies = repliesFor(thread.id);
    const type = thread.type ?? 'discussion';
    const kind = postTypeStyle(t, type);
    const isAnnouncement = type === 'announcement';

    const choice = votes[thread.id];
    const voted = choice !== undefined;
    const counts = thread.poll?.options.map((o, i) => o.votes + (choice === i ? 1 : 0)) ?? [];
    const total = counts.reduce((a, b) => a + b, 0);

    const isUpvoted = !!upvoted[thread.id];
    const rsvp = rsvps[thread.id];

    const TypeIcon = TYPE_ICON[type];

    const send = () => {
      const text = draft.trim();
      if (!text) return;
      onReply(thread.id, { a: 'Robert Goobie', org: 'HOOPP', time: 'Just now', initials: 'RG', text });
      setDraft('');
    };

    return (
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.detailBar,
            { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline, paddingTop: topPad(insets.top, 58) },
          ]}
        >
          <Pressable onPress={onCloseThread} style={styles.backBtn} hitSlop={6}>
            <CaretLeft size={17} color={t.brandGreen} />
            <Text style={[styles.backText, { color: t.brandGreen }]}>{group?.n ?? 'Back'}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.fill} showsVerticalScrollIndicator={false}>
          {/* The left rule and chip take the post type's colour, not the group's. */}
          <View
            style={[
              styles.post,
              { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline, borderLeftColor: kind.ink },
            ]}
          >
            <View style={styles.kindRow}>
              <View style={[styles.kindChip, { backgroundColor: kind.chipBg, borderColor: kind.chipBd }]}>
                <TypeIcon size={12} color={kind.ink} />
                <Text style={[styles.kindLabel, { color: kind.ink }]}>{kind.label}</Text>
              </View>
              {!!thread.state && <Text style={[styles.kindState, { color: t.inkFaint }]}>{thread.state}</Text>}
            </View>

            <Text style={[styles.postTitle, { color: t.inkStrong }]}>{thread.title}</Text>

            <View style={styles.byline}>
              <Avatar initials={thread.initials ?? initials(thread.author)} size={32} />
              <View>
                <Text style={[styles.author, { color: t.inkStrong }]}>{thread.author}</Text>
                <MastheadMeta size={10}>
                  {thread.org.toUpperCase()} · {thread.time.toUpperCase()}
                </MastheadMeta>
              </View>
            </View>

            <Text style={[styles.postBody, { color: t.inkBody }]}>{thread.body}</Text>

            {!!thread.file && (
              <Pressable
                style={({ pressed }) => [
                  styles.attachment,
                  { borderColor: pressed ? t.ruleStrong : t.ruleHairline, backgroundColor: t.surfacePage },
                ]}
              >
                <FileXls size={22} color={t.brandGreen} />
                <View style={styles.attachmentBody}>
                  <Text style={[styles.attachmentName, { color: t.inkStrong }]}>{thread.file}</Text>
                  <MastheadMeta size={9.5}>{thread.fileMeta}</MastheadMeta>
                </View>
                <DownloadSimple size={17} color={t.inkFaint} />
              </Pressable>
            )}

            {!!thread.eventRows && (
              <>
                <View style={styles.eventRows}>
                  {thread.eventRows.map((e) => {
                    const RIcon = ROW_ICON[e.icon];
                    return (
                      <View
                        key={e.text}
                        style={[styles.eventChip, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}
                      >
                        <RIcon size={13} color={t.inkMuted} />
                        <Text style={[styles.eventChipText, { color: t.inkBody }]}>{e.text}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.rsvpRow}>
                  <Pressable
                    onPress={() => onRsvp(thread.id, 'yes')}
                    style={[
                      styles.rsvpBtn,
                      { borderColor: t.brandGreen, backgroundColor: rsvp === 'yes' ? t.brandGreen : t.surfacePaper },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rsvpYes,
                        { color: rsvp === 'yes' ? t.primaryForeground : t.brandGreen },
                      ]}
                    >
                      {rsvp === 'yes' ? 'Going' : 'Attend'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onRsvp(thread.id, 'no')}
                    style={[
                      styles.rsvpBtn,
                      { borderColor: t.ruleHairline, backgroundColor: rsvp === 'no' ? t.surfaceSoft : t.surfacePaper },
                    ]}
                  >
                    <Text style={[styles.rsvpNo, { color: t.inkBody }]}>Can&apos;t attend</Text>
                  </Pressable>
                </View>
              </>
            )}

            {!!thread.poll && (
              <>
                <View style={[styles.poll, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
                  <View style={styles.pollQRow}>
                    <ChartBar size={15} color={t.brandAmber} />
                    <Text style={[styles.pollQ, { color: t.inkStrong }]}>{thread.poll.q}</Text>
                  </View>
                  <View style={styles.pollOptions}>
                    {thread.poll.options.map((o, i) => {
                      const chosen = choice === i;
                      const pct = voted ? Math.round((counts[i] / total) * 100) : 0;
                      return (
                        <Pressable
                          key={o.label}
                          onPress={() => onVote(thread.id, i)}
                          style={[
                            styles.pollOption,
                            { borderColor: chosen ? t.brandGreen : t.ruleHairline, backgroundColor: t.surfacePaper },
                          ]}
                        >
                          {voted && (
                            <View
                              style={[
                                styles.pollFill,
                                {
                                  width: `${pct}%`,
                                  backgroundColor: chosen ? t.brandGreenSoft : alpha(t.surfaceSoft, 0.6),
                                },
                              ]}
                            />
                          )}
                          <View style={styles.pollLabelRow}>
                            <Text
                              style={[styles.pollLabel, { color: t.inkStrong, fontFamily: sans(chosen ? 600 : 500) }]}
                            >
                              {o.label}
                            </Text>
                            {chosen && <CheckCircle size={15} weight="fill" color={t.brandLeaf} />}
                          </View>
                          {voted && <Text style={[styles.pollPct, { color: t.inkMuted }]}>{pct}%</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                  <MastheadMeta size={9.5} style={styles.pollMeta}>
                    {(voted ? `${total} VOTES · ` : '') + thread.poll.closes.toUpperCase()}
                  </MastheadMeta>
                </View>

                <View style={[styles.pollStats, { borderColor: t.ruleHairline }]}>
                  {[
                    { k: 'Responses', v: String(total) },
                    { k: 'Of orgs', v: '87%' },
                    { k: 'Status', v: 'Open' },
                  ].map((stat, i) => (
                    <View
                      key={stat.k}
                      style={[
                        styles.pollStat,
                        i > 0 && { borderLeftWidth: 1, borderLeftColor: t.ruleHairline },
                      ]}
                    >
                      <MastheadMeta size={9.5}>{stat.k.toUpperCase()}</MastheadMeta>
                      <Text style={[styles.pollStatValue, { color: t.inkStrong }]}>{stat.v}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.action} onPress={() => onToggleUpvote(thread.id)} hitSlop={6}>
                <ArrowFatUp
                  size={15}
                  weight={isUpvoted ? 'fill' : 'regular'}
                  color={isUpvoted ? t.brandLeaf : t.inkMuted}
                />
                <Text style={[styles.actionText, { color: isUpvoted ? t.brandLeaf : t.inkMuted }]}>
                  {(thread.upvotes ?? 0) + (isUpvoted ? 1 : 0)}
                </Text>
              </Pressable>
              <View style={styles.action}>
                <ChatCircle size={15} color={t.inkMuted} />
                <Text style={[styles.actionText, { color: t.inkMuted }]}>{replies.length}</Text>
              </View>
              <View style={[styles.action, styles.actionEnd]}>
                <BookmarkSimple size={15} color={t.inkMuted} />
                <Text style={[styles.actionText, { color: t.inkMuted }]}>Save</Text>
              </View>
            </View>
          </View>

          {isAnnouncement ? (
            <View style={[styles.readOnly, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
              <Text style={[styles.readOnlyText, { color: t.inkMuted }]}>
                Announcements are read-only. Reply in the linked discussion thread if you have questions for the
                co-leads.
              </Text>
            </View>
          ) : (
            <>
              <Eyebrow size={10} style={styles.repliesHead}>
                Replies · {replies.length}
              </Eyebrow>

              {replies.map((r, i) => (
                <View
                  key={`${r.a}-${i}`}
                  style={[styles.reply, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}
                >
                  <Avatar initials={r.initials ?? initials(r.a)} size={24} style={styles.replyAvatar} />
                  <View style={styles.replyBody}>
                    <View style={styles.replyByline}>
                      <Text style={[styles.replyAuthor, { color: t.inkStrong }]}>{r.a}</Text>
                      <MastheadMeta size={9.5}>
                        {r.org.toUpperCase()} · {r.time.toUpperCase()}
                      </MastheadMeta>
                    </View>
                    <Text style={[styles.replyText, { color: t.inkBody }]}>
                      {!!r.mention && (
                        <Text style={{ color: t.brandBlue, fontFamily: sans(600) }}>{r.mention} </Text>
                      )}
                      {r.text}
                    </Text>
                    <View style={styles.replyActions}>
                      <View style={styles.replyAction}>
                        <ArrowFatUp size={13} color={t.inkFaint} />
                        <Text style={[styles.replyActionText, { color: t.inkFaint }]}>{r.up ?? 0}</Text>
                      </View>
                      <View style={styles.replyAction}>
                        <ArrowBendUpLeft size={13} color={t.inkFaint} />
                        <Text style={[styles.replyActionText, { color: t.inkFaint }]}>Reply</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.tail} />
            </>
          )}
        </ScrollView>

        {!isAnnouncement && (
          <View style={[styles.composer, { borderTopColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder="Reply — @ to mention a member"
              style={styles.composerInput}
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <Pressable
              onPress={send}
              accessibilityLabel="Post reply"
              style={({ pressed }) => [styles.send, { backgroundColor: pressed ? t.brandGreenStrong : t.brandGreen }]}
            >
              <ArrowUp size={18} color={t.primaryForeground} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  /* ── cross-group feed ────────────────────────────────────────────────── */
  const allGroupsOn = groupIds.length === GROUPS.length;

  const feed = ALL_POSTS.filter(
    (x) => groupIds.includes(x.groupId) && types.includes(x.post.type ?? 'discussion')
  );

  if (sortId === 'newest') {
    feed.sort((a, b) => (a.post.mins ?? 0) - (b.post.mins ?? 0));
  } else if (sortId === 'upvoted') {
    const score = (th: Thread) => (th.upvotes ?? 0) + (upvoted[th.id] ? 1 : 0);
    feed.sort((a, b) => score(b.post) - score(a.post));
  } else {
    feed.sort((a, b) => repliesFor(b.post.id).length - repliesFor(a.post.id).length);
  }

  const sortMeta = SORTS.find((s) => s.id === sortId)?.meta ?? 'NEWEST';
  const cycleSort = () => {
    const i = SORTS.findIndex((s) => s.id === sortId);
    setSortId(SORTS[(i + 1) % SORTS.length].id);
  };

  const toggleGroup = (id: string) =>
    onSetGroupIds(groupIds.includes(id) ? groupIds.filter((x) => x !== id) : [...groupIds, id]);

  const toggleType = (k: PostType) =>
    setTypes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  /** Checkbox styling shared by the group and post-type rows. */
  const box = (on: boolean) => ({
    boxBg: on ? t.brandLeaf : t.surfacePaper,
    boxBd: on ? t.brandLeaf : t.ruleHairline,
    labelColor: on ? t.inkStrong : t.inkFaint,
  });

  const checkRow = (
    key: string,
    on: boolean,
    onPress: () => void,
    left: React.ReactNode,
    label: string,
    trailing?: string
  ) => {
    const b = box(on);
    return (
      <Pressable
        key={key}
        onPress={onPress}
        style={({ pressed }) => [styles.drawerRow, pressed && { backgroundColor: t.surfacePage }]}
      >
        <View style={[styles.checkbox, { backgroundColor: b.boxBg, borderColor: b.boxBd }]}>
          {on && <Check size={11} color="#fff" />}
        </View>
        {left}
        <Text style={[styles.drawerLabel, { color: b.labelColor }]}>{label}</Text>
        {!!trailing && <MastheadMeta size={10}>{trailing}</MastheadMeta>}
      </Pressable>
    );
  };

  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.topBar,
          { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline, paddingTop: topPad(insets.top, 48) },
        ]}
      >
        <View style={styles.searchRow}>
          <Avatar initials="RG" size={32} />
          <View style={[styles.search, { backgroundColor: t.surfacePage, borderColor: t.ruleHairline }]}>
            <MagnifyingGlass size={15} color={t.inkMuted} />
            <Text style={[styles.searchText, { color: t.inkFaint }]}>Search all posts</Text>
          </View>
          <Bell size={21} color={t.inkMuted} />
        </View>

        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: t.surfaceAnchor, borderColor: t.surfaceAnchor, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <SlidersHorizontal size={13} color={t.inkInverse} />
            <Text style={[styles.chipText, { color: t.inkInverse }]}>Filter</Text>
          </Pressable>

          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={[styles.chip, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}
          >
            <Text style={[styles.chipText, { color: t.inkMuted }]}>
              {allGroupsOn ? 'ALL GROUPS' : `${groupIds.length} GROUPS`}
            </Text>
          </Pressable>

          <Pressable
            onPress={cycleSort}
            style={[styles.chip, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}
          >
            <Text style={[styles.chipText, { color: t.inkMuted }]}>{sortMeta}</Text>
            <CaretDown size={11} color={t.inkFaint} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
        {feed.map(({ post, groupId }) => {
          const g = groupOf(groupId);
          const kind = postTypeStyle(t, post.type ?? 'discussion');
          const TypeIcon = TYPE_ICON[post.type ?? 'discussion'];
          const replies = repliesFor(post.id);
          const isUp = !!upvoted[post.id];
          const isOpen = !!expanded[post.id];
          const rule = showRules && g ? wgRule(t, g.cls) : t.ruleHairline;

          return (
            <Pressable
              key={post.id}
              onPress={() => onOpenThread(post.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: t.surfacePaper,
                  borderTopColor: t.ruleHairline,
                  borderBottomColor: t.ruleHairline,
                  borderLeftColor: rule,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.typeChip, { backgroundColor: kind.chipBg, borderColor: kind.chipBd }]}>
                  <TypeIcon size={11} color={kind.ink} />
                  <Text style={[styles.typeChipText, { color: kind.ink }]}>{kind.label}</Text>
                </View>
                <MastheadMeta size={9.5} color={t.inkFaint} style={styles.groupName}>
                  {g?.n.toUpperCase()}
                </MastheadMeta>
                {!!post.state && (
                  <MastheadMeta size={9.5} color={t.inkFaint}>
                    {post.state.toUpperCase()}
                  </MastheadMeta>
                )}
              </View>

              <View style={styles.feedByline}>
                <Avatar initials={post.initials ?? initials(post.author)} size={36} />
                <View style={styles.feedBylineText}>
                  <Text style={[styles.feedAuthor, { color: t.inkStrong }]}>{post.author}</Text>
                  <MastheadMeta size={10}>
                    {post.org.toUpperCase()} · {post.time.toUpperCase()}
                  </MastheadMeta>
                </View>
                <DotsThreeOutline size={17} color={t.inkFaint} />
              </View>

              <Text style={[styles.cardTitle, { color: t.inkStrong }]}>{post.title}</Text>

              <Text style={[styles.cardBody, { color: t.inkBody }]} numberOfLines={isOpen ? undefined : 2}>
                {post.body}
              </Text>
              {!isOpen && (
                <Pressable
                  onPress={() => setExpanded((prev) => ({ ...prev, [post.id]: true }))}
                  hitSlop={6}
                >
                  <Text style={[styles.seeMore, { color: t.inkMuted }]}>…see more</Text>
                </Pressable>
              )}

              {!!post.file && (
                <View style={[styles.attachment, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
                  <FileXls size={22} color={t.brandGreen} />
                  <View style={styles.attachmentBody}>
                    <Text style={[styles.attachmentName, { color: t.inkStrong }]}>{post.file}</Text>
                    <MastheadMeta size={9.5}>{post.fileMeta}</MastheadMeta>
                  </View>
                  <DownloadSimple size={17} color={t.inkFaint} />
                </View>
              )}

              {!!post.poll && (
                <View style={[styles.feedPoll, { borderColor: t.ruleHairline }]}>
                  <View style={styles.pollQRow}>
                    <ChartBar size={15} color={t.brandAmber} />
                    <Text style={[styles.pollQ, { color: t.inkStrong }]}>{post.poll.q}</Text>
                  </View>
                  <View style={styles.pollOptions}>
                    {post.poll.options.map((o) => (
                      <View key={o.label} style={[styles.feedPollOption, { borderColor: t.ruleHairline }]}>
                        <Text style={[styles.feedPollLabel, { color: t.inkStrong }]}>{o.label}</Text>
                      </View>
                    ))}
                  </View>
                  <MastheadMeta size={9.5} style={styles.pollMeta}>
                    {post.poll.closes.toUpperCase()}
                  </MastheadMeta>
                </View>
              )}

              {!!post.eventRows && (
                <View style={styles.eventRows}>
                  {post.eventRows.map((e) => {
                    const RIcon = ROW_ICON[e.icon];
                    return (
                      <View
                        key={e.text}
                        style={[styles.eventChip, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}
                      >
                        <RIcon size={13} color={t.inkMuted} />
                        <Text style={[styles.eventChipText, { color: t.inkBody }]}>{e.text}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={[styles.countRow, { borderBottomColor: t.ruleHairline }]}>
                <ArrowFatUp size={12} weight="fill" color={t.brandLeaf} />
                <MastheadMeta size={10}>
                  {(post.upvotes ?? 0) + (isUp ? 1 : 0)} · {replies.length} REPLIES
                </MastheadMeta>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={styles.feedAction} onPress={() => onToggleUpvote(post.id)}>
                  <ArrowFatUp size={18} color={isUp ? t.brandLeaf : t.inkMuted} />
                  <Text style={[styles.feedActionText, { color: isUp ? t.brandLeaf : t.inkMuted }]}>Upvote</Text>
                </Pressable>
                <Pressable style={styles.feedAction} onPress={() => onOpenThread(post.id)}>
                  <ChatCircle size={18} color={t.inkMuted} />
                  <Text style={[styles.feedActionText, { color: t.inkMuted }]}>Comment</Text>
                </Pressable>
                <View style={styles.feedAction}>
                  <ShareFat size={18} color={t.inkMuted} />
                  <Text style={[styles.feedActionText, { color: t.inkMuted }]}>Share</Text>
                </View>
                <View style={styles.feedAction}>
                  <PaperPlaneTilt size={18} color={t.inkMuted} />
                </View>
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.feedDisclaimer, { color: t.inkFaint }]}>
          Content reflects member discussion and is not investment advice.
        </Text>
      </ScrollView>

      {drawerOpen && (
        <View style={styles.drawerWrap}>
          <Pressable style={styles.drawerScrim} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawer, { backgroundColor: t.surfacePaper, borderRightColor: t.ruleHairline }]}>
            <View style={[styles.drawerHead, { borderBottomColor: t.ruleHairline, paddingTop: topPad(insets.top, 62) }]}>
              <Text style={[styles.drawerTitle, { color: t.inkStrong }]}>Filter feed</Text>
              <Pressable onPress={() => setDrawerOpen(false)} hitSlop={10}>
                <X size={18} color={t.inkMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.drawerBody} showsVerticalScrollIndicator={false}>
              <View style={styles.drawerSectionHead}>
                <MastheadMeta size={9.5} color={t.inkFaint} style={styles.drawerSectionLabel}>
                  WORKING GROUPS
                </MastheadMeta>
                <Pressable
                  onPress={() => onSetGroupIds(allGroupsOn ? [] : GROUPS.map((g) => g.id))}
                  hitSlop={8}
                >
                  <Text style={[styles.drawerAction, { color: t.brandGreen }]}>
                    {allGroupsOn ? 'None' : 'All'}
                  </Text>
                </Pressable>
              </View>

              {GROUPS.map((g) =>
                checkRow(
                  g.id,
                  groupIds.includes(g.id),
                  () => toggleGroup(g.id),
                  <View key="swatch" style={[styles.swatch, { backgroundColor: wgRule(t, g.cls) }]} />,
                  g.n,
                  String(g.threads.length)
                )
              )}

              <View style={[styles.drawerRule, { backgroundColor: t.ruleHairline }]} />

              <MastheadMeta size={9.5} color={t.inkFaint} style={styles.drawerSectionLabelSolo}>
                POST TYPE
              </MastheadMeta>
              {POST_TYPES.map((k) => {
                const kind = postTypeStyle(t, k);
                const TypeIcon = TYPE_ICON[k];
                return checkRow(
                  k,
                  types.includes(k),
                  () => toggleType(k),
                  <TypeIcon key="icon" size={14} color={kind.ink} />,
                  kind.label
                );
              })}

              <View style={[styles.drawerRule, { backgroundColor: t.ruleHairline }]} />

              <MastheadMeta size={9.5} color={t.inkFaint} style={styles.drawerSectionLabelSolo}>
                SORT BY
              </MastheadMeta>
              {SORTS.map((s) => {
                const on = s.id === sortId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSortId(s.id)}
                    style={({ pressed }) => [styles.drawerRow, pressed && { backgroundColor: t.surfacePage }]}
                  >
                    <View style={[styles.radio, { borderColor: on ? t.brandLeaf : t.ruleHairline }]}>
                      {on && <View style={[styles.radioDot, { backgroundColor: t.brandLeaf }]} />}
                    </View>
                    <Text style={[styles.drawerLabel, { color: on ? t.inkStrong : t.inkFaint }]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.drawerFoot, { borderTopColor: t.ruleHairline, paddingBottom: Math.max(insets.bottom, 18) }]}>
              <Pressable
                onPress={() => setDrawerOpen(false)}
                style={({ pressed }) => [
                  styles.applyBtn,
                  { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
                ]}
              >
                <Text style={styles.applyText}>Show {feed.length} posts</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  topBar: {
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  search: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchText: {
    fontFamily: sans(400),
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 32,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: mono(400),
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  feed: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 24,
  },
  card: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 32,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  typeChipText: {
    fontFamily: mono(400),
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupName: { flex: 1 },
  feedByline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 11,
  },
  feedBylineText: { flex: 1 },
  feedAuthor: {
    fontFamily: sans(600),
    fontSize: 13.5,
  },
  cardTitle: {
    marginTop: 11,
    fontFamily: sans(600),
    fontSize: 15.5,
    lineHeight: 20.5,
    letterSpacing: -0.33,
  },
  cardBody: {
    marginTop: 7,
    fontFamily: sans(400),
    fontSize: 13.5,
    lineHeight: 21.6,
  },
  seeMore: {
    fontFamily: sans(400),
    fontSize: 13,
  },
  feedPoll: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  feedPollOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  feedPollLabel: {
    fontFamily: sans(500),
    fontSize: 13,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
    paddingBottom: 9,
    borderBottomWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  feedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  feedActionText: {
    fontFamily: sans(500),
    fontSize: 12,
  },
  feedDisclaimer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    fontFamily: sans(400),
    fontSize: 10.5,
  },
  drawerWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    flexDirection: 'row',
  },
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,35,41,.42)',
  },
  drawer: {
    width: 300,
    borderRightWidth: 1,
  },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontFamily: sans(600),
    fontSize: 16,
    letterSpacing: trackDisplay(16),
  },
  drawerBody: {
    paddingTop: 14,
    paddingBottom: 20,
  },
  drawerSectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  drawerSectionLabel: { letterSpacing: 1.7 },
  drawerSectionLabelSolo: {
    letterSpacing: 1.7,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  drawerAction: {
    fontFamily: sans(400),
    fontSize: 11,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  drawerLabel: {
    flex: 1,
    fontFamily: sans(400),
    fontSize: 13,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 3,
    height: 15,
    borderRadius: 2,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  drawerRule: {
    height: 1,
    marginVertical: 14,
    marginHorizontal: 18,
  },
  drawerFoot: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  applyBtn: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontFamily: sans(600),
    fontSize: 13.5,
    color: '#fff',
  },
  detailBar: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  backText: {
    fontFamily: sans(500),
    fontSize: 14,
  },
  post: {
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    paddingVertical: 18,
    paddingRight: 20,
    paddingLeft: 17,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 32,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  kindLabel: {
    fontFamily: mono(400),
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kindState: {
    fontFamily: mono(400),
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  author: {
    fontFamily: sans(600),
    fontSize: 13.5,
  },
  postTitle: {
    marginTop: 12,
    fontFamily: sans(600),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: trackDisplay(17),
  },
  postBody: {
    marginTop: 10,
    fontFamily: sans(400),
    fontSize: 13.5,
    lineHeight: 21.6,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  attachmentBody: { flex: 1 },
  attachmentName: {
    fontFamily: sans(600),
    fontSize: 12.5,
  },
  poll: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  pollQRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollQ: {
    flex: 1,
    fontFamily: sans(600),
    fontSize: 13,
  },
  pollOptions: {
    gap: 7,
    marginTop: 11,
  },
  pollOption: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  pollFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  pollLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  pollLabel: { fontSize: 13 },
  pollPct: {
    fontFamily: sans(600),
    fontSize: 12,
  },
  pollMeta: { marginTop: 10 },
  repliesHead: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  reply: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  replyAvatar: { marginTop: 2 },
  replyBody: { flex: 1 },
  replyByline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    flexWrap: 'wrap',
  },
  replyAuthor: {
    fontFamily: sans(600),
    fontSize: 12.5,
  },
  replyText: {
    marginTop: 4,
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 20,
  },
  tail: { height: 16 },
  eventRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  eventChipText: {
    fontFamily: sans(400),
    fontSize: 11.5,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  rsvpBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpYes: {
    fontFamily: sans(600),
    fontSize: 13,
  },
  rsvpNo: {
    fontFamily: sans(500),
    fontSize: 13,
  },
  pollStats: {
    flexDirection: 'row',
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pollStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pollStatValue: {
    marginTop: 3,
    fontFamily: sans(600),
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionEnd: { marginLeft: 'auto' },
  actionText: {
    fontFamily: mono(400),
    fontSize: 11,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyActionText: {
    fontFamily: mono(400),
    fontSize: 10,
  },
  readOnly: {
    margin: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  readOnlyText: {
    fontFamily: sans(400),
    fontSize: 12,
    lineHeight: 19.2,
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
