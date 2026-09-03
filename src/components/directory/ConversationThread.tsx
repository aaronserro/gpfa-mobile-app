import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import type {
  ConversationDetail,
  DirectoryPerson,
  MemberOrg,
  MessageItem,
  MessageReaction,
  MessagingParticipant,
} from '../../api/types';
import { CaretLeft, DotsThree, PaperPlaneTilt, PencilSimple, Trash, X } from '../../ds/icons';
import { Avatar } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../../ds/tokens';
import { initials } from '../../lib/format';
import {
  MESSAGE_EDIT_WINDOW_MS,
  conversationTitle,
  isMessageWithinEditWindow,
  messageContentError,
  messageTimestamp,
  messagingParticipantName,
  normalizeMessageContent,
} from '../../lib/messages';

export interface ConversationThreadProps {
  currentMemberId: string;
  onOpenMemberProfile: (memberId: string) => void;
  conversation: ConversationDetail | null;
  draftRecipient: MessagingParticipant | null;
  draftGroupParticipants: MessagingParticipant[];
  people: DirectoryPerson[];
  orgs: MemberOrg[];
  messages: MessageItem[];
  visible: boolean;
  loading: boolean;
  loadingOlder: boolean;
  hasOlder: boolean;
  error: Error | null;
  sending: boolean;
  actionPending: boolean;
  messageMutationPendingId: string | null;
  onBack: () => void;
  onRetry: () => void;
  onSend: (content: string) => Promise<void>;
  onLoadOlder: () => Promise<void>;
  onSetReaction: (messageId: string, emoji: MessageReaction, active: boolean) => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onUnsendMessage: (messageId: string) => Promise<void>;
  onRename: (title: string) => Promise<void>;
  onAddMembers: (participantIds: string[]) => Promise<void>;
  onLeave: () => Promise<void>;
  onReachLatest: (ordinal: number) => void;
}

