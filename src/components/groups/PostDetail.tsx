/**
 * Groups tab, level three: one post in full, with its discussion.
 *
 * Replies nest exactly one level. The API's parentPostId is authoritative;
 * deeper descendants are flattened under their top-level ancestor to match the
 * website discussion layout.
 */
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowBendUpLeft,
  ArrowFatUp,
  ArrowUp,
  CalendarDots,
  ChartBar,
  ChatCircle,
  CheckCircle,
  DownloadSimple,
  FileXls,
  Flag,
  Repeat,
  Trash,
  X,
} from '../../ds/icons';
import { Avatar, Input, MastheadMeta, ScreenHeader } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, postTypeStyle, sans, trackDisplay } from '../../ds/tokens';
import { initials as initialsOf } from '../../lib/format';
import { AnchorAvatar, RoleBadge, TagChip, ROW_ICON, TYPE_ICON } from './parts';
import ForumFilePicker from './ForumFilePicker';
import ForumReportSheet from './ForumReportSheet';
import { MentionInput, MentionText } from './MentionInput';
import PollEditor from './PollEditor';
import PollQuestionnaire from './PollQuestionnaire';
import MutationNotice, { type MutationNoticeValue } from '../MutationNotice';
import type {
  ForumAttachment,
  ForumContentReportInput,
  ForumContentReportTarget,
  ForumUploadFile,
  GroupMember,
  MemberPoll,
  MemberPollUpdateInput,
  Poll,
  PollAnswer,
  PostType,
  Reply,
  RsvpChoice,
  Thread,
} from '../../api/types';

/** One reply plus anything hanging under it. */
export interface ReplyNode {
  reply: Reply;
  /** Stable key for session state — the reply's own id, or its position. */
  key: string;
  children: ReplyNode[];
}

/** Group a flat reply list into the design's one-level tree. */
export function replyTree(threadId: string, replies: Reply[]): ReplyNode[] {
  const nodes = replies.map((reply, index) => ({
    reply,
    key: reply.id ?? `${threadId}:${index}`,
    children: [],
  } satisfies ReplyNode));
  const byId = new Map(
    nodes.flatMap((node) => node.reply.id ? [[node.reply.id, node] as const] : [])
  );
  const roots: ReplyNode[] = [];
  const childrenByRoot = new Map<string, ReplyNode[]>();

  const rootOf = (node: ReplyNode) => {
    let current = node;
    const seen = new Set<string>();

    while (current.reply.parentPostId) {
      const parent = byId.get(current.reply.parentPostId);
      if (!parent) break;
      if (seen.has(parent.key)) return node;
      seen.add(current.key);
      current = parent;
    }

    return current;
  };

  for (const node of nodes) {
    if (!node.reply.parentPostId) {
      roots.push(node);
      continue;
    }

    const root = rootOf(node);
    if (root === node) {
      roots.push(node);
      continue;
    }

    const children = childrenByRoot.get(root.key) ?? [];
    children.push(node);
    childrenByRoot.set(root.key, children);
  }

  return roots.map((root) => ({ ...root, children: childrenByRoot.get(root.key) ?? [] }));
}

