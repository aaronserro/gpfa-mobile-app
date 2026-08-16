/**
 * Groups tab, level three: one post in full, with its discussion.
 *
 * Replies nest exactly one level: a reply that opens with an @mention of an
 * earlier top-level replier hangs under that reply. Anything else — including a
 * mention of someone already nested — stays at the top level, which is what the
 * design's own tree walk does.
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowBendUpLeft,
  ArrowFatUp,
  ArrowUp,
  BookmarkSimple,
  ChartBar,
  ChatCircle,
  CheckCircle,
  DownloadSimple,
  FileXls,
  ShareFat,
  X,
} from '../../ds/icons';
import { Avatar, Input, MastheadMeta, ScreenHeader } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, postTypeStyle, sans, trackDisplay } from '../../ds/tokens';
import { initials as initialsOf } from '../../lib/format';
import { AnchorAvatar, RoleBadge, TagChip, ROW_ICON, TYPE_ICON } from './parts';
import type { Reply, RsvpChoice, Thread } from '../../api/types';

/** One reply plus anything hanging under it. */
export interface ReplyNode {
  reply: Reply;
  /** Stable key for session state — the reply's own id, or its position. */
  key: string;
  children: ReplyNode[];
}

/** Group a flat reply list into the design's one-level tree. */
export function replyTree(threadId: string, replies: Reply[]): ReplyNode[] {
  const roots: ReplyNode[] = [];
  replies.forEach((reply, i) => {
    const node: ReplyNode = { reply, key: reply.id ?? `${threadId}:${i}`, children: [] };
    const mentioned = reply.mention?.slice(1).trim();
    const parent = mentioned ? roots.find((r) => r.reply.a === mentioned) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

export interface PostDetailProps {
  /** Shown as the back label. */
  groupName: string;
  post: Thread;
  /** Every reply on the post, including any added this session. */
  replies: Reply[];
  upvoted: boolean;
  onToggleUpvote: () => void;
  saved: boolean;
  onToggleSave: () => void;
  /** Keyed by `ReplyNode.key`. */
  replyUpvoted: Record<string, boolean | undefined>;
  onToggleReplyUpvote: (key: string, replyId: string | undefined) => void;
  /** Chosen option index; absent means this member has not voted. */
  vote: number | undefined;
  onVote: (option: number) => void;
  rsvp: RsvpChoice | undefined;
  onRsvp: (choice: RsvpChoice) => void;
  /** `mention` is the name to prefix, when the member replied to someone. */
  onReply: (text: string, mention: string | null) => void;
  onBack: () => void;
}

export default function PostDetail({
  groupName,
  post,
  replies,
  upvoted,
  onToggleUpvote,
  saved,
  onToggleSave,
  replyUpvoted,
  onToggleReplyUpvote,
  vote,
  onVote,
  rsvp,
  onRsvp,
  onReply,
  onBack,
}: PostDetailProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);

  const type = post.type ?? 'discussion';
  const kind = postTypeStyle(t, type);
  const TypeIcon = TYPE_ICON[type];
  const isAnnouncement = type === 'announcement';

  const voted = vote !== undefined;
  const counts = post.poll?.options.map((o, i) => o.votes + (vote === i ? 1 : 0)) ?? [];
  const total = counts.reduce((a, b) => a + b, 0);

  const roots = replyTree(post.id, replies);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onReply(text, replyTarget);
    setDraft('');
    setReplyTarget(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={groupName}
        onBack={onBack}
        backLabel={`Back to ${groupName}`}
        actions={
          <View style={styles.topActions}>
            <Pressable onPress={onToggleSave} accessibilityRole="button" hitSlop={8}>
              <BookmarkSimple
                size={19}
                weight={saved ? 'fill' : 'regular'}
                color={saved ? t.brandGreenOnDark : '#fff'}
              />
            </Pressable>
            <ShareFat size={19} color="#fff" />
          </View>
        }
      />

      <ScrollView style={styles.fill} showsVerticalScrollIndicator={false}>
        {/* The left rule and chip take the post type's colour, not the group's. */}
        <View
          style={[
            styles.post,
            {
              backgroundColor: t.surfacePaper,
              borderBottomColor: t.ruleHairline,
              borderLeftColor: kind.ink,
            },
          ]}
        >
          <View style={styles.kindRow}>
            <View style={[styles.kindChip, { backgroundColor: kind.chipBg, borderColor: kind.chipBd }]}>
              <TypeIcon size={12} color={kind.ink} />
              <Text style={[styles.kindLabel, { color: kind.ink }]}>{kind.label}</Text>
            </View>
            {!!post.state && (
              <Text style={[styles.kindState, { color: t.inkFaint }]}>
                {post.state}
              </Text>
            )}
          </View>

          <Text style={[styles.postTitle, { color: t.inkStrong }]}>{post.title}</Text>

          <View style={styles.byline}>
            <AnchorAvatar initials={post.initials ?? initialsOf(post.author)} size={36} />
            <View>
              <View style={styles.bylineTop}>
                <Text style={[styles.author, { color: t.inkStrong }]}>{post.author}</Text>
                <RoleBadge>Author</RoleBadge>
              </View>
              <MastheadMeta size={10} style={styles.bylineMeta}>
                {`${post.org} · ${post.time}`}
              </MastheadMeta>
            </View>
          </View>

          <Text style={[styles.postBody, { color: t.inkBody }]}>{post.body}</Text>

          {!!post.file && (
            <Pressable
              style={({ pressed }) => [
                styles.attachment,
                {
                  borderColor: pressed ? t.ruleStrong : t.ruleHairline,
                  backgroundColor: t.surfacePage,
                },
              ]}
            >
              <FileXls size={22} color={t.brandGreen} />
              <View style={styles.flex}>
                <Text style={[styles.attachmentName, { color: t.inkStrong }]}>{post.file}</Text>
                <MastheadMeta size={9.5}>{post.fileMeta}</MastheadMeta>
              </View>
              <DownloadSimple size={17} color={t.inkFaint} />
            </Pressable>
          )}

          {!!post.eventRows && (
            <>
              <View style={styles.eventRows}>
                {post.eventRows.map((e) => {
                  const RIcon = ROW_ICON[e.icon];
                  return (
                    <View
                      key={e.text}
                      style={[
                        styles.eventChip,
                        { borderColor: t.ruleHairline, backgroundColor: t.surfacePage },
                      ]}
                    >
                      <RIcon size={13} color={t.inkMuted} />
                      <Text style={[styles.eventChipText, { color: t.inkBody }]}>{e.text}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.rsvpRow}>
                <Pressable
                  onPress={() => onRsvp('yes')}
                  style={[
                    styles.rsvpBtn,
                    {
                      borderColor: t.brandGreen,
                      backgroundColor: rsvp === 'yes' ? t.brandGreen : t.surfacePaper,
                    },
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
                  onPress={() => onRsvp('no')}
                  style={[
                    styles.rsvpBtn,
                    {
                      borderColor: t.ruleHairline,
                      backgroundColor: rsvp === 'no' ? t.surfaceSoft : t.surfacePaper,
                    },
                  ]}
                >
                  <Text style={[styles.rsvpNo, { color: t.inkBody }]}>Can&apos;t attend</Text>
                </Pressable>
              </View>
            </>
          )}

          {!!post.poll && (
            <>
              <View style={[styles.poll, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
                <View style={styles.pollQRow}>
                  <ChartBar size={15} color={t.brandAmber} />
                  <Text style={[styles.pollQ, { color: t.inkStrong }]}>{post.poll.q}</Text>
                </View>
                <View style={styles.pollOptions}>
                  {post.poll.options.map((o, i) => {
                    const chosen = vote === i;
                    const pct = voted && total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                    return (
                      <Pressable
                        key={o.label}
                        onPress={() => onVote(i)}
                        style={[
                          styles.pollOption,
                          {
                            borderColor: chosen ? t.brandGreen : t.ruleHairline,
                            backgroundColor: t.surfacePaper,
                          },
                        ]}
                      >
                        {voted && (
                          <View
                            style={[
                              styles.pollFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: chosen
                                  ? t.brandGreenSoft
                                  : alpha(t.surfaceSoft, 0.6),
                              },
                            ]}
                          />
                        )}
                        <View style={styles.pollLabelRow}>
                          <Text
                            style={[
                              styles.pollLabel,
                              { color: t.inkStrong, fontFamily: sans(chosen ? 600 : 500) },
                            ]}
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
                  {(voted ? `${total} votes · ` : '') + post.poll.closes}
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
                    <MastheadMeta size={9.5}>{stat.k}</MastheadMeta>
                    <Text style={[styles.pollStatValue, { color: t.inkStrong }]}>{stat.v}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {!!post.tags?.length && (
            <View style={styles.tags}>
              {post.tags.map((tag) => (
                <TagChip key={tag} label={tag} size={11} height={22} />
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={onToggleUpvote} hitSlop={6}>
              <ArrowFatUp
                size={15}
                weight={upvoted ? 'fill' : 'regular'}
                color={upvoted ? t.brandLeaf : t.inkMuted}
              />
              <Text style={[styles.actionText, { color: upvoted ? t.brandLeaf : t.inkMuted }]}>
                {(post.upvotes ?? 0) + (upvoted ? 1 : 0)}
              </Text>
            </Pressable>
            <View style={styles.action}>
              <ChatCircle size={15} color={t.inkMuted} />
              <Text style={[styles.actionText, { color: t.inkMuted }]}>{replies.length}</Text>
            </View>
            <Pressable style={[styles.action, styles.actionEnd]} onPress={onToggleSave} hitSlop={6}>
              <BookmarkSimple
                size={15}
                weight={saved ? 'fill' : 'regular'}
                color={saved ? t.brandGreenStrong : t.inkMuted}
              />
              <Text
                style={[styles.actionText, { color: saved ? t.brandGreenStrong : t.inkMuted }]}
              >
                {saved ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>

        {isAnnouncement ? (
          <View style={[styles.readOnly, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
            <Text style={[styles.readOnlyText, { color: t.inkMuted }]}>
              Announcements are read-only. Reply in the linked discussion thread if you have
              questions for the co-leads.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.discussionHead}>
              <Text style={[styles.discussionLabel, { color: t.inkMuted }]}>DISCUSSION</Text>
              <View style={[styles.discussionCount, { backgroundColor: t.surfaceSoft }]}>
                <Text style={[styles.discussionCountText, { color: t.inkMuted }]}>
                  {replies.length}
                </Text>
              </View>
            </View>

            {roots.length === 0 && (
              <Text style={[styles.noReplies, { color: t.inkMuted }]}>
                No replies yet — {post.author} is waiting to hear from the group.
              </Text>
            )}

            {roots.map((node) => (
              <View
                key={node.key}
                style={[styles.reply, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}
              >
                <View style={styles.replyRow}>
                  <AnchorAvatar
                    initials={node.reply.initials ?? initialsOf(node.reply.a)}
                    size={26}
                  />
                  <View style={styles.flex}>
                    <ReplyBody
                      node={node}
                      upvoted={!!replyUpvoted[node.key]}
                      onToggleUpvote={() => onToggleReplyUpvote(node.key, node.reply.id)}
                      onReplyTo={() => setReplyTarget(node.reply.a)}
                    />

                    {node.children.map((child) => (
                      <View key={child.key} style={styles.childWrap}>
                        <View style={[styles.childRule, { backgroundColor: t.ruleHairline }]} />
                        <View style={styles.childRow}>
                          <Avatar
                            initials={child.reply.initials ?? initialsOf(child.reply.a)}
                            size={24}
                            style={styles.childAvatar}
                          />
                          <View style={styles.flex}>
                            <ReplyBody
                              node={child}
                              nested
                              upvoted={!!replyUpvoted[child.key]}
                              onToggleUpvote={() => onToggleReplyUpvote(child.key, child.reply.id)}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.tail} />
          </>
        )}
      </ScrollView>

      {!isAnnouncement && (
        <View
          style={[
            styles.composer,
            {
              borderTopColor: t.ruleHairline,
              backgroundColor: t.surfacePaper,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {!!replyTarget && (
            <View style={[styles.targetChip, { backgroundColor: alpha(t.surfaceAnchor, 0.08) }]}>
              <ArrowBendUpLeft size={13} color={t.brandGreen} />
              <Text style={[styles.targetText, { color: t.inkMuted }]}>
                Replying to {replyTarget}
              </Text>
              <Pressable onPress={() => setReplyTarget(null)} hitSlop={8} accessibilityLabel="Clear reply target">
                <X size={13} color={t.inkMuted} />
              </Pressable>
            </View>
          )}
          <View style={styles.composerRow}>
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
              style={({ pressed }) => [
                styles.send,
                { backgroundColor: pressed ? t.brandGreenStrong : t.brandGreen },
              ]}
            >
              <ArrowUp size={18} color={t.primaryForeground} />
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Byline, text and actions for a reply — identical at both levels bar the sizes. */
function ReplyBody({
  node,
  nested = false,
  upvoted,
  onToggleUpvote,
  onReplyTo,
}: {
  node: ReplyNode;
  nested?: boolean;
  upvoted: boolean;
  onToggleUpvote: () => void;
  /** Absent on a nested reply — the design only offers Reply at the top level. */
  onReplyTo?: () => void;
}) {
  const { t } = useTheme();
  const r = node.reply;
  return (
    <>
      <View style={styles.replyByline}>
        <Text
          style={[
            nested ? styles.childAuthor : styles.replyAuthor,
            { color: t.inkStrong },
          ]}
        >
          {r.a}
        </Text>
        <MastheadMeta size={9.5}>
          {`${r.org} · ${r.time}`}
        </MastheadMeta>
      </View>
      <Text style={[nested ? styles.childText : styles.replyText, { color: t.inkBody }]}>
        {!!r.mention && <Text style={{ color: t.brandBlue, fontFamily: sans(600) }}>{r.mention} </Text>}
        {r.text}
      </Text>
      <View style={[styles.replyActions, nested && styles.childActions]}>
        <Pressable style={styles.replyAction} onPress={onToggleUpvote} hitSlop={6}>
          <ArrowFatUp
            size={nested ? 12 : 13}
            weight={upvoted ? 'fill' : 'regular'}
            color={upvoted ? t.brandLeaf : t.inkFaint}
          />
          <Text style={[styles.replyActionText, { color: upvoted ? t.brandLeaf : t.inkFaint }]}>
            {(r.up ?? 0) + (upvoted ? 1 : 0)}
          </Text>
        </Pressable>
        {!!onReplyTo && (
          <Pressable style={styles.replyAction} onPress={onReplyTo} hitSlop={6}>
            <ArrowBendUpLeft size={13} color={t.inkFaint} />
            <Text style={[styles.replyActionText, { color: t.inkFaint }]}>Reply</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },

  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 6,
  },

  post: {
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    paddingVertical: 18,
    paddingRight: 20,
    paddingLeft: 17,
  },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kindState: {
    fontFamily: mono(400),
    fontSize: 10,
    letterSpacing: 0.5,
  },
  postTitle: {
    marginTop: 12,
    fontFamily: sans(600),
    fontSize: 21,
    lineHeight: 25.2,
    letterSpacing: trackDisplay(21),
  },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  bylineTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bylineMeta: { marginTop: 1 },
  author: { fontFamily: sans(600), fontSize: 13.5 },
  postBody: { marginTop: 12, fontFamily: sans(400), fontSize: 14, lineHeight: 23.8 },

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
  attachmentName: { fontFamily: sans(600), fontSize: 12.5 },

  eventRows: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  eventChipText: { fontFamily: sans(400), fontSize: 11.5 },
  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  rsvpBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpYes: { fontFamily: sans(600), fontSize: 13 },
  rsvpNo: { fontFamily: sans(500), fontSize: 13 },

  poll: { marginTop: 14, borderWidth: 1, borderRadius: 8, padding: 14 },
  pollQRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pollQ: { flex: 1, fontFamily: sans(600), fontSize: 13 },
  pollOptions: { gap: 7, marginTop: 11 },
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
  pollFill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  pollLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  pollLabel: { fontSize: 13 },
  pollPct: { fontFamily: sans(600), fontSize: 12 },
  pollMeta: { marginTop: 10 },
  pollStats: { flexDirection: 'row', marginTop: 14, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  pollStat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  pollStatValue: { marginTop: 3, fontFamily: sans(600), fontSize: 14 },

  tags: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionEnd: { marginLeft: 'auto' },
  actionText: { fontFamily: mono(400), fontSize: 11 },

  readOnly: {
    marginTop: 16,
    marginBottom: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  readOnlyText: { fontFamily: sans(400), fontSize: 12, lineHeight: 19.2 },

  discussionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  discussionLabel: { fontFamily: sans(600), fontSize: 10, letterSpacing: 1.8 },
  discussionCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 32,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discussionCountText: { fontFamily: mono(400), fontSize: 10 },
  noReplies: {
    paddingTop: 6,
    paddingBottom: 20,
    paddingHorizontal: 20,
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 20.8,
  },

  reply: { borderTopWidth: 1, paddingVertical: 13, paddingHorizontal: 20 },
  replyRow: { flexDirection: 'row', gap: 10 },
  replyByline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 7 },
  replyAuthor: { fontFamily: sans(600), fontSize: 12.5 },
  replyText: { marginTop: 4, fontFamily: sans(400), fontSize: 13, lineHeight: 20.15 },
  replyActions: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 14 },
  replyAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyActionText: { fontFamily: mono(400), fontSize: 10 },

  childWrap: { marginTop: 12, flexDirection: 'row', gap: 12 },
  childRule: { width: 1 },
  childRow: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 9 },
  childAvatar: { marginTop: 2 },
  childAuthor: { fontFamily: sans(600), fontSize: 12 },
  childText: { marginTop: 4, fontFamily: sans(400), fontSize: 12.5, lineHeight: 19.4 },
  childActions: { marginTop: 6 },

  tail: { height: 16 },

  composer: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 16 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  composerInput: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontSize: 13.5 },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  targetText: { flex: 1, fontFamily: sans(400), fontSize: 11 },
});