const REACTIONS: MessageReaction[] = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export default function ConversationThread({
  currentMemberId,
  onOpenMemberProfile,
  conversation,
  draftRecipient,
  draftGroupParticipants,
  people,
  orgs,
  messages,
  visible,
  loading,
  loadingOlder,
  hasOlder,
  error,
  sending,
  actionPending,
  messageMutationPendingId,
  onBack,
  onRetry,
  onSend,
  onLoadOlder,
  onSetReaction,
  onEditMessage,
  onUnsendMessage,
  onRename,
  onAddMembers,
  onLeave,
  onReachLatest,
}: ConversationThreadProps) {
  const { t } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [messageActionsId, setMessageActionsId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editWindowNow, setEditWindowNow] = useState(() => Date.now());
  const [managing, setManaging] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation?.title ?? '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const lastTailId = useRef<string | null>(null);
  const nearBottom = useRef(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const participants = conversation?.participants ?? (draftRecipient ? [draftRecipient] : draftGroupParticipants);
  const other = participants.find((participant) => !participant.isCurrentMember && !participant.hasLeft) ?? null;
  const title = conversation ? conversationTitle(conversation) : draftRecipient?.name ?? 'New message';
  const editingMessage = editingMessageId
    ? messages.find((message) => message.id === editingMessageId) ?? null
    : null;
  const composerContent = editingMessage ? editContent : content;
  const normalized = normalizeMessageContent(composerContent);
  const validationError = messageContentError(composerContent);
  const invalid = validationError !== null;
  const composerPending = editingMessage
    ? messageMutationPendingId === editingMessage.id
    : sending;
  const composerError = editingMessage ? editError : sendError;
  const isGroup = conversation?.kind === 'group';
  const existingIds = new Set(participants.map((participant) => participant.id));
  const availablePeople = people.filter((person) => person.id !== currentMemberId && !existingIds.has(person.id));
  const activeParticipantCount = participants.filter((participant) => !participant.hasLeft).length;
  const availableSlots = Math.max(0, 8 - activeParticipantCount);
  const orgById = new Map(orgs.map((org) => [org.id, org.short]));

  useEffect(() => {
    setTitleInput(conversation?.title ?? '');
  }, [conversation?.id, conversation?.title]);

  useEffect(() => {
    lastTailId.current = null;
    nearBottom.current = true;
    setNewMessageCount(0);
    setMessageActionsId(null);
    setReactionPickerMessageId(null);
    setEditingMessageId(null);
    setEditContent('');
    setEditError(null);
  }, [conversation?.id]);

  useEffect(() => {
    setEditWindowNow(Date.now());
  }, [currentMemberId, messages]);

  useEffect(() => {
    const now = editWindowNow;
    const nextExpiry = messages
      .filter((message) =>
        message.senderId === currentMemberId &&
        message.kind === 'text' &&
        isMessageWithinEditWindow(message.createdAt, now)
      )
      .map((message) => Date.parse(message.createdAt) + MESSAGE_EDIT_WINDOW_MS)
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0];
    if (nextExpiry === undefined) return;
    const timer = setTimeout(() => setEditWindowNow(Date.now()), Math.max(0, nextExpiry - now + 1));
    return () => clearTimeout(timer);
  }, [currentMemberId, editWindowNow, messages]);

  useEffect(() => {
    if (!editingMessageId) return;
    const selected = messages.find((message) => message.id === editingMessageId);
    if (
      selected &&
      selected.senderId === currentMemberId &&
      selected.kind === 'text' &&
      isMessageWithinEditWindow(selected.createdAt, editWindowNow)
    ) {
      return;
    }
    setEditingMessageId(null);
    setEditContent('');
    setEditError(null);
    setActionError('This message is no longer available to edit.');
  }, [currentMemberId, editingMessageId, editWindowNow, messages]);

  useEffect(() => {
    const tailId = messages.at(-1)?.id ?? null;
    if (tailId === lastTailId.current) return;
    const previousTailId = lastTailId.current;
    lastTailId.current = tailId;
    const previousTailIndex = previousTailId
      ? messages.findIndex((message) => message.id === previousTailId)
      : -1;
    const arrivals = previousTailIndex >= 0
      ? messages.slice(previousTailIndex + 1)
      : messages;
    const ownArrival = arrivals.some((message) => message.senderId === currentMemberId);
    if (!visible || (previousTailId && !nearBottom.current && !ownArrival)) {
      setNewMessageCount((current) => current + arrivals.filter((message) => message.senderId !== currentMemberId).length);
      return;
    }
    setNewMessageCount(0);
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [currentMemberId, messages, visible]);

  async function submit() {
    if (invalid || composerPending) return;
    const outgoing = normalized;
    if (editingMessage) {
      setEditError(null);
      try {
        await onEditMessage(editingMessage.id, outgoing);
        setEditingMessageId(null);
        setEditContent('');
      } catch (cause) {
        setEditError(cause instanceof Error ? cause.message : 'Message not updated.');
      }
      return;
    }
    setContent('');
    setSendError(null);
    try {
      await onSend(outgoing);
    } catch (cause) {
      setContent((current) => current || outgoing);
      setSendError(cause instanceof Error ? cause.message : 'Message not sent.');
    }
  }

  async function runAction(action: () => Promise<void>): Promise<boolean> {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'The conversation could not be updated.');
      return false;
    }
  }

  function beginEditing(message: MessageItem) {
    setMessageActionsId(null);
    setReactionPickerMessageId(null);
    setEditingMessageId(message.id);
    setEditContent(message.content);
    setEditError(null);
    setActionError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function confirmUnsend(message: MessageItem) {
    setMessageActionsId(null);
    Alert.alert(
      'Unsend message?',
      'This message will be replaced for everyone in the conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsend',
          style: 'destructive',
          onPress: () => {
            void runAction(() => onUnsendMessage(message.id)).then((success) => {
              if (!success || editingMessageId !== message.id) return;
              setEditingMessageId(null);
              setEditContent('');
              setEditError(null);
            });
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={84}
    >
      <View style={[styles.threadHeader, { borderBottomColor: t.ruleHairline }]}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to inbox" hitSlop={8}>
          <CaretLeft size={20} color={t.brandGreen} />
        </Pressable>
        {other ? (
          <Pressable
            onPress={() => onOpenMemberProfile(other.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${other.name}'s profile`}
          >
            <Avatar initials={initials(other.name)} photoUrl={other.avatarUrl ?? undefined} size={36} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={other ? () => onOpenMemberProfile(other.id) : undefined}
          disabled={!other}
          accessibilityRole={other ? 'button' : undefined}
          accessibilityLabel={other ? `Open ${other.name}'s profile` : undefined}
          style={styles.headerText}
        >
          <Text numberOfLines={1} style={[styles.title, { color: t.inkStrong }]}>{title}</Text>
          <Text numberOfLines={1} style={[styles.subtitle, { color: t.inkMuted }]}>
            {other?.roleTitle || other?.organizationName || `${participants.length} participants`}
          </Text>
        </Pressable>
        {isGroup && (
          <Pressable
            onPress={() => {
              setManaging((current) => !current);
              setActionError(null);
              setConfirmLeave(false);
            }}
            accessibilityRole="button"
            style={[styles.manageButton, { borderColor: t.ruleStrong }]}
          >
            <Text style={[styles.manageLabel, { color: t.inkStrong }]}>{managing ? 'Done' : 'Manage'}</Text>
          </Pressable>
        )}
      </View>

      {actionError && !managing && (
        <View accessibilityRole="alert" style={[styles.inlineError, { backgroundColor: t.surfaceSoft, borderBottomColor: t.ruleHairline }]}>
          <Text style={[styles.inlineErrorText, { color: t.brandRed }]}>{actionError}</Text>
        </View>
      )}

      {managing && conversation ? (
        <ScrollView
          style={[styles.managePanel, { backgroundColor: t.surfacePage }]}
          contentContainerStyle={styles.manageContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.manageHeading, { color: t.inkStrong }]}>Conversation name</Text>
          <View style={styles.renameRow}>
            <TextInput
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="Optional group name"
              placeholderTextColor={t.inkFaint}
              maxLength={80}
              editable={!actionPending}
              style={[styles.renameInput, { color: t.inkStrong, backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}
            />
            <Pressable
              onPress={() => void runAction(() => onRename(titleInput))}
              disabled={actionPending}
              style={[styles.primaryAction, { backgroundColor: actionPending ? t.surfaceSoft : t.brandGreen }]}
            >
              <Text style={[styles.primaryActionLabel, { color: actionPending ? t.inkFaint : t.inkInverse }]}>Save</Text>
            </Pressable>
          </View>

          <Text style={[styles.manageHeading, { color: t.inkStrong }]}>Participants</Text>
          {participants.map((participant) => (
            <Pressable
              key={participant.id}
              onPress={!participant.isCurrentMember && !participant.hasLeft
                ? () => onOpenMemberProfile(participant.id)
                : undefined}
              disabled={participant.isCurrentMember || participant.hasLeft}
              accessibilityRole={!participant.isCurrentMember && !participant.hasLeft ? 'button' : undefined}
              accessibilityLabel={!participant.isCurrentMember && !participant.hasLeft
                ? `Open ${participant.name}'s profile`
                : undefined}
              style={[styles.memberRow, { borderBottomColor: t.ruleHairline }]}
            >
              <Avatar initials={initials(participant.name)} photoUrl={participant.avatarUrl ?? undefined} size={32} />
              <View style={styles.memberText}>
                <Text style={[styles.memberName, { color: t.inkStrong }]}>{participant.name}</Text>
                <Text style={[styles.memberMeta, { color: t.inkMuted }]}>
                  {participant.hasLeft ? 'Left conversation' : participant.organizationName ?? participant.roleTitle ?? 'GPFA member'}
                </Text>
              </View>
            </Pressable>
          ))}

          {availableSlots > 0 && availablePeople.length > 0 && (
            <>
              <Text style={[styles.manageHeading, { color: t.inkStrong }]}>Add members</Text>
              {availablePeople.map((person) => {
                const selected = selectedMemberIds.includes(person.id);
                return (
                  <Pressable
                    key={person.id}
                    onPress={() => setSelectedMemberIds((current) =>
                      selected
                        ? current.filter((id) => id !== person.id)
                        : current.length < availableSlots
                          ? [...current, person.id]
                          : current
                    )}
                    disabled={actionPending}
                    style={[styles.memberRow, { borderBottomColor: t.ruleHairline }]}
                  >
                    <Pressable
                      onPress={() => onOpenMemberProfile(person.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${person.name}'s profile`}
                    >
                      <Avatar initials={person.initials ?? initials(person.name)} photoUrl={person.photoUrl} size={32} />
                    </Pressable>
                    <Pressable
                      onPress={() => onOpenMemberProfile(person.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${person.name}'s profile`}
                      style={styles.memberText}
                    >
                      <Text style={[styles.memberName, { color: t.inkStrong }]}>{person.name}</Text>
                      <Text numberOfLines={1} style={[styles.memberMeta, { color: t.inkMuted }]}>
                        {[person.role, orgById.get(person.orgId)].filter(Boolean).join(' · ')}
                      </Text>
                    </Pressable>
                    <View style={[styles.selectCircle, { borderColor: selected ? t.brandGreen : t.ruleStrong, backgroundColor: selected ? t.brandGreen : 'transparent' }]}>
                      {selected && <Text style={[styles.selectMark, { color: t.inkInverse }]}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => void runAction(async () => {
                  await onAddMembers(selectedMemberIds);
                  setSelectedMemberIds([]);
                })}
                disabled={selectedMemberIds.length === 0 || actionPending}
                style={[styles.wideAction, { backgroundColor: selectedMemberIds.length === 0 || actionPending ? t.surfaceSoft : t.brandGreen }]}
              >
                <Text style={[styles.primaryActionLabel, { color: selectedMemberIds.length === 0 || actionPending ? t.inkFaint : t.inkInverse }]}>
                  Add {selectedMemberIds.length || ''} {selectedMemberIds.length === 1 ? 'member' : 'members'}
                </Text>
              </Pressable>
            </>
          )}

          {actionError && <Text style={[styles.actionError, { color: t.brandRed }]}>{actionError}</Text>}
          <Pressable
            onPress={() => {
              if (!confirmLeave) {
                setConfirmLeave(true);
                return;
              }
              void runAction(onLeave);
            }}
            disabled={actionPending}
            style={[styles.leaveAction, { borderColor: t.brandRed }]}
          >
            <Text style={[styles.leaveLabel, { color: t.brandRed }]}>
              {confirmLeave ? 'Tap again to leave' : 'Leave conversation'}
            </Text>
          </Pressable>
        </ScrollView>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.brandGreen} />
          <Text style={[styles.stateText, { color: t.inkMuted }]}>Loading conversation…</Text>
        </View>
      ) : error && !conversation ? (
        <View style={styles.center}>
          <Text style={[styles.stateTitle, { color: t.inkStrong }]}>Conversation unavailable</Text>
          <Text style={[styles.stateText, { color: t.inkMuted }]}>This conversation could not be opened.</Text>
          <Pressable onPress={onRetry} style={[styles.retry, { borderColor: t.ruleStrong }]}>
            <Text style={[styles.retryText, { color: t.inkStrong }]}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={[styles.transcript, { backgroundColor: t.surfacePage }]}
          contentContainerStyle={styles.transcriptContent}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
          scrollEventThrottle={16}
          onScroll={({ nativeEvent }) => {
            const distanceFromBottom =
              nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y;
            nearBottom.current = distanceFromBottom <= 72;
            if (!visible || !nearBottom.current) return;
            setNewMessageCount(0);
            const latestOrdinal = messages.at(-1)?.ordinal ?? 0;
            if (latestOrdinal > 0) onReachLatest(latestOrdinal);
          }}
        >
          {hasOlder && (
            <Pressable
              onPress={() => void onLoadOlder()}
              disabled={loadingOlder}
              style={[styles.loadOlder, { borderColor: t.ruleStrong, backgroundColor: t.surfacePaper }]}
            >
              {loadingOlder ? (
                <ActivityIndicator size="small" color={t.brandGreen} />
              ) : (
                <Text style={[styles.loadOlderLabel, { color: t.inkStrong }]}>Load earlier messages</Text>
              )}
            </Pressable>
          )}
          {messages.length === 0 && (
            <View style={styles.emptyConversation}>
              <Text style={[styles.stateTitle, { color: t.inkStrong }]}>Start the conversation</Text>
              <Text style={[styles.stateText, { color: t.inkMuted }]}>Messages are private to the people in this conversation.</Text>
            </View>
          )}
          {messages.map((message) => {
            if (message.kind === 'system') {
              return (
                <Text key={message.id} style={[styles.systemMessage, { color: t.inkMuted }]}>
                  {message.content}
                </Text>
              );
            }
            const sender = participants.find((participant) => participant.id === message.senderId);
            const own = sender?.isCurrentMember ?? message.senderId === currentMemberId;
            const actionsAvailable = own && isMessageWithinEditWindow(message.createdAt, editWindowNow);
            const mutationPending = messageMutationPendingId === message.id;
            return (
              <View key={message.id} style={[styles.messageRow, own && styles.messageRowOwn]}>
                {!own && sender ? (
                  <Pressable
                    onPress={() => onOpenMemberProfile(sender.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${sender.name}'s profile`}
                  >
                    <Avatar initials={initials(sender.name)} photoUrl={sender.avatarUrl ?? undefined} size={28} />
                  </Pressable>
                ) : null}
                <View style={[styles.messageColumn, own && styles.messageColumnOwn]}>
                  {!own && sender ? (
                    <Pressable
                      onPress={() => onOpenMemberProfile(sender.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${sender.name}'s profile`}
                    >
                      <Text style={[styles.sender, { color: t.inkMuted }]}>
                        {messagingParticipantName(sender)}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onLongPress={() => {
                      setMessageActionsId(null);
                      setReactionPickerMessageId((current) => current === message.id ? null : message.id);
                    }}
                    delayLongPress={250}
                    accessibilityRole="button"
                    accessibilityLabel={`${message.content}. Long press to react.`}
                    style={[
                      styles.bubble,
                      own ? styles.bubbleOwn : styles.bubbleOther,
                      {
                        backgroundColor: own ? t.brandGreenSoft : t.surfacePaper,
                        borderColor: own ? alpha(t.brandGreen, 0.32) : t.ruleHairline,
                      },
                    ]}
                  >
                    <Text style={[styles.messageText, { color: t.inkBody }]}>{message.content}</Text>
                  </Pressable>
                  {message.reactions.length > 0 && (
                    <View style={styles.reactionChips}>
                      {message.reactions.map((reaction) => (
                        <Pressable
                          key={reaction.emoji}
                          onPress={() => void runAction(() => onSetReaction(
                            message.id,
                            reaction.emoji,
                            !reaction.reactedByCurrentMember
                          ))}
                          style={[
                            styles.reactionChip,
                            {
                              backgroundColor: reaction.reactedByCurrentMember ? t.brandGreenSoft : t.surfacePaper,
                              borderColor: reaction.reactedByCurrentMember ? t.brandGreen : t.ruleHairline,
                            },
                          ]}
                        >
                          <Text style={[styles.reactionText, { color: t.inkStrong }]}>{reaction.emoji} {reaction.count}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {reactionPickerMessageId === message.id && (
                    <View style={[styles.reactionPicker, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
                      {REACTIONS.map((emoji) => {
                        const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
                        return (
                          <Pressable
                            key={emoji}
                            onPress={() => {
                              setReactionPickerMessageId(null);
                              void runAction(() => onSetReaction(message.id, emoji, !existing?.reactedByCurrentMember));
                            }}
                            accessibilityLabel={`React with ${emoji}`}
                            style={styles.reactionOption}
                          >
                            <Text style={styles.reactionOptionText}>{emoji}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <View style={styles.messageMetaRow}>
                    <Text style={[styles.time, { color: t.inkFaint }]}>
                      {messageTimestamp(message.createdAt)}{message.editedAt ? ' · Edited' : ''}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setMessageActionsId(null);
                        setReactionPickerMessageId((current) => current === message.id ? null : message.id);
                      }}
                      hitSlop={5}
                      accessibilityRole="button"
                      accessibilityLabel="React to message"
                    >
                      <Text style={[styles.reactLabel, { color: t.brandGreen }]}>React</Text>
                    </Pressable>
                    {actionsAvailable && (
                      <Pressable
                        onPress={() => {
                          setReactionPickerMessageId(null);
                          setMessageActionsId((current) => current === message.id ? null : message.id);
                        }}
                        disabled={mutationPending}
                        accessibilityRole="button"
                        accessibilityLabel="Message actions"
                        accessibilityState={{ disabled: mutationPending, busy: mutationPending }}
                        style={styles.messageActionsButton}
                      >
                        {mutationPending ? (
                          <ActivityIndicator size="small" color={t.brandGreen} />
                        ) : (
                          <DotsThree size={18} color={t.brandGreen} weight="bold" />
                        )}
                      </Pressable>
                    )}
                  </View>
                  {messageActionsId === message.id && actionsAvailable && (
                    <View style={[styles.messageActionsMenu, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
                      <Pressable
                        onPress={() => beginEditing(message)}
                        accessibilityRole="button"
                        accessibilityLabel="Edit message"
                        style={styles.messageAction}
                      >
                        <PencilSimple size={16} color={t.inkStrong} />
                        <Text style={[styles.messageActionLabel, { color: t.inkStrong }]}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmUnsend(message)}
                        accessibilityRole="button"
                        accessibilityLabel="Unsend message"
                        style={styles.messageAction}
                      >
                        <Trash size={16} color={t.brandRed} />
                        <Text style={[styles.messageActionLabel, { color: t.brandRed }]}>Unsend</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {!managing && newMessageCount > 0 && (
        <Pressable
          onPress={() => {
            nearBottom.current = true;
            setNewMessageCount(0);
            scrollRef.current?.scrollToEnd({ animated: true });
            const latestOrdinal = messages.at(-1)?.ordinal ?? 0;
            if (visible && latestOrdinal > 0) onReachLatest(latestOrdinal);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${newMessageCount} new ${newMessageCount === 1 ? 'message' : 'messages'}. Jump to latest.`}
          style={[styles.newMessagesButton, { backgroundColor: t.surfaceAnchor }]}
        >
          <Text style={[styles.newMessagesText, { color: t.inkInverse }]}>New Messages · {newMessageCount}</Text>
        </Pressable>
      )}

      {!managing && (
      <View style={[styles.composer, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}>
        {editingMessage && (
          <View style={styles.editingHeader}>
            <View style={styles.editingHeaderText}>
              <Text style={[styles.editingLabel, { color: t.inkStrong }]}>Editing message</Text>
              <Text numberOfLines={1} style={[styles.editingPreview, { color: t.inkMuted }]}>{editingMessage.content}</Text>
            </View>
            <Pressable
              onPress={() => {
                setEditingMessageId(null);
                setEditContent('');
                setEditError(null);
              }}
              disabled={composerPending}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing message"
              style={styles.cancelEdit}
            >
              <X size={18} color={t.inkMuted} />
            </Pressable>
          </View>
        )}
        <View style={[styles.inputShell, { backgroundColor: t.surfacePage, borderColor: composerError ? t.brandRed : t.ruleHairline }]}>
          <TextInput
            ref={inputRef}
            value={composerContent}
            onChangeText={(value) => {
              if (editingMessage) {
                setEditContent(value);
                setEditError(null);
              } else {
                setContent(value);
                setSendError(null);
              }
            }}
            placeholder={editingMessage ? 'Edit message' : 'Write a message'}
            placeholderTextColor={t.inkFaint}
            style={[styles.input, { color: t.inkStrong }]}
            multiline
            maxLength={4_001}
            editable={!composerPending}
            accessibilityLabel={editingMessage ? 'Edit message' : 'Write a message'}
            textAlignVertical="top"
          />
          <View style={styles.composerFooter}>
            <Text accessibilityRole={composerError ? 'alert' : undefined} style={[styles.counter, { color: composerError ? t.brandRed : t.inkFaint }]}>
              {composerError ?? (validationError && composerContent.length > 0 ? validationError : `${composerContent.length.toLocaleString()}/4,000`)}
            </Text>
            <Pressable
              onPress={() => void submit()}
              disabled={invalid || composerPending}
              accessibilityRole="button"
              accessibilityLabel={editingMessage ? 'Save edited message' : 'Send message'}
              accessibilityState={{ disabled: invalid || composerPending, busy: composerPending }}
              style={[
                styles.send,
                editingMessage && styles.saveEdit,
                { backgroundColor: invalid || composerPending ? t.surfaceSoft : t.brandGreen },
              ]}
            >
              {composerPending ? (
                <ActivityIndicator size="small" color={t.inkInverse} />
              ) : (
                editingMessage ? (
                  <Text style={[styles.saveEditLabel, { color: invalid ? t.inkFaint : t.inkInverse }]}>Save</Text>
                ) : (
                  <PaperPlaneTilt size={17} color={invalid ? t.inkFaint : t.inkInverse} weight="fill" />
                )
              )}
            </Pressable>
          </View>
        </View>
      </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  threadHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  subtitle: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5 },
  manageButton: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  manageLabel: { fontFamily: sans(600), fontSize: 11.5 },
  inlineError: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  inlineErrorText: { fontFamily: sans(400), fontSize: 11.5 },
  managePanel: { flex: 1 },
  manageContent: { padding: 16, paddingBottom: 30 },
  manageHeading: { marginTop: 10, marginBottom: 8, fontFamily: sans(600), fontSize: 13.5 },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  renameInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 7, paddingHorizontal: 11, fontFamily: sans(400), fontSize: 13 },
  primaryAction: { minWidth: 64, height: 40, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryActionLabel: { fontFamily: sans(600), fontSize: 12 },
  memberRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, paddingVertical: 8 },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { fontFamily: sans(600), fontSize: 12.5 },
  memberMeta: { marginTop: 2, fontFamily: sans(400), fontSize: 10.5 },
  selectCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selectMark: { fontFamily: sans(700), fontSize: 12 },
  wideAction: { minHeight: 40, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 14 },
  actionError: { marginTop: 12, fontFamily: sans(400), fontSize: 11.5, lineHeight: 17 },
  leaveAction: { minHeight: 40, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingHorizontal: 14 },
  leaveLabel: { fontFamily: sans(600), fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 },
  stateTitle: { fontFamily: sans(600), fontSize: 15 },
  stateText: { maxWidth: 300, textAlign: 'center', fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  retry: { marginTop: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { fontFamily: sans(600), fontSize: 12 },
  transcript: { flex: 1 },
  transcriptContent: { flexGrow: 1, justifyContent: 'flex-end', gap: 12, padding: 16 },
  loadOlder: { alignSelf: 'center', minHeight: 36, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  loadOlderLabel: { fontFamily: sans(600), fontSize: 11.5 },
  emptyConversation: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 48 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '88%' },
  messageRowOwn: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageColumn: { flexShrink: 1, alignItems: 'flex-start' },
  messageColumnOwn: { alignItems: 'flex-end' },
  sender: { marginBottom: 4, marginLeft: 4, fontFamily: sans(500), fontSize: 11 },
  bubble: { borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleOwn: { borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleOther: { borderRadius: 16, borderBottomLeftRadius: 4 },
  messageText: { fontFamily: sans(400), fontSize: 14, lineHeight: 20 },
  reactionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  reactionChip: { minHeight: 26, borderWidth: 1, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 8 },
  reactionText: { fontFamily: sans(500), fontSize: 11 },
  reactionPicker: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, marginTop: 6, paddingHorizontal: 4, paddingVertical: 3 },
  reactionOption: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  reactionOptionText: { fontSize: 19 },
  messageMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reactLabel: { marginTop: 4, fontFamily: sans(600), fontSize: 10.5 },
  time: { marginTop: 4, paddingHorizontal: 4, fontFamily: sans(400), fontSize: 10.5 },
  messageActionsButton: { width: 44, height: 44, marginVertical: -12, alignItems: 'center', justifyContent: 'center' },
  messageActionsMenu: { flexDirection: 'row', alignSelf: 'flex-end', borderWidth: 1, borderRadius: 8, marginTop: 6, padding: 3 },
  messageAction: { minWidth: 88, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  messageActionLabel: { fontFamily: sans(600), fontSize: 11.5 },
  systemMessage: { alignSelf: 'center', paddingVertical: 4, fontFamily: sans(400), fontSize: 11.5 },
  newMessagesButton: { alignSelf: 'center', minHeight: 34, justifyContent: 'center', borderRadius: 17, marginVertical: 8, paddingHorizontal: 16 },
  newMessagesText: { fontFamily: sans(600), fontSize: 11.5 },
  composer: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  editingHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingBottom: 8 },
  editingHeaderText: { flex: 1, minWidth: 0 },
  editingLabel: { fontFamily: sans(600), fontSize: 11.5 },
  editingPreview: { marginTop: 2, fontFamily: sans(400), fontSize: 10.5 },
  cancelEdit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputShell: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  input: { minHeight: 44, maxHeight: 112, paddingHorizontal: 12, paddingTop: 10, fontFamily: sans(400), fontSize: 14 },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 6 },
  counter: { flex: 1, paddingHorizontal: 6, fontFamily: sans(400), fontSize: 10.5 },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  saveEdit: { width: 58, paddingHorizontal: 10 },
  saveEditLabel: { fontFamily: sans(600), fontSize: 11 },
});
