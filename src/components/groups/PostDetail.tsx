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
  CalendarDots,
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
import type { Poll, PostType, Reply, RsvpChoice, Thread } from '../../api/types';

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
  summary?: string;
  summarizing?: boolean;
  onSummarize?: () => void;
  onUpdate?: (input: { title?: string; body?: string }) => void;
  onDelete?: () => void;
  onChangeStatus?: (status: 'open' | 'answered' | 'closed') => void;
  upvoted: boolean;
  onToggleUpvote: () => void;
  saved: boolean;
  onToggleSave: () => void;
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
  summary,
  summarizing = false,
  onSummarize,
  onUpdate,
  onDelete,
  onChangeStatus,
  upvoted,
  onToggleUpvote,
  saved,
  onToggleSave,
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
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);

  const type = post.type ?? 'discussion';
  const kind = postTypeStyle(t, type);
  const TypeIcon = TYPE_ICON[type];
  const isAnnouncement = type === 'announcement';
  const isEvent = type === 'event';
  const hasStructuredDetailCard = isAnnouncement || isEvent;

  const voted = vote !== undefined;
  const counts = post.poll?.options.map((o, i) => o.votes + (vote === i ? 1 : 0)) ?? [];
  const total = counts.reduce((a, b) => a + b, 0);

  const roots = replyTree(post.id, replies);
  const canReply = post.canReply ?? !isAnnouncement;
  const canEdit = !!post.canEdit && !!onUpdate;
  const canDelete = !!post.canDelete && !!onDelete;
  const canChangeStatus = !!post.canChangeStatus && !!onChangeStatus;

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
        <View
          style={[
            styles.post,
            {
              backgroundColor: t.surfacePaper,
              borderBottomColor: t.ruleHairline,
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

          {editing ? (
            <View style={styles.editPanel}>
              <Input value={editTitle} onChangeText={setEditTitle} style={styles.editInput} />
              <Input
                value={editBody}
                onChangeText={setEditBody}
                multiline
                textAlignVertical="top"
                style={[styles.editInput, styles.editTextarea]}
              />
              <View style={styles.manageRow}>
                <Pressable
                  onPress={() => {
                    onUpdate?.({ title: editTitle.trim(), body: editBody.trim() });
                    setEditing(false);
                  }}
                  style={[styles.manageBtn, { backgroundColor: t.surfaceAnchor, borderColor: t.surfaceAnchor }]}
                >
                  <Text style={styles.manageBtnOnText}>Save changes</Text>
                </Pressable>
                <Pressable
                  onPress={() => setEditing(false)}
                  style={[styles.manageBtn, { borderColor: t.ruleHairline }]}
                >
                  <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.postTitle, { color: t.inkStrong }]}>{post.title}</Text>

              {hasStructuredDetailCard ? (
                <TypeDetailCard groupName={groupName} post={post} type={type} />
              ) : (
                <Text style={[styles.postBody, { color: t.inkBody }]}>{post.body}</Text>
              )}
            </>
          )}

          {!hasStructuredDetailCard && (
            <View style={[styles.byline, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
              <AnchorAvatar initials={post.initials ?? initialsOf(post.author)} size={34} />
              <View style={styles.flex}>
                <View style={styles.bylineTop}>
                  <Text style={[styles.author, { color: t.inkStrong }]}>{post.author}</Text>
                  <RoleBadge>Author</RoleBadge>
                </View>
                <MastheadMeta size={10} style={styles.bylineMeta}>
                  {`${post.org} · ${post.time}`}
                </MastheadMeta>
              </View>
            </View>
          )}

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
              <View
                style={[
                  styles.eventRows,
                  {
                    borderColor: t.ruleHairline,
                    backgroundColor: post.lifecycle === 'closed' ? 'transparent' : alpha(t.surfaceSoft, 0.45),
                  },
                ]}
              >
                <CalendarDots size={14} color={t.inkMuted} />
                {post.eventRows.map((e) => {
                  const RIcon = ROW_ICON[e.icon];
                  return (
                    <View
                      key={e.text}
                      style={[
                        styles.eventChip,
                        { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper },
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
              <PollFilePanel
                groupName={groupName}
                poll={post.poll}
                total={total}
                answered={voted}
                status={post.lifecycle === 'closed' ? 'Closed' : 'Open'}
              />

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
            <Pressable style={[styles.action, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]} onPress={onToggleUpvote} hitSlop={6}>
              <ArrowFatUp
                size={15}
                weight={upvoted ? 'fill' : 'regular'}
                color={upvoted ? t.brandLeaf : t.inkMuted}
              />
              <Text style={[styles.actionText, { color: upvoted ? t.brandLeaf : t.inkMuted }]}>
                {(post.upvotes ?? 0) + (upvoted ? 1 : 0)}
              </Text>
            </Pressable>
            <View style={[styles.action, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
              <ChatCircle size={15} color={t.inkMuted} />
              <Text style={[styles.actionText, { color: t.inkMuted }]}>{replies.length}</Text>
            </View>
            <Pressable style={[styles.action, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]} onPress={onToggleSave} hitSlop={6}>
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

          <View style={styles.manageRow}>
            {!!onSummarize && (
              <Pressable
                onPress={onSummarize}
                disabled={summarizing}
                style={[styles.manageBtn, { borderColor: t.ruleHairline }]}
              >
                <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>{summarizing ? 'Summarizing...' : 'Summarize'}</Text>
              </Pressable>
            )}
            {canEdit && (
              <Pressable onPress={() => setEditing(true)} style={[styles.manageBtn, { borderColor: t.ruleHairline }]}>
                <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>Edit</Text>
              </Pressable>
            )}
            {canDelete && (
              <Pressable onPress={onDelete} style={[styles.manageBtn, { borderColor: t.ruleHairline }]}>
                <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>Delete</Text>
              </Pressable>
            )}
          </View>

          {canChangeStatus && (
            <View style={styles.statusRow}>
              {(['open', 'answered', 'closed'] as const).map((status) => (
                <Pressable
                  key={status}
                  onPress={() => onChangeStatus?.(status)}
                  style={[styles.statusBtn, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}
                >
                  <Text style={[styles.statusText, { color: t.inkMuted }]}>{status}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!!summary && (
            <View style={[styles.summaryCard, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
              <Text style={[styles.summaryTitle, { color: t.inkStrong }]}>Summary</Text>
              <Text style={[styles.summaryText, { color: t.inkMuted }]}>{summary}</Text>
            </View>
          )}
        </View>

        {!canReply ? (
          <View style={[styles.readOnly, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
            <Text style={[styles.readOnlyText, { color: t.inkMuted }]}>
              Replies are closed for this post.
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

      {canReply && (
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
  onReplyTo,
}: {
  node: ReplyNode;
  nested?: boolean;
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

function TypeDetailCard({
  groupName,
  post,
  type,
}: {
  groupName: string;
  post: Thread;
  type: Extract<PostType, 'announcement' | 'event'>;
}) {
  const { t } = useTheme();
  const kind = postTypeStyle(t, type);
  const TypeIcon = TYPE_ICON[type];
  const noun = type === 'announcement' ? 'notice' : 'event';
  const sectionLabel = type === 'announcement' ? 'Announcement' : 'About this event';

  return (
    <View style={[styles.typeDetailCard, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      <View style={[styles.typeDetailHeader, { borderBottomColor: t.ruleHairline }]}>
        <View style={[styles.typeIconTile, { backgroundColor: kind.chipBg }]}>
          <TypeIcon size={20} color={kind.ink} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.typeDetailEyebrow, { color: t.inkMuted }]}>
            {`${groupName} ${noun}`}
          </Text>
          <View style={styles.typeDetailByline}>
            <Text style={[styles.typeDetailBylineText, { color: t.inkMuted }]}>{post.author}</Text>
            <Text style={[styles.typeDetailDot, { color: t.inkFaint }]}>·</Text>
            <Text style={[styles.typeDetailBylineText, { color: t.inkMuted }]}>{post.org}</Text>
            <Text style={[styles.typeDetailDot, { color: t.inkFaint }]}>·</Text>
            <Text style={[styles.typeDetailBylineText, { color: t.inkMuted }]}>{post.time}</Text>
          </View>
        </View>
      </View>

      {!!post.body && (
        <View style={styles.typeDetailBodyWrap}>
          <Text style={[styles.typeDetailSectionLabel, { color: t.inkMuted }]}>{sectionLabel}</Text>
          <Text style={[styles.typeDetailBody, { color: type === 'event' ? t.inkStrong : t.inkMuted }]}>
            {post.body}
          </Text>
        </View>
      )}
    </View>
  );
}

function PollFilePanel({
  groupName,
  poll,
  total,
  answered,
  status,
}: {
  groupName: string;
  poll: Poll;
  total: number;
  answered: boolean;
  status: string;
}) {
  const { t } = useTheme();
  const kind = postTypeStyle(t, 'poll');
  const facts = [
    { k: 'Questions', v: '1' },
    { k: 'Responses', v: String(total) },
    { k: 'Status', v: status },
    { k: status === 'Closed' ? 'Closed' : 'Closes', v: poll.closes },
  ];

  return (
    <View style={[styles.pollFile, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      <View style={[styles.pollFileHeader, { borderBottomColor: t.ruleHairline }]}>
        <View style={[styles.typeIconTile, { backgroundColor: kind.chipBg }]}>
          <ChartBar size={20} color={kind.ink} />
        </View>
        <View style={styles.flex}>
          <View style={styles.pollFileTitleRow}>
            <Text style={[styles.typeDetailEyebrow, { color: t.inkMuted }]}>Poll file</Text>
            {answered && <CheckCircle size={14} weight="fill" color={t.brandLeaf} />}
          </View>
          <Text style={[styles.pollFileGroup, { color: t.inkStrong }]}>{groupName}</Text>
        </View>
      </View>

      <View style={styles.pollFileGrid}>
        {facts.map((fact, index) => (
          <View
            key={`${fact.k}:${index}`}
            style={[
              styles.pollFileStat,
              { borderColor: t.ruleHairline },
              index % 2 === 1 && styles.pollFileStatRight,
            ]}
          >
            <Text style={[styles.pollFileStatKey, { color: t.inkMuted }]}>{fact.k}</Text>
            <Text style={[styles.pollFileStatValue, { color: t.inkStrong }]} numberOfLines={2}>
              {fact.v}
            </Text>
          </View>
        ))}
      </View>
    </View>
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
    paddingVertical: 18,
    paddingRight: 20,
    paddingLeft: 20,
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
    marginTop: 13,
    fontFamily: sans(600),
    fontSize: 22,
    lineHeight: 27.5,
    letterSpacing: trackDisplay(22),
  },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, borderWidth: 1, borderRadius: 8, padding: 10 },
  bylineTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bylineMeta: { marginTop: 1 },
  author: { fontFamily: sans(600), fontSize: 13.5 },
  postBody: { marginTop: 14, fontFamily: sans(400), fontSize: 14, lineHeight: 24 },
  typeDetailCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  typeDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  typeIconTile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeDetailEyebrow: {
    fontFamily: mono(600),
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  typeDetailByline: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  typeDetailBylineText: { fontFamily: sans(500), fontSize: 12.5, lineHeight: 18 },
  typeDetailDot: { fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  typeDetailBodyWrap: { marginTop: 16 },
  typeDetailSectionLabel: {
    fontFamily: mono(600),
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  typeDetailBody: { marginTop: 9, fontFamily: sans(400), fontSize: 13.5, lineHeight: 23 },
  editPanel: { marginTop: 12, gap: 8 },
  editInput: { minHeight: 44, paddingHorizontal: 12, fontSize: 14 },
  editTextarea: { minHeight: 112, paddingVertical: 10 },

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

  eventRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
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
  pollFile: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pollFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    padding: 14,
  },
  pollFileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pollFileGroup: { marginTop: 4, fontFamily: sans(600), fontSize: 15 },
  pollFileGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  pollFileStat: {
    width: '50%',
    minHeight: 68,
    borderTopWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  pollFileStatRight: { borderLeftWidth: 1 },
  pollFileStatKey: {
    fontFamily: mono(600),
    fontSize: 9.5,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  pollFileStatValue: { marginTop: 5, fontFamily: sans(600), fontSize: 13.5, lineHeight: 18 },
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
  tags: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 10, borderWidth: 1, borderRadius: 6 },
  actionText: { fontFamily: mono(400), fontSize: 11 },
  manageRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  manageBtn: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 8,
  },
  manageBtnText: { fontFamily: sans(600), fontSize: 12 },
  manageBtnOnText: { fontFamily: sans(600), fontSize: 12, color: '#fff' },
  statusRow: { marginTop: 8, flexDirection: 'row', gap: 8 },
  statusBtn: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderRadius: 8 },
  statusText: { fontFamily: mono(400), fontSize: 10, textTransform: 'uppercase' },
  summaryCard: { marginTop: 12, borderWidth: 1, borderRadius: 8, padding: 12 },
  summaryTitle: { fontFamily: sans(600), fontSize: 12.5 },
  summaryText: { marginTop: 5, fontFamily: sans(400), fontSize: 12.5, lineHeight: 19.4 },

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
