import { useMemo, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  ConversationDetail,
  ConversationSummary,
  DirectoryPerson,
  Member,
  MemberOrg,
  MessageItem,
  MessageReaction,
  MessagingParticipant,
} from '../../api/types';
import { ChatCircle, MagnifyingGlass, PencilSimple } from '../../ds/icons';
import { Avatar } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../../ds/tokens';
import { initials } from '../../lib/format';
import { conversationTitle, messageTimestamp } from '../../lib/messages';
import ConversationThread from './ConversationThread';

export interface MessagesInboxProps {
  member: Member;
  onOpenMemberProfile: (memberId: string) => void;
  people: DirectoryPerson[];
  orgs: MemberOrg[];
  conversations: ConversationSummary[];
  activeConversation: ConversationDetail | null;
  draftRecipient: MessagingParticipant | null;
  draftGroupParticipants: MessagingParticipant[];
  messages: MessageItem[];
  threadVisible: boolean;
  loading: boolean;
  error: Error | null;
  sending: boolean;
  resolvingMemberId: string | null;
  resolvingGroup: boolean;
  loadingOlderMessages: boolean;
  hasOlderMessages: boolean;
  actionPending: boolean;
  messageMutationPendingId: string | null;
  onOpenConversation: (conversationId: string) => void;
  onStartMessage: (memberId: string) => void;
  onStartGroupMessage: (memberIds: string[]) => Promise<void>;
  onCloseConversation: () => void;
  onRetryConversation: () => void;
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

export default function MessagesInbox({
  member,
  onOpenMemberProfile,
  people,
  orgs,
  conversations,
  activeConversation,
  draftRecipient,
  draftGroupParticipants,
  messages,
  threadVisible,
  loading,
  error,
  sending,
  resolvingMemberId,
  resolvingGroup,
  loadingOlderMessages,
  hasOlderMessages,
  actionPending,
  messageMutationPendingId,
  onOpenConversation,
  onStartMessage,
  onStartGroupMessage,
  onCloseConversation,
  onRetryConversation,
  onSend,
  onLoadOlder,
  onSetReaction,
  onEditMessage,
  onUnsendMessage,
  onRename,
  onAddMembers,
  onLeave,
  onReachLatest,
}: MessagesInboxProps) {
  const { t } = useTheme();
  const [composing, setComposing] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const orgById = useMemo(() => new Map(orgs.map((org) => [org.id, org.short])), [orgs]);
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      people
        .filter((person) => person.id !== member.id && person.name !== member.name)
        .filter((person) => {
          if (!q) return true;
          return `${person.name} ${person.role} ${orgById.get(person.orgId) ?? ''}`.toLowerCase().includes(q);
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [member.id, member.name, orgById, people, q]
  );

  async function openSelectedGroup() {
    if (selectedMemberIds.length < 2 || resolvingGroup) return;
    setComposeError(null);
    try {
      await onStartGroupMessage(selectedMemberIds);
    } catch (cause) {
      setComposeError(cause instanceof Error ? cause.message : 'The group message could not be opened.');
    }
  }

  if (activeConversation || draftRecipient || draftGroupParticipants.length > 0 || resolvingMemberId || resolvingGroup) {
    return (
      <ConversationThread
        currentMemberId={member.id}
        onOpenMemberProfile={onOpenMemberProfile}
        conversation={activeConversation}
        draftRecipient={draftRecipient}
        draftGroupParticipants={draftGroupParticipants}
        people={people}
        orgs={orgs}
        messages={messages}
        visible={threadVisible}
        loading={loading || resolvingMemberId !== null || resolvingGroup}
        loadingOlder={loadingOlderMessages}
        hasOlder={hasOlderMessages}
        error={error}
        sending={sending}
        actionPending={actionPending}
        messageMutationPendingId={messageMutationPendingId}
        onBack={onCloseConversation}
        onRetry={onRetryConversation}
        onSend={onSend}
        onLoadOlder={onLoadOlder}
        onSetReaction={onSetReaction}
        onEditMessage={onEditMessage}
        onUnsendMessage={onUnsendMessage}
        onRename={onRename}
        onAddMembers={onAddMembers}
        onLeave={onLeave}
        onReachLatest={onReachLatest}
      />
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePaper }]}>
      <View style={[styles.inboxHeader, { borderBottomColor: t.ruleHairline }]}>
        <View>
          <Text style={[styles.heading, { color: t.inkStrong }]}>Inbox</Text>
          <Text style={[styles.subheading, { color: t.inkMuted }]}>Private conversations with GPFA members</Text>
        </View>
        <Pressable
          onPress={() => setComposing((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel="New message"
          style={[styles.composeButton, { backgroundColor: t.brandGreen }]}
        >
          <PencilSimple size={16} color={t.inkInverse} />
          <Text style={[styles.composeLabel, { color: t.inkInverse }]}>New</Text>
        </Pressable>
      </View>

      {composing ? (
        <View style={styles.fill}>
          <View style={[styles.composeModes, { borderBottomColor: t.ruleHairline }]}>
            {(['Direct', 'Group'] as const).map((label) => {
              const selected = groupMode === (label === 'Group');
              return (
                <Pressable
                  key={label}
                  onPress={() => {
                    setGroupMode(label === 'Group');
                    setSelectedMemberIds([]);
                    setComposeError(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={[styles.modeButton, { backgroundColor: selected ? t.surfaceSoft : 'transparent' }]}
                >
                  <Text style={[styles.modeLabel, { color: selected ? t.inkStrong : t.inkMuted }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.searchBar, { backgroundColor: t.surfacePage, borderColor: t.ruleHairline }]}>
            <MagnifyingGlass size={15} color={t.inkMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search members"
              placeholderTextColor={t.inkFaint}
              style={[styles.searchInput, { color: t.inkStrong }]}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
            />
          </View>
          <FlashList
            data={matches}
            keyExtractor={(person) => person.id}
            style={styles.fill}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            extraData={{ groupMode, resolvingGroup, resolvingMemberId, selectedMemberIds }}
            ListHeaderComponent={(
              <Text style={[styles.sectionLabel, { color: t.inkMuted }]}>Members</Text>
            )}
            ListEmptyComponent={(
              <Text style={[styles.empty, { color: t.inkMuted }]}>No members match “{query.trim()}”.</Text>
            )}
            renderItem={({ item: person }) => (
              <Pressable
                onPress={() => {
                  if (!groupMode) {
                    onStartMessage(person.id);
                    return;
                  }
                  setSelectedMemberIds((current) =>
                    current.includes(person.id)
                      ? current.filter((id) => id !== person.id)
                      : current.length < 7
                        ? [...current, person.id]
                        : current
                  );
                  setComposeError(null);
                }}
                disabled={resolvingMemberId !== null || resolvingGroup}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: t.ruleHairline,
                    backgroundColor: pressed ? alpha(t.surfaceSoft, 0.55) : 'transparent',
                  },
                ]}
              >
                <Pressable
                  onPress={() => onOpenMemberProfile(person.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${person.name}'s profile`}
                  style={styles.identityAvatar}
                >
                  <Avatar initials={person.initials ?? initials(person.name)} photoUrl={person.photoUrl} size={38} />
                </Pressable>
                <Pressable
                  onPress={() => onOpenMemberProfile(person.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${person.name}'s profile`}
                  style={styles.rowMain}
                >
                  <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{person.name}</Text>
                  <Text numberOfLines={1} style={[styles.rowMeta, { color: t.inkMuted }]}>
                    {[person.role, orgById.get(person.orgId)].filter(Boolean).join(' · ')}
                  </Text>
                </Pressable>
                {resolvingMemberId === person.id ? (
                  <ActivityIndicator size="small" color={t.brandGreen} />
                ) : groupMode ? (
                  <View
                    style={[
                      styles.selection,
                      {
                        borderColor: selectedMemberIds.includes(person.id) ? t.brandGreen : t.ruleStrong,
                        backgroundColor: selectedMemberIds.includes(person.id) ? t.brandGreen : 'transparent',
                      },
                    ]}
                  >
                    {selectedMemberIds.includes(person.id) && (
                      <Text style={[styles.selectionMark, { color: t.inkInverse }]}>✓</Text>
                    )}
                  </View>
                ) : (
                  <ChatCircle size={19} color={t.brandGreen} />
                )}
              </Pressable>
            )}
          />
          {groupMode && (
            <View style={[styles.groupFooter, { borderTopColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
              <View style={styles.groupFooterText}>
                <Text style={[styles.groupCount, { color: t.inkStrong }]}>{selectedMemberIds.length} selected</Text>
                <Text style={[styles.groupHint, { color: composeError ? t.brandRed : t.inkMuted }]}>
                  {composeError ?? 'Choose 2–7 members.'}
                </Text>
              </View>
              <Pressable
                onPress={() => void openSelectedGroup()}
                disabled={selectedMemberIds.length < 2 || resolvingGroup}
                style={[
                  styles.groupStart,
                  { backgroundColor: selectedMemberIds.length < 2 ? t.surfaceSoft : t.brandGreen },
                ]}
              >
                {resolvingGroup ? (
                  <ActivityIndicator size="small" color={t.inkInverse} />
                ) : (
                  <Text style={[styles.groupStartLabel, { color: selectedMemberIds.length < 2 ? t.inkFaint : t.inkInverse }]}>Continue</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      ) : error && conversations.length > 0 ? (
        <View style={styles.fill}>
          <View style={[styles.errorBanner, { backgroundColor: t.surfaceSoft, borderBottomColor: t.ruleHairline }]}>
            <Text style={[styles.errorBannerText, { color: t.brandRed }]}>{error.message}</Text>
            <Pressable onPress={onRetryConversation} hitSlop={6}>
              <Text style={[styles.retryText, { color: t.brandGreen }]}>Retry</Text>
            </Pressable>
          </View>
          <ConversationRows
            conversations={conversations}
            onOpenConversation={onOpenConversation}
            onOpenMemberProfile={onOpenMemberProfile}
          />
        </View>
      ) : loading && conversations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.brandGreen} />
          <Text style={[styles.empty, { color: t.inkMuted }]}>Loading messages…</Text>
        </View>
      ) : error && conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>Messages could not be loaded</Text>
          <Pressable onPress={onRetryConversation} style={[styles.retry, { borderColor: t.ruleStrong }]}>
            <Text style={[styles.retryText, { color: t.inkStrong }]}>Try again</Text>
          </Pressable>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <ChatCircle size={34} color={t.ruleStrong} />
          <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No conversations yet</Text>
          <Text style={[styles.empty, { color: t.inkMuted }]}>Start a message with another GPFA member.</Text>
        </View>
      ) : (
        <ConversationRows
          conversations={conversations}
          onOpenConversation={onOpenConversation}
          onOpenMemberProfile={onOpenMemberProfile}
        />
      )}
    </View>
  );
}

function ConversationRows({
  conversations,
  onOpenConversation,
  onOpenMemberProfile,
}: {
  conversations: ConversationSummary[];
  onOpenConversation: (conversationId: string) => void;
  onOpenMemberProfile: (memberId: string) => void;
}) {
  const { t } = useTheme();
  return (
    <FlashList
      data={conversations}
      keyExtractor={(conversation) => conversation.id}
      style={styles.fill}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: conversation }) => {
        const other = conversation.participants.find(
          (participant) => !participant.isCurrentMember && !participant.hasLeft
        );
        return (
          <Pressable
            onPress={() => onOpenConversation(conversation.id)}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.ruleHairline,
                borderLeftColor: conversation.unreadCount ? t.brandGreen : 'transparent',
                backgroundColor: pressed ? alpha(t.surfaceSoft, 0.55) : 'transparent',
              },
            ]}
          >
            {conversation.kind === 'direct' && other ? (
              <Pressable
                onPress={() => onOpenMemberProfile(other.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${other.name}'s profile`}
                style={styles.identityAvatar}
              >
                <Avatar initials={initials(other.name)} photoUrl={other.avatarUrl ?? undefined} size={40} />
              </Pressable>
            ) : (
              <Avatar
                initials={initials(conversationTitle(conversation))}
                photoUrl={undefined}
                size={40}
              />
            )}
            <Pressable
              onPress={() => onOpenConversation(conversation.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${conversationTitle(conversation)}`}
              style={styles.rowMain}
            >
              <Text numberOfLines={1} style={[styles.rowTitle, { color: t.inkStrong }]}>
                {conversationTitle(conversation)}
              </Text>
              <Text numberOfLines={1} style={[styles.preview, { color: t.inkMuted }]}>
                {conversation.lastMessage?.content ?? 'No messages yet'}
              </Text>
            </Pressable>
            <View style={styles.rowRail}>
              <Text style={[styles.time, { color: t.inkFaint }]}>{messageTimestamp(conversation.lastMessageAt)}</Text>
              {conversation.unreadCount > 0 && (
                <View style={[styles.unread, { backgroundColor: t.brandGreen }]}>
                  <Text style={[styles.unreadText, { color: t.inkInverse }]}>{conversation.unreadCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  inboxHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  heading: { fontFamily: sans(600), fontSize: 17, letterSpacing: trackDisplay(17) },
  subheading: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5 },
  composeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  composeLabel: { fontFamily: sans(600), fontSize: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 19, borderWidth: 1, margin: 14, paddingHorizontal: 12 },
  composeModes: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 10, borderBottomWidth: 1 },
  modeButton: { flex: 1, alignItems: 'center', borderRadius: 6, paddingVertical: 8, marginBottom: 10 },
  modeLabel: { fontFamily: sans(600), fontSize: 12 },
  searchInput: { flex: 1, height: '100%', padding: 0, fontFamily: sans(400), fontSize: 13 },
  sectionLabel: { paddingHorizontal: 20, paddingBottom: 7, fontFamily: sans(600), fontSize: 11.5 },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingRight: 18, paddingLeft: 17, borderBottomWidth: 1, borderLeftWidth: 3 },
  rowMain: { flex: 1, minWidth: 0 },
  identityAvatar: { flexShrink: 0 },
  rowTitle: { fontFamily: sans(600), fontSize: 13.5, letterSpacing: trackDisplay(13.5) },
  rowMeta: { marginTop: 3, fontFamily: sans(400), fontSize: 11.5 },
  selection: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selectionMark: { fontFamily: sans(700), fontSize: 12 },
  groupFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, padding: 12 },
  groupFooterText: { flex: 1 },
  groupCount: { fontFamily: sans(600), fontSize: 12 },
  groupHint: { marginTop: 2, fontFamily: sans(400), fontSize: 10.5 },
  groupStart: { minWidth: 92, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  groupStartLabel: { fontFamily: sans(600), fontSize: 12 },
  preview: { marginTop: 3, fontFamily: sans(400), fontSize: 12 },
  rowRail: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  time: { fontFamily: sans(400), fontSize: 10.5 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { fontFamily: sans(600), fontSize: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 28 },
  emptyTitle: { fontFamily: sans(600), fontSize: 15 },
  empty: { textAlign: 'center', fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  retry: { marginTop: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { fontFamily: sans(600), fontSize: 12 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1 },
  errorBannerText: { flex: 1, fontFamily: sans(400), fontSize: 12 },
});
