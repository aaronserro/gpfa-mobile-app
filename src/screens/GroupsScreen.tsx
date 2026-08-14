import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowBendUpLeft,
  ArrowFatUp,
  ArrowUp,
  BookmarkSimple,
  CalendarDots,
  CaretLeft,
  ChartBar,
  ChartLineUp,
  ChatCircle,
  CheckCircle,
  DownloadSimple,
  FileXls,
  MapPin,
  Megaphone,
  Plus,
  Repeat,
  SlidersHorizontal,
  UsersThree,
} from '../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Eyebrow, Input, MastheadMeta } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, postTypeStyle, sans, topPad, trackDisplay } from '../ds/tokens';
import { GROUPS, initials, type PostType, type Reply } from '../data/portal';

export type RsvpChoice = 'yes' | 'no';

/** Filter-sheet axes from the design's listVals(). */
const TYPE_FILTERS = ['All', 'Discussion', 'Poll', 'Event', 'Announcement'] as const;
const SORTS = ['Newest', 'Most commented', 'Most upvoted'] as const;
type SortKey = (typeof SORTS)[number];

/** The filter chips are Capitalised labels; post types are lowercase keys. */
const postTypeLabel = (type: PostType | undefined): string => {
  const key = type ?? 'discussion';
  return key.charAt(0).toUpperCase() + key.slice(1);
};

export interface GroupsScreenProps {
  groupIndex: number;
  onPickGroup: (index: number) => void;
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
}