interface ReplyTarget {
  id: string;
  authorName: string;
  preview: string;
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
  memberId: string;
  mentionMembers: GroupMember[];
  mutationNotice: MutationNoticeValue | null;
  onDismissMutationNotice: () => void;
  replyPending: boolean;
  deletingReplies: Record<string, boolean | undefined>;
  onDeleteReply: (replyId: string) => Promise<void>;
  canReportPost: boolean;
  canModerate: boolean;
  reportingTarget: ForumContentReportTarget | null;
  reportPending: boolean;
  moderationPendingTarget: ForumContentReportTarget | null;
  onOpenReport: (target: ForumContentReportTarget) => void;
  onCloseReport: () => void;
  onSubmitReport: (input: ForumContentReportInput) => Promise<boolean>;
  onRemoveContent: (target: ForumContentReportTarget) => Promise<boolean>;
  pollEditor?: MemberPoll;
  pollEditorError?: string;
  pollLoading: boolean;
  pollUpdating: boolean;
  pollClosing: boolean;
  pollDeleting: boolean;
  onOpenPollEditor: () => Promise<void>;
  onClosePollEditor: () => void;
  onSavePoll: (input: MemberPollUpdateInput) => Promise<boolean>;
  onClosePoll: () => Promise<void>;
  onDeletePoll: () => Promise<void>;
  upvoted: boolean;
  onToggleUpvote: () => void;
  reposted: boolean;
  onToggleRepost: () => void;
  pollAnswerDraft: PollAnswer[];
  onUpdatePollDraft: (answers: PollAnswer[]) => void;
  onSubmitPollAnswers: (answers: PollAnswer[]) => Promise<boolean>;
  rsvp: RsvpChoice | undefined;
  onRsvp: (choice: RsvpChoice) => void;
  onReply: (text: string, parentPostId: string | null, files: ForumUploadFile[]) => Promise<boolean>;
  onOpenAttachment: (attachment: ForumAttachment) => void;
  onOpenMemberProfile: (memberId: string) => void;
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
  memberId,
  mentionMembers,
  mutationNotice,
  onDismissMutationNotice,
  replyPending,
  deletingReplies,
  onDeleteReply,
  canReportPost,
  canModerate,
  reportingTarget,
  reportPending,
  moderationPendingTarget,
  onOpenReport,
  onCloseReport,
  onSubmitReport,
  onRemoveContent,
  pollEditor,
  pollEditorError,
  pollLoading,
  pollUpdating,
  pollClosing,
  pollDeleting,
  onOpenPollEditor,
  onClosePollEditor,
  onSavePoll,
  onClosePoll,
  onDeletePoll,
  upvoted,
  onToggleUpvote,
  reposted,
  onToggleRepost,
  pollAnswerDraft,
  onUpdatePollDraft,
  onSubmitPollAnswers,
  rsvp,
  onRsvp,
  onReply,
  onOpenAttachment,
  onOpenMemberProfile,
  onBack,
}: PostDetailProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const replyInputRef = useRef<TextInput | null>(null);
  const [draft, setDraft] = useState('');
  const [replyFiles, setReplyFiles] = useState<ForumUploadFile[]>([]);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);

  const type = post.type ?? 'discussion';
  const kind = postTypeStyle(t, type);
  const TypeIcon = TYPE_ICON[type];
  const isAnnouncement = type === 'announcement';
  const isEvent = type === 'event';
  const hasStructuredDetailCard = isAnnouncement || isEvent;

  const initialReposted = post.hasReposted ?? false;
  const repostDelta = reposted === initialReposted ? 0 : reposted ? 1 : -1;
  const repostCount = Math.max(0, (post.repostCount ?? 0) + repostDelta);

  const roots = replyTree(post.id, replies);
  const canReply = post.canReply ?? !isAnnouncement;
  const canEdit = type !== 'poll' && !!post.canEdit && !!onUpdate;
  const canDelete = type !== 'poll' && !!post.canDelete && !!onDelete;
  const canManagePoll = type === 'poll' && !!post.canEdit;
  const upvotePending = !!deletingReplies[`upvote:${post.id}`];
  const repostPending = !!deletingReplies[`repost:${post.id}`];
  const votePending = !!deletingReplies[`poll:vote:${post.id}`];
  const rsvpPending = !!deletingReplies[`rsvp:${post.id}`];
  const threadUpdatePending = !!deletingReplies[`thread:update:${post.id}`];
  const threadDeletePending = !!deletingReplies[`thread:delete:${post.id}`];

  const send = async () => {
    const text = draft.trim();
    if (!text || replyPending) return;
    const succeeded = await onReply(text, replyTarget?.id ?? null, replyFiles);
    if (succeeded) {
      setDraft('');
      setReplyFiles([]);
      setReplyTarget(null);
    }
  };

  const confirmReplyDelete = (replyId: string) => {
    Alert.alert('Delete reply?', 'This removes your reply permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void onDeleteReply(replyId) },
    ]);
  };

  const confirmContentRemoval = (target: ForumContentReportTarget, label: string) => {
    Alert.alert(
      `Remove ${label}?`,
      target.targetType === 'thread'
        ? 'This post will be removed from member views. The audit record will be preserved.'
        : 'This reply will become an empty moderator tombstone so the discussion structure is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void onRemoveContent(target) },
      ]
    );
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
          <MutationNotice notice={mutationNotice} onDismiss={onDismissMutationNotice} />
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
                  disabled={threadUpdatePending}
                  style={[styles.manageBtn, { backgroundColor: threadUpdatePending ? t.muted : t.surfaceAnchor, borderColor: threadUpdatePending ? t.ruleHairline : t.surfaceAnchor }]}
                >
                  <Text style={styles.manageBtnOnText}>{threadUpdatePending ? 'Saving…' : 'Save changes'}</Text>
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
                <TypeDetailCard
                  groupName={groupName}
                  post={post}
                  type={type}
                  onOpenAuthor={post.authorId ? () => onOpenMemberProfile(post.authorId!) : undefined}
                />
              ) : (
                <MentionText style={[styles.postBody, { color: t.inkBody }]}>{post.body}</MentionText>
              )}
            </>
          )}

          {!hasStructuredDetailCard && (
            <Pressable
              disabled={!post.authorId}
              onPress={() => post.authorId && onOpenMemberProfile(post.authorId)}
              accessibilityRole={post.authorId ? 'button' : undefined}
              accessibilityLabel={post.authorId ? `Open ${post.author}'s profile` : undefined}
              style={[styles.byline, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}
            >
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
            </Pressable>
          )}

          {!!post.attachments?.length ? (
            <AttachmentList attachments={post.attachments} onOpen={onOpenAttachment} />
          ) : !!post.file ? (
            <View style={[styles.attachment, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
              <FileXls size={22} color={t.brandGreen} />
              <View style={styles.flex}>
                <Text style={[styles.attachmentName, { color: t.inkStrong }]}>{post.file}</Text>
                <MastheadMeta size={9.5}>{post.fileMeta}</MastheadMeta>
              </View>
            </View>
          ) : null}

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
                  disabled={rsvpPending}
                  accessibilityState={{ disabled: rsvpPending }}
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
                  disabled={rsvpPending}
                  accessibilityState={{ disabled: rsvpPending }}
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
                answered={post.poll.hasSubmitted}
                status={post.lifecycle === 'closed' ? 'Closed' : 'Open'}
              />
              <PollQuestionnaire
                key={post.poll.id}
                poll={post.poll}
                closed={post.lifecycle === 'closed' || !!post.poll.closedAt}
                draftAnswers={pollAnswerDraft}
                pending={votePending}
                onDraftChange={onUpdatePollDraft}
                onSubmit={onSubmitPollAnswers}
              />

              {!!pollEditor && (
                <PollEditor
                  poll={pollEditor}
                  pending={pollUpdating}
                  error={pollEditorError}
                  onSave={onSavePoll}
                  onCancel={onClosePollEditor}
                />
              )}
            </>
          )}

          {!!post.tags?.length && (
            <View style={styles.tags}>
              {post.tags.map((tag) => (
                <TagChip key={tag} label={tag} size={11} height={22} />
              ))}
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actionScroller}
            contentContainerStyle={styles.actions}
          >
            <Pressable
              style={[styles.action, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage, opacity: upvotePending ? 0.55 : 1 }]}
              onPress={onToggleUpvote}
              disabled={upvotePending}
              accessibilityState={{ disabled: upvotePending }}
              hitSlop={6}
            >
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
            <Pressable
              style={[styles.action, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}
              onPress={onToggleRepost}
              disabled={repostPending}
              accessibilityRole="button"
              accessibilityLabel={`${reposted ? 'Remove repost' : 'Repost'} (${repostCount} ${repostCount === 1 ? 'repost' : 'reposts'})`}
              accessibilityState={{ selected: reposted, disabled: repostPending }}
              hitSlop={6}
            >
              <Repeat
                size={15}
                weight={reposted ? 'bold' : 'regular'}
                color={reposted ? t.brandGreenStrong : t.inkMuted}
              />
              <Text
                style={[styles.actionText, { color: reposted ? t.brandGreenStrong : t.inkMuted }]}
              >
                {reposted ? 'Reposted' : 'Repost'} · {repostCount}
              </Text>
            </Pressable>
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
              <Pressable disabled={threadUpdatePending} onPress={() => setEditing(true)} style={[styles.manageBtn, { borderColor: t.ruleHairline }]}>
                <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>Edit</Text>
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                disabled={threadDeletePending}
                onPress={() => Alert.alert('Delete post?', 'This removes the post permanently.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ])}
                style={[styles.manageBtn, { borderColor: t.ruleHairline }]}
              >
                <Text style={[styles.manageBtnText, { color: t.brandRed }]}>{threadDeletePending ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            )}
            {type !== 'poll' && canReportPost && (
              <Pressable
                onPress={() => onOpenReport({ targetType: 'thread', targetId: post.id, threadId: post.id })}
                disabled={reportPending}
                accessibilityRole="button"
                accessibilityLabel="Report post"
                accessibilityState={{ disabled: reportPending }}
                style={[styles.manageBtn, { borderColor: t.ruleHairline }]}
              >
                <Flag size={13} color={t.inkMuted} />
                <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>Report</Text>
              </Pressable>
            )}
            {type !== 'poll' && canModerate && post.authorId !== memberId && (
              <Pressable
                onPress={() => confirmContentRemoval({ targetType: 'thread', targetId: post.id, threadId: post.id }, 'post')}
                disabled={moderationPendingTarget?.targetType === 'thread' && moderationPendingTarget.targetId === post.id}
                accessibilityRole="button"
                accessibilityLabel="Remove post as moderator"
                accessibilityState={{ disabled: moderationPendingTarget?.targetType === 'thread' && moderationPendingTarget.targetId === post.id }}
                style={[styles.manageBtn, { borderColor: t.brandBrick }]}
              >
                <Trash size={13} color={t.brandBrickInk} />
                <Text style={[styles.manageBtnText, { color: t.brandBrickInk }]}>Remove</Text>
              </Pressable>
            )}
            {canManagePoll && post.lifecycle !== 'closed' && !pollEditor && (
              <Pressable
                onPress={() => void onOpenPollEditor()}
                disabled={pollLoading || pollClosing || pollDeleting}
                style={[styles.manageBtn, { borderColor: t.ruleHairline }]}
              >
                <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>{pollLoading ? 'Loading…' : 'Edit poll'}</Text>
              </Pressable>
            )}
            {canManagePoll && post.lifecycle !== 'closed' && (
              <Pressable
                onPress={() => Alert.alert('Close poll?', 'Members will no longer be able to vote. Closed polls cannot be reopened.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Close poll', style: 'destructive', onPress: () => void onClosePoll() },
                ])}
                disabled={pollClosing || pollUpdating || pollDeleting}
                style={[styles.manageBtn, { borderColor: t.ruleHairline }]}
              >
                <Text style={[styles.manageBtnText, { color: t.inkMuted }]}>{pollClosing ? 'Closing…' : 'Close poll'}</Text>
              </Pressable>
            )}
            {type === 'poll' && !!post.canDelete && (
              <Pressable
                onPress={() => Alert.alert('Delete poll?', 'This removes the poll and its responses permanently.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => void onDeletePoll() },
                ])}
                disabled={pollDeleting || pollUpdating || pollClosing}
                style={[styles.manageBtn, { borderColor: t.ruleHairline }]}
              >
                <Text style={[styles.manageBtnText, { color: t.brandRed }]}>{pollDeleting ? 'Deleting…' : 'Delete poll'}</Text>
              </Pressable>
            )}
          </ScrollView>

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
                      onReplyTo={!node.reply.deleted && node.reply.id ? () => {
                        setReplyTarget({
                          id: node.reply.id!,
                          authorName: node.reply.a,
                          preview: node.reply.text.slice(0, 60),
                        });
                        requestAnimationFrame(() => replyInputRef.current?.focus());
                      } : undefined}
                      onDelete={!node.reply.deleted && canReply && node.reply.id && node.reply.authorId === memberId ? () => confirmReplyDelete(node.reply.id!) : undefined}
                      onReport={!node.reply.deleted && canReportPost && node.reply.id && node.reply.authorId !== memberId
                        ? () => onOpenReport({ targetType: 'reply', targetId: node.reply.id!, threadId: post.id })
                        : undefined}
                      onRemove={!node.reply.deleted && canModerate && node.reply.id && node.reply.authorId !== memberId
                        ? () => confirmContentRemoval({ targetType: 'reply', targetId: node.reply.id!, threadId: post.id }, 'reply')
                        : undefined}
                      moderationPending={!!node.reply.id && moderationPendingTarget?.targetType === 'reply' && moderationPendingTarget.targetId === node.reply.id}
                      deleting={!!node.reply.id && !!deletingReplies[`reply:delete:${node.reply.id}`]}
                      onOpenAttachment={onOpenAttachment}
                      onOpenAuthor={node.reply.authorId ? () => onOpenMemberProfile(node.reply.authorId!) : undefined}
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
                              onDelete={!child.reply.deleted && canReply && child.reply.id && child.reply.authorId === memberId ? () => confirmReplyDelete(child.reply.id!) : undefined}
                              onReport={!child.reply.deleted && canReportPost && child.reply.id && child.reply.authorId !== memberId
                                ? () => onOpenReport({ targetType: 'reply', targetId: child.reply.id!, threadId: post.id })
                                : undefined}
                              onRemove={!child.reply.deleted && canModerate && child.reply.id && child.reply.authorId !== memberId
                                ? () => confirmContentRemoval({ targetType: 'reply', targetId: child.reply.id!, threadId: post.id }, 'reply')
                                : undefined}
                              moderationPending={!!child.reply.id && moderationPendingTarget?.targetType === 'reply' && moderationPendingTarget.targetId === child.reply.id}
                              deleting={!!child.reply.id && !!deletingReplies[`reply:delete:${child.reply.id}`]}
                              onOpenAttachment={onOpenAttachment}
                              onOpenAuthor={child.reply.authorId ? () => onOpenMemberProfile(child.reply.authorId!) : undefined}
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
                Replying to {replyTarget.authorName}
              </Text>
              <Pressable onPress={() => setReplyTarget(null)} hitSlop={8} accessibilityLabel="Clear reply target">
                <X size={13} color={t.inkMuted} />
              </Pressable>
            </View>
          )}
          <View style={styles.composerRow}>
            <MentionInput
              ref={replyInputRef}
              value={draft}
              onChangeText={setDraft}
              members={mentionMembers}
              suggestionsPlacement="above"
              placeholder="Reply — @ to mention a member"
              containerStyle={styles.composerInputWrap}
              inputStyle={styles.composerInput}
              returnKeyType="send"
              onSubmitEditing={() => void send()}
              editable={!replyPending}
            />
            <Pressable
              onPress={() => void send()}
              disabled={replyPending || !draft.trim()}
              accessibilityLabel="Post reply"
              accessibilityState={{ disabled: replyPending || !draft.trim() }}
              style={({ pressed }) => [
                styles.send,
                { backgroundColor: replyPending || !draft.trim() ? t.muted : pressed ? t.brandGreenStrong : t.brandGreen },
              ]}
            >
              {replyPending
                ? <Text style={[styles.sendingText, { color: t.inkMuted }]}>…</Text>
                : <ArrowUp size={18} color={t.primaryForeground} />}
            </Pressable>
          </View>
          <ForumFilePicker files={replyFiles} onChange={setReplyFiles} compact />
        </View>
      )}
      <ForumReportSheet
        target={reportingTarget}
        pending={reportPending}
        onClose={onCloseReport}
        onSubmit={onSubmitReport}
      />
    </KeyboardAvoidingView>
  );
}

