import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { CaretLeft, PaperPlaneTilt } from '../../ds/icons';
import { Avatar } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../../ds/tokens';
import { initials } from '../../lib/format';
import { conversationTitle, messageTimestamp, messagingParticipantName } from '../../lib/messages';

export interface ConversationThreadProps {
  currentMemberId: string;
  conversation: ConversationDetail | null;
  draftRecipient: MessagingParticipant | null;
  draftGroupParticipants: MessagingParticipant[];
  people: DirectoryPerson[];
  orgs: MemberOrg[];
  messages: MessageItem[];
  loading: boolean;
  loadingOlder: boolean;
  hasOlder: boolean;
  error: Error | null;
  sending: boolean;
  actionPending: boolean;
  onBack: () => void;
  onRetry: () => void;
  onSend: (content: string) => Promise<void>;
  onLoadOlder: () => Promise<void>;
  onSetReaction: (messageId: string, emoji: MessageReaction, active: boolean) => Promise<void>;
  onRename: (title: string) => Promise<void>;
  onAddMembers: (participantIds: string[]) => Promise<void>;
  onLeave: () => Promise<void>;
}

const REACTIONS: MessageReaction[] = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export default function ConversationThread({
  currentMemberId,
  conversation,
  draftRecipient,
  draftGroupParticipants,
  people,
  orgs,
  messages,
  loading,
  loadingOlder,
  hasOlder,
  error,
  sending,
  actionPending,
  onBack,
  onRetry,
  onSend,
  onLoadOlder,
  onSetReaction,
  onRename,
  onAddMembers,
  onLeave,
}: ConversationThreadProps) {
  const { t } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [content, setContent] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation?.title ?? '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const lastTailId = useRef<string | null>(null);
  const participants = conversation?.participants ?? (draftRecipient ? [draftRecipient] : draftGroupParticipants);
  const other = participants.find((participant) => !participant.isCurrentMember && !participant.hasLeft) ?? null;
  const title = conversation ? conversationTitle(conversation) : draftRecipient?.name ?? 'New message';
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const invalid = normalized.length === 0 || normalized.length > 4_000;
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
    const tailId = messages.at(-1)?.id ?? null;
    if (tailId === lastTailId.current) return;
    lastTailId.current = tailId;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  async function submit() {
    if (invalid || sending) return;
    const outgoing = normalized;
    setContent('');
    setSendError(null);
    try {
      await onSend(outgoing);
    } catch (cause) {
      setContent((current) => current || outgoing);
      setSendError(cause instanceof Error ? cause.message : 'Message not sent.');
    }
  }

  async function runAction(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'The conversation could not be updated.');
    }
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
          <Avatar initials={initials(other.name)} photoUrl={other.avatarUrl ?? undefined} size={36} />
        ) : null}
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={[styles.title, { color: t.inkStrong }]}>{title}</Text>
          <Text numberOfLines={1} style={[styles.subtitle, { color: t.inkMuted }]}>
            {other?.roleTitle || other?.organizationName || `${participants.length} participants`}
          </Text>
        </View>
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
        <View style={[styles.inlineError, { backgroundColor: t.surfaceSoft, borderBottomColor: t.ruleHairline }]}>
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
            <View key={participant.id} style={[styles.memberRow, { borderBottomColor: t.ruleHairline }]}>
              <Avatar initials={initials(participant.name)} photoUrl={participant.avatarUrl ?? undefined} size={32} />
              <View style={styles.memberText}>
                <Text style={[styles.memberName, { color: t.inkStrong }]}>{participant.name}</Text>
                <Text style={[styles.memberMeta, { color: t.inkMuted }]}>
                  {participant.hasLeft ? 'Left conversation' : participant.organizationName ?? participant.roleTitle ?? 'GPFA member'}
                </Text>
              </View>
            </View>
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
                    <Avatar initials={person.initials ?? initials(person.name)} photoUrl={person.photoUrl} size={32} />
                    <View style={styles.memberText}>
                      <Text style={[styles.memberName, { color: t.inkStrong }]}>{person.name}</Text>
                      <Text numberOfLines={1} style={[styles.memberMeta, { color: t.inkMuted }]}>
                        {[person.role, orgById.get(person.orgId)].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
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
            return (
              <View key={message.id} style={[styles.messageRow, own && styles.messageRowOwn]}>
                {!own && sender ? (
                  <Avatar initials={initials(sender.name)} photoUrl={sender.avatarUrl ?? undefined} size={28} />
                ) : null}
                <View style={[styles.messageColumn, own && styles.messageColumnOwn]}>
                  {!own && sender ? (
                    <Text style={[styles.sender, { color: t.inkMuted }]}>
                      {messagingParticipantName(sender)}
                    </Text>
                  ) : null}
                  <Pressable
                    onLongPress={() => setReactionPickerMessageId((current) => current === message.id ? null : message.id)}
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
                    <Text style={[styles.time, { color: t.inkFaint }]}>{messageTimestamp(message.createdAt)}</Text>
                    <Pressable
                      onPress={() => setReactionPickerMessageId((current) => current === message.id ? null : message.id)}
                      hitSlop={5}
                    >
                      <Text style={[styles.reactLabel, { color: t.brandGreen }]}>React</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {!managing && (
      <View style={[styles.composer, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}>
        <View style={[styles.inputShell, { backgroundColor: t.surfacePage, borderColor: sendError ? t.brandRed : t.ruleHairline }]}>
          <TextInput
            value={content}
            onChangeText={(value) => {
              setContent(value);
              setSendError(null);
            }}
            placeholder="Write a message"
            placeholderTextColor={t.inkFaint}
            style={[styles.input, { color: t.inkStrong }]}
            multiline
            maxLength={4_001}
            editable={!sending}
            textAlignVertical="top"
          />
          <View style={styles.composerFooter}>
            <Text style={[styles.counter, { color: sendError ? t.brandRed : t.inkFaint }]}>
              {sendError ?? `${content.length.toLocaleString()}/4,000`}
            </Text>
            <Pressable
              onPress={() => void submit()}
              disabled={invalid || sending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[
                styles.send,
                { backgroundColor: invalid || sending ? t.surfaceSoft : t.brandGreen },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={t.inkInverse} />
              ) : (
                <PaperPlaneTilt size={17} color={invalid ? t.inkFaint : t.inkInverse} weight="fill" />
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
  systemMessage: { alignSelf: 'center', paddingVertical: 4, fontFamily: sans(400), fontSize: 11.5 },
  composer: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  inputShell: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  input: { minHeight: 44, maxHeight: 112, paddingHorizontal: 12, paddingTop: 10, fontFamily: sans(400), fontSize: 14 },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 6 },
  counter: { flex: 1, paddingHorizontal: 6, fontFamily: sans(400), fontSize: 10.5 },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