export default function GroupsScreen({
  groupIndex,
  onPickGroup,
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
}: GroupsScreenProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sort, setSort] = useState<SortKey>('Newest');

  const group = GROUPS[groupIndex];
  const thread = threadId ? GROUPS.flatMap((g) => g.threads).find((x) => x.id === threadId) : null;

  const repliesFor = (id: string): Reply[] => {
    const base = GROUPS.flatMap((g) => g.threads).find((x) => x.id === id)?.replies ?? [];
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

    const TypeIcon = {
      discussion: ChatCircle,
      poll: ChartLineUp,
      announcement: Megaphone,
      event: CalendarDots,
    }[type];
    const RowIcon = { calendar: CalendarDots, pin: MapPin, people: UsersThree };

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
            <Text style={[styles.backText, { color: t.brandGreen }]}>{group.n}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.fill} showsVerticalScrollIndicator={false}>
          {/* The left rule and chip take the post type's colour, not the group's. */}
          <View
            style={[
              styles.post,
              { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline, borderLeftColor: kind.rule },
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
                    const RIcon = RowIcon[e.icon];
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

  /* ── group feed ──────────────────────────────────────────────────────── */
  // The design accents the last word of the group name: "Collateral & Liquidity."
  const words = group.n.split(' ');
  const lead = words.slice(0, -1).join(' ');
  const tail = words[words.length - 1];

  const visible =
    typeFilter === 'All'
      ? [...group.threads]
      : group.threads.filter((th) => postTypeLabel(th.type) === typeFilter);

  if (sort === 'Most commented') {
    visible.sort((a, b) => repliesFor(b.id).length - repliesFor(a.id).length);
  } else if (sort === 'Most upvoted') {
    visible.sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
  }

  const filterLabel = `${typeFilter === 'All' ? 'All posts' : typeFilter} · ${sort}`;

  const chipRow = (options: readonly string[], active: string, onPick: (v: string) => void) => (
    <View style={styles.sheetChips}>
      {options.map((label) => {
        const on = label === active;
        return (
          <Pressable
            key={label}
            onPress={() => onPick(label)}
            style={[
              styles.sheetChip,
              {
                backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                borderColor: on ? t.surfaceAnchor : t.ruleHairline,
              },
            ]}
          >
            <Text style={[styles.sheetChipText, { color: on ? t.inkInverse : t.inkMuted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.feedHeader,
          { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline, paddingTop: topPad(insets.top, 66) },
        ]}
      >
        <Text style={[styles.feedTitle, { color: t.inkStrong }]}>
          {lead}
          {lead ? ' ' : ''}
          <Text style={{ color: t.brandGreen }}>{tail}.</Text>
        </Text>
        <MastheadMeta size={10} style={styles.feedMeta}>
          MEMBER-LED · {group.meta.toUpperCase()}
        </MastheadMeta>
      </View>

      <View style={styles.composeRow}>
        <View style={[styles.composeBox, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <View style={[styles.composePlus, { backgroundColor: t.surfaceAnchor }]}>
            <Plus size={14} color="#fff" />
          </View>
          <Text style={[styles.composeText, { color: t.inkMuted }]}>
            Add a discussion, announcement, event, or poll
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <MastheadMeta size={10} style={styles.filterLabel}>
          {filterLabel.toUpperCase()}
        </MastheadMeta>
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={[styles.filterBtn, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}
        >
          <SlidersHorizontal size={14} color={t.brandGreen} />
          <Text style={[styles.filterBtnText, { color: t.brandGreen }]}>Filter</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
        {visible.map((th) => {
          const replies = repliesFor(th.id);
          const kind = postTypeStyle(t, th.type ?? 'discussion');
          // The design's stacked avatars are the repliers, so derive them.
          const stack = replies.slice(0, 3).map((r) => r.initials ?? initials(r.a));
          return (
            <Pressable
              key={th.id}
              onPress={() => onOpenThread(th.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: t.surfacePaper,
                  borderColor: t.ruleHairline,
                  borderLeftColor: kind.rule,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.cardHead}>
                <Avatar initials={th.initials ?? initials(th.author)} size={24} />
                <View style={[styles.typePill, { backgroundColor: kind.chipBg }]}>
                  <Text style={[styles.typePillText, { color: kind.ink }]}>{kind.label}</Text>
                </View>
                <MastheadMeta size={9.5} style={styles.cardMeta}>
                  {th.author} · {th.org} · {th.time}
                </MastheadMeta>
              </View>

              <Text style={[styles.cardTitle, { color: t.inkStrong }]}>{th.title}</Text>
              <Text style={[styles.cardBody, { color: t.inkBody }]} numberOfLines={3}>
                {th.body}
              </Text>

              {!!th.feedStatus && (
                <MastheadMeta size={9} color={kind.ink} style={styles.cardStatus}>
                  {th.feedStatus}
                </MastheadMeta>
              )}

              {!!th.tags?.length && (
                <View style={styles.tagRow}>
                  {th.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: t.surfaceSoft }]}>
                      <Text style={[styles.tagText, { color: t.inkStrong }]}># {tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.cardFoot, { borderTopColor: t.ruleHairline }]}>
                <View style={[styles.upPill, { borderColor: t.ruleHairline }]}>
                  <ArrowUp size={13} color={t.inkMuted} />
                  <Text style={[styles.upCount, { color: t.inkBody }]}>{th.upvotes ?? 0}</Text>
                </View>
                <View style={styles.footStat}>
                  <ChatCircle size={13} color={t.inkFaint} />
                  <Text style={[styles.footStatText, { color: t.inkMuted }]}>{replies.length} comments</Text>
                </View>
                <View style={styles.footStat}>
                  <Repeat size={13} color={t.inkFaint} />
                  <Text style={[styles.footStatText, { color: t.inkMuted }]}>Repost {th.reposts ?? 0}</Text>
                </View>
                <View style={styles.footSpacer} />
                <View style={styles.stack}>
                  {stack.map((ini, i) => (
                    <View
                      key={`${ini}-${i}`}
                      style={[
                        styles.stackAvatar,
                        {
                          backgroundColor: t.surfaceSoft,
                          borderColor: t.surfacePaper,
                          marginLeft: i === 0 ? 0 : -6,
                        },
                      ]}
                    >
                      <Text style={[styles.stackText, { color: t.inkMuted }]}>{ini}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.feedDisclaimer, { color: t.inkFaint }]}>
          Content reflects member discussion and is not investment advice.
        </Text>
      </ScrollView>

      {sheetOpen && (
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetScrim} onPress={() => setSheetOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}>
            <View style={[styles.sheetGrabber, { backgroundColor: t.ruleHairline }]} />
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: t.inkStrong }]}>Filter &amp; sort</Text>
              <Pressable onPress={() => setSheetOpen(false)} hitSlop={8}>
                <Text style={[styles.sheetDone, { color: t.brandGreen }]}>Done</Text>
              </Pressable>
            </View>

            <Eyebrow size={10} style={styles.sheetLabel}>
              Post type
            </Eyebrow>
            {chipRow(TYPE_FILTERS, typeFilter, setTypeFilter)}

            <Eyebrow size={10} style={styles.sheetLabelTop}>
              Sort by
            </Eyebrow>
            {chipRow(SORTS, sort, (v) => setSort(v as SortKey))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  feedHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  feedTitle: {
    marginTop: 4,
    fontFamily: sans(600),
    fontSize: 22,
    lineHeight: 24.2,
    letterSpacing: trackDisplay(22),
  },
  feedMeta: { marginTop: 6 },
  composeRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  composeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  composePlus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeText: {
    flex: 1,
    fontFamily: sans(400),
    fontSize: 12.5,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  filterLabel: { flex: 1, letterSpacing: 1.2 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 32,
  },
  filterBtnText: {
    fontFamily: mono(400),
    fontSize: 10,
    letterSpacing: 0.74,
    textTransform: 'uppercase',
  },
  feed: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typePill: {
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 32,
  },
  typePillText: {
    fontFamily: mono(400),
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardMeta: { flex: 1 },
  cardTitle: {
    marginTop: 10,
    fontFamily: sans(600),
    fontSize: 14.5,
    lineHeight: 19.5,
    letterSpacing: -0.3,
  },
  cardBody: {
    marginTop: 6,
    fontFamily: sans(400),
    fontSize: 12.5,
    lineHeight: 19,
  },
  cardStatus: { marginTop: 8, letterSpacing: 0.6 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 32,
  },
  tagText: {
    fontFamily: mono(400),
    fontSize: 9,
    letterSpacing: 0.4,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
  },
  upPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 32,
  },
  upCount: {
    fontFamily: sans(600),
    fontSize: 11.5,
  },
  footStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
  },
  footStatText: {
    fontFamily: sans(400),
    fontSize: 11.5,
  },
  footSpacer: { flex: 1 },
  stack: { flexDirection: 'row' },
  stackAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackText: {
    fontFamily: sans(600),
    fontSize: 8.5,
  },
  feedDisclaimer: {
    paddingTop: 6,
    paddingBottom: 4,
    fontFamily: sans(400),
    fontSize: 10.5,
  },
  sheetWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    justifyContent: 'flex-end',
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,35,41,.42)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: sans(600),
    fontSize: 15,
    letterSpacing: trackDisplay(15),
  },
  sheetDone: {
    fontFamily: mono(400),
    fontSize: 10,
    letterSpacing: 0.74,
    textTransform: 'uppercase',
  },
  sheetLabel: { marginTop: 16, marginBottom: 8 },
  sheetLabelTop: { marginTop: 18, marginBottom: 8 },
  sheetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 32,
  },
  sheetChipText: {
    fontFamily: mono(400),
    fontSize: 10.5,
    letterSpacing: 0.74,
    textTransform: 'uppercase',
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