/** Byline, text and actions for a reply — identical at both levels bar the sizes. */
function ReplyBody({
  node,
  nested = false,
  onReplyTo,
  onDelete,
  onReport,
  onRemove,
  deleting = false,
  moderationPending = false,
  onOpenAttachment,
  onOpenAuthor,
}: {
  node: ReplyNode;
  nested?: boolean;
  /** Absent on a nested reply — the design only offers Reply at the top level. */
  onReplyTo?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onRemove?: () => void;
  deleting?: boolean;
  moderationPending?: boolean;
  onOpenAttachment: (attachment: ForumAttachment) => void;
  onOpenAuthor?: () => void;
}) {
  const { t } = useTheme();
  const r = node.reply;
  if (r.deleted) {
    return (
      <View accessibilityLabel={r.removed ? 'Reply removed by a co-lead' : 'Reply deleted'}>
        <Text style={[styles.replyTombstone, { color: t.inkMuted }]}>
          {r.removed ? 'Reply removed by a co-lead' : 'Reply deleted'}
        </Text>
      </View>
    );
  }
  return (
    <>
      <View style={styles.replyByline}>
        <Pressable
          disabled={!onOpenAuthor}
          onPress={onOpenAuthor}
          accessibilityRole={onOpenAuthor ? 'button' : undefined}
          accessibilityLabel={onOpenAuthor ? `Open ${r.a}'s profile` : undefined}
        >
          <Text
          style={[
            nested ? styles.childAuthor : styles.replyAuthor,
            { color: t.inkStrong },
          ]}
          >
            {r.a}
          </Text>
        </Pressable>
        <MastheadMeta size={9.5}>
          {`${r.org} · ${r.time}`}
        </MastheadMeta>
      </View>
      <MentionText style={[nested ? styles.childText : styles.replyText, { color: t.inkBody }]}>
        {r.text}
      </MentionText>
      {!!r.attachments?.length && (
        <AttachmentList attachments={r.attachments} onOpen={onOpenAttachment} compact />
      )}
      <View style={[styles.replyActions, nested && styles.childActions]}>
        {!!onReplyTo && (
          <Pressable style={styles.replyAction} onPress={onReplyTo} hitSlop={6}>
            <ArrowBendUpLeft size={13} color={t.inkFaint} />
            <Text style={[styles.replyActionText, { color: t.inkFaint }]}>Reply</Text>
          </Pressable>
        )}
        {!!onDelete && (
          <Pressable style={styles.replyAction} onPress={onDelete} disabled={deleting} hitSlop={6}>
            <Text style={[styles.replyActionText, { color: t.brandRed }]}>{deleting ? 'Deleting…' : 'Delete'}</Text>
          </Pressable>
        )}
        {!!onReport && (
          <Pressable style={styles.replyAction} onPress={onReport} hitSlop={6}>
            <Flag size={12} color={t.inkFaint} />
            <Text style={[styles.replyActionText, { color: t.inkFaint }]}>Report</Text>
          </Pressable>
        )}
        {!!onRemove && (
          <Pressable style={styles.replyAction} onPress={onRemove} disabled={moderationPending} hitSlop={6}>
            <Trash size={12} color={t.brandBrickInk} />
            <Text style={[styles.replyActionText, { color: t.brandBrickInk }]}>{moderationPending ? 'Removing…' : 'Remove'}</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

function AttachmentList({
  attachments,
  onOpen,
  compact = false,
}: {
  attachments: ForumAttachment[];
  onOpen: (attachment: ForumAttachment) => void;
  compact?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.attachmentList, compact && styles.replyAttachmentList]}>
      {attachments.map((attachment) => (
        <Pressable
          key={attachment.id}
          onPress={() => onOpen(attachment)}
          disabled={!attachment.href}
          accessibilityRole="button"
          accessibilityState={{ disabled: !attachment.href }}
          accessibilityLabel={`Open ${attachment.name}`}
          style={({ pressed }) => [
            styles.attachment,
            compact && styles.replyAttachment,
            {
              borderColor: pressed ? t.ruleStrong : t.ruleHairline,
              backgroundColor: t.surfacePage,
            },
          ]}
        >
          <FileXls size={compact ? 17 : 22} color={t.brandGreen} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.attachmentName, { color: t.inkStrong }]}>{attachment.name}</Text>
            <MastheadMeta size={9.5}>{attachmentMeta(attachment)}</MastheadMeta>
          </View>
          {!!attachment.href && <DownloadSimple size={17} color={t.inkFaint} />}
        </Pressable>
      ))}
    </View>
  );
}

function attachmentMeta(attachment: ForumAttachment): string {
  const size = attachment.byteSize;
  const sizeLabel = !size
    ? undefined
    : size < 1024 * 1024
      ? `${Math.round(size / 1024)} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return [attachment.contentType, sizeLabel].filter(Boolean).join(' · ');
}

function TypeDetailCard({
  groupName,
  post,
  type,
  onOpenAuthor,
}: {
  groupName: string;
  post: Thread;
  type: Extract<PostType, 'announcement' | 'event'>;
  onOpenAuthor?: () => void;
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
            <Pressable
              disabled={!onOpenAuthor}
              onPress={onOpenAuthor}
              accessibilityRole={onOpenAuthor ? 'button' : undefined}
              accessibilityLabel={onOpenAuthor ? `Open ${post.author}'s profile` : undefined}
            >
              <Text style={[styles.typeDetailBylineText, { color: t.inkMuted }]}>{post.author}</Text>
            </Pressable>
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
          <MentionText style={[styles.typeDetailBody, { color: type === 'event' ? t.inkStrong : t.inkMuted }]}>
            {post.body}
          </MentionText>
        </View>
      )}
    </View>
  );
}

function PollFilePanel({
  groupName,
  poll,
  answered,
  status,
}: {
  groupName: string;
  poll: Poll;
  answered: boolean;
  status: string;
}) {
  const { t } = useTheme();
  const kind = postTypeStyle(t, 'poll');
  const facts = [
    { k: 'Questions', v: String(poll.questions.length) },
    { k: 'Responses', v: String(poll.responseCount) },
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
  attachmentList: { marginTop: 0 },
  replyAttachmentList: { marginTop: 2 },
  replyAttachment: { minHeight: 42, marginTop: 7, paddingVertical: 7, paddingHorizontal: 9 },
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

  actionScroller: { marginTop: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, paddingHorizontal: 8, borderWidth: 1, borderRadius: 6 },
  actionText: { fontFamily: mono(400), fontSize: 10 },
  manageRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  manageBtn: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  manageBtnText: { fontFamily: sans(600), fontSize: 10.5 },
  manageBtnOnText: { fontFamily: sans(600), fontSize: 12, color: '#fff' },
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
  replyTombstone: { paddingVertical: 3, fontFamily: sans(500), fontSize: 12.5, fontStyle: 'italic' },
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
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerInputWrap: { flex: 1 },
  composerInput: { height: 44, borderRadius: 22, paddingHorizontal: 16, fontSize: 13.5 },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendingText: { fontFamily: sans(600), fontSize: 18 },
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
