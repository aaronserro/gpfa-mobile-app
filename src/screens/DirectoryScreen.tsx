/**
 * The Directory tab — a dense index of member organizations, with a profile
 * behind each row.
 *
 * From the Member Directory design, option 1c (index) and 1d (profile). Search
 * covers organizations by name and country; people are only searched once
 * something is typed, so the resting state is the institutional index.
 */
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Buildings,
  CaretRight,
  ChartBar,
  CrownSimple,
  MagnifyingGlass,
  PiggyBank,
  type Icon,
} from '../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Avatar, Chip, OrgMark, PageActions, PageHead } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, headerTop, orgSectorRule, sans, trackDisplay } from '../ds/tokens';
import type { OrgSector } from '../ds/tokens';
import { initials as initialsOf } from '../lib/format';
import OrgProfile from '../components/directory/OrgProfile';
import MessagesInbox from '../components/directory/MessagesInbox';
import type {
  ConversationDetail,
  ConversationSummary,
  DirectoryPerson,
  JobListing,
  Member,
  MemberOrg,
  MessageItem,
  MessageReaction,
  MessagingParticipant,
} from '../api/types';

type DirectoryTab = 'directory' | 'messages';

/**
 * A listing belongs to an organization when its `org` matches any of the names
 * the directory knows it by. The two endpoints carry display strings rather
 * than a shared id, so this is the join — keep the strings identical.
 */
export function jobsForOrg(jobs: JobListing[], org: MemberOrg): JobListing[] {
  const names = [org.name, org.short, org.fullName].filter(Boolean).map((n) => n!.toLowerCase());
  return jobs.filter((j) => names.includes(j.org.toLowerCase()));
}

export interface DirectoryScreenProps {
  member: Member;
  /** Returns from the Directory root to its parent navigation surface. */
  /** Alphabetical by `name` — the index groups them but does not sort them. */
  orgs: MemberOrg[];
  /** Everyone in the directory, flat; `orgId` joins each to an organization. */
  people: DirectoryPerson[];
  /** Open roles, for a profile's Jobs tab and its Open roles stat. */
  jobs: JobListing[];
  /**
   * Opens straight onto one organization's profile, for another screen linking
   * in. Read once — remount the screen (a new `key`) to ask for a different one.
   */
  initialOrgId?: string | null;
  /** Starts on Messages when navigation has already resolved a conversation. */
  initialTab?: DirectoryTab;
  /** False while another top-level portal tab is covering this mounted screen. */
  isActive?: boolean;
  /** Opens a role on the job board. Absent leaves a profile's job rows inert. */
  onOpenJob?: (job: JobListing) => void;
  /** Opens the selected member's full profile. */
  onOpenMemberProfile: (memberId: string) => void;
  conversations: ConversationSummary[];
  activeConversation: ConversationDetail | null;
  draftRecipient: MessagingParticipant | null;
  draftGroupParticipants: MessagingParticipant[];
  messages: MessageItem[];
  messagesLoading: boolean;
  messagesError: Error | null;
  messageSending: boolean;
  resolvingMemberId: string | null;
  resolvingGroup: boolean;
  loadingOlderMessages: boolean;
  hasOlderMessages: boolean;
  messageActionPending: boolean;
  messageMutationPendingId: string | null;
  pendingBlockedMemberId: string | null;
  onOpenConversation: (conversationId: string) => void;
  onStartMessage: (memberId: string) => void;
  onStartGroupMessage: (memberIds: string[]) => Promise<void>;
  onCloseConversation: () => void;
  onRetryConversation: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onLoadOlderMessages: () => Promise<void>;
  onSetMessageReaction: (messageId: string, emoji: MessageReaction, active: boolean) => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onUnsendMessage: (messageId: string) => Promise<void>;
  onRenameConversation: (title: string) => Promise<void>;
  onAddConversationMembers: (participantIds: string[]) => Promise<void>;
  onLeaveConversation: () => Promise<void>;
  onBlockMember: (memberId: string) => Promise<void>;
  onUnblockMember: (memberId: string) => Promise<void>;
  onReachLatestMessage: (ordinal: number) => void;
}

/** The chip glyph per sector, paired with the rule colour that sector already owns. */
const SECTOR_GLYPH: Record<OrgSector, Icon> = {
  'Pension Fund': PiggyBank,
  'Sovereign Wealth Fund': CrownSimple,
  'Insurance Asset Manager': Buildings,
  'Asset Manager': ChartBar,
};
const sectorGlyph = (sector: OrgSector): Icon => SECTOR_GLYPH[sector];

/** The chip says the kind, not the full sector name — the card has little width. */
const SECTOR_LABEL: Record<OrgSector, string> = {
  'Pension Fund': 'Pension',
  'Sovereign Wealth Fund': 'Sovereign',
  'Insurance Asset Manager': 'Insurance',
  'Asset Manager': 'Asset manager',
};

export default function DirectoryScreen({
  member,
  orgs,
  people,
  jobs,
  initialOrgId = null,
  initialTab = 'directory',
  isActive = true,
  onOpenJob,
  onOpenMemberProfile,
  conversations,
  activeConversation,
  draftRecipient,
  draftGroupParticipants,
  messages,
  messagesLoading,
  messagesError,
  messageSending,
  resolvingMemberId,
  resolvingGroup,
  loadingOlderMessages,
  hasOlderMessages,
  messageActionPending,
  messageMutationPendingId,
  pendingBlockedMemberId,
  onOpenConversation,
  onStartMessage,
  onStartGroupMessage,
  onCloseConversation,
  onRetryConversation,
  onSendMessage,
  onLoadOlderMessages,
  onSetMessageReaction,
  onEditMessage,
  onUnsendMessage,
  onRenameConversation,
  onAddConversationMembers,
  onLeaveConversation,
  onBlockMember,
  onUnblockMember,
  onReachLatestMessage,
}: DirectoryScreenProps) {
  const { t } = useTheme();

  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [orgId, setOrgId] = useState<string | null>(initialOrgId);
  const [section, setSection] = useState<DirectoryTab>(initialTab);

  // Members / Messages also swaps on a horizontal swipe, so the switch above
  // is a signpost rather than the only way across.
  const sectionSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-16, 16])
        .onEnd((e) => {
          if (e.translationX < -56) runOnJS(setSection)('messages');
          else if (e.translationX > 56) runOnJS(setSection)('directory');
        }),
    []
  );

  const q = query.trim().toLowerCase();
  const openOrg = orgId ? orgs.find((o) => o.id === orgId) ?? null : null;

  // Flat and in the order the API sent it — the index used to break this into
  // A–Z runs, but the letter headings went with the rest of the eyebrows.
  const matchedOrgs = useMemo(
    () =>
      q
        ? orgs.filter(
            (o) =>
              o.name.toLowerCase().includes(q) ||
              o.country.toLowerCase().includes(q) ||
              (o.fullName ?? '').toLowerCase().includes(q)
          )
        : orgs,
    [orgs, q]
  );

  // People only enter the index once there is a query — otherwise the resting
  // view is organizations. Sorted by name; the flat list is in profile order.
  const matchedPeople = useMemo(() => {
    if (!q) return [];
    const orgName = new Map(orgs.map((o) => [o.id, o.short]));
    return people
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (orgName.get(p.orgId) ?? '').toLowerCase().includes(q)
      )
      .map((p) => ({ ...p, meta: `${p.role} · ${orgName.get(p.orgId) ?? ''}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orgs, people, q]);

  const orgCount = matchedOrgs.length;

  const openMessagesFor = (memberId: string) => {
    setOrgId(null);
    setSection('messages');
    onStartMessage(memberId);
  };

  if (openOrg && section === 'directory') {
    return (
      <OrgProfile
        org={openOrg}
        people={people.filter((p) => p.orgId === openOrg.id)}
        jobs={jobsForOrg(jobs, openOrg)}
        onBack={() => setOrgId(null)}
        onOpenJob={onOpenJob}
        onOpenPerson={onOpenMemberProfile}
        onMessagePerson={openMessagesFor}
      />
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePaper }]}>
      <PageHead actions={<PageActions />} title="Member " em="directory.">
        <View style={styles.tabs}>
          {(
            [
              ['directory', 'Members'],
              ['messages', 'Messages'],
            ] as [DirectoryTab, string][]
          ).map(([id, label]) => {
            const selected = section === id;
            const unread = id === 'messages'
              ? conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)
              : 0;
            return (
              <Pressable
                key={id}
                onPress={() => setSection(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.tab, { borderBottomColor: selected ? t.surfaceAnchor : 'transparent' }]}
              >
                <Text style={[styles.tabLabel, { color: selected ? t.inkStrong : t.inkFaint }]}>{label}</Text>
                {unread > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: t.brandGreen }]}>
                    <Text style={[styles.tabBadgeText, { color: t.inkInverse }]}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </PageHead>
      <GestureDetector gesture={sectionSwipe}>
      <View style={styles.fill}>
      {section === 'messages' ? (
        <MessagesInbox
          member={member}
          onOpenMemberProfile={onOpenMemberProfile}
          people={people}
          orgs={orgs}
          conversations={conversations}
          activeConversation={activeConversation}
          draftRecipient={draftRecipient}
          draftGroupParticipants={draftGroupParticipants}
          messages={messages}
          threadVisible={isActive}
          loading={messagesLoading}
          error={messagesError}
          sending={messageSending}
          resolvingMemberId={resolvingMemberId}
          resolvingGroup={resolvingGroup}
          loadingOlderMessages={loadingOlderMessages}
          hasOlderMessages={hasOlderMessages}
          actionPending={messageActionPending}
          messageMutationPendingId={messageMutationPendingId}
          pendingBlockedMemberId={pendingBlockedMemberId}
          onOpenConversation={onOpenConversation}
          onStartMessage={openMessagesFor}
          onStartGroupMessage={onStartGroupMessage}
          onCloseConversation={onCloseConversation}
          onRetryConversation={onRetryConversation}
          onSend={onSendMessage}
          onLoadOlder={onLoadOlderMessages}
          onSetReaction={onSetMessageReaction}
          onEditMessage={onEditMessage}
          onUnsendMessage={onUnsendMessage}
          onRename={onRenameConversation}
          onAddMembers={onAddConversationMembers}
          onLeave={onLeaveConversation}
          onBlockMember={onBlockMember}
          onUnblockMember={onUnblockMember}
          onReachLatest={onReachLatestMessage}
        />
      ) : (
      <ScrollView
        style={{ backgroundColor: t.surfacePaper }}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchWrap}>
          <View style={[styles.searchBar, { backgroundColor: t.surfacePaper, borderColor: t.rule }]}>
            <MagnifyingGlass size={16} color={t.inkMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search organizations or people"
              placeholderTextColor={t.inkMuted}
              style={[styles.searchInput, { color: t.inkStrong }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>
        <Text style={[styles.count, { color: t.inkMuted }]}>
          {matchedOrgs.length} {matchedOrgs.length === 1 ? 'organization' : 'organizations'}
        </Text>
        <View style={styles.cards}>
          {matchedOrgs.map((o) => {
            const roster = people.filter((person) => person.orgId === o.id);
            return (
              <View
                key={o.id}
                style={[styles.card, { backgroundColor: t.surfacePaper, borderColor: t.rule }]}
              >
                <Pressable
                  onPress={() => setOrgId(o.id)}
                  accessibilityRole="button"
                  accessibilityLabel={o.fullName ?? o.name}
                  android_ripple={{ color: alpha(t.inkStrong, 0.08) }}
                  style={({ pressed }) => [
                    styles.cardBody,
                    pressed && Platform.OS !== 'android'
                      ? { backgroundColor: t.surfaceSubtle }
                      : null,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <OrgMark initials={o.short} logoUrl={o.logoUrl} size={46} />
                    <View style={styles.flex}>
                      <Text style={[styles.orgName, { color: t.inkStrong }]}>
                        {o.fullName ?? o.name}
                      </Text>
                      <View style={styles.cardChips}>
                        <Chip Glyph={sectorGlyph(o.sector)} glyphColor={orgSectorRule(t, o.sector)}>
                          {SECTOR_LABEL[o.sector]}
                        </Chip>
                        <Chip>{o.country}</Chip>
                      </View>
                    </View>
                  </View>
                  {!!o.blurb && (
                    <Text numberOfLines={2} style={[styles.orgBlurb, { color: t.inkMuted }]}>
                      {o.blurb}
                    </Text>
                  )}
                </Pressable>

                <View style={[styles.cardFoot, { borderTopColor: t.rule }]}>
                  <View style={styles.avatars}>
                    {roster.slice(0, 3).map((person, index) => (
                      <View key={person.id} style={index > 0 ? styles.avatarStacked : null}>
                        <Avatar
                          initials={person.initials ?? initialsOf(person.name)}
                          photoUrl={person.photoUrl}
                          size={28}
                        />
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.memberCount, { color: t.inkBody }]}>
                    {o.members} {o.members === 1 ? 'member' : 'members'}
                  </Text>
                </View>
              </View>
            );
          })}

          {matchedPeople.map((p) => (
            <View
              key={p.id}
              style={[styles.card, { backgroundColor: t.surfacePaper, borderColor: t.rule }]}
            >
              <Pressable
                onPress={() => onOpenMemberProfile(p.id)}
                accessibilityRole="button"
                android_ripple={{ color: alpha(t.inkStrong, 0.08) }}
                style={({ pressed }) => [
                  styles.personRow,
                  pressed && Platform.OS !== 'android'
                    ? { backgroundColor: t.surfaceSubtle }
                    : null,
                ]}
              >
                <Avatar
                  initials={p.initials ?? initialsOf(p.name)}
                  photoUrl={p.photoUrl}
                  size={40}
                />
                <View style={styles.flex}>
                  <Text style={[styles.personName, { color: t.inkStrong }]}>{p.name}</Text>
                  <Text numberOfLines={1} style={[styles.personMeta, { color: t.inkMuted }]}>
                    {p.meta}
                  </Text>
                </View>
                <CaretRight size={16} color={t.ruleStrong} />
              </Pressable>
              <View style={[styles.cardFoot, { borderTopColor: t.rule }]}>
                <Pressable
                  onPress={() => openMessagesFor(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${p.name}`}
                  hitSlop={6}
                  style={({ pressed }) => (pressed ? styles.pressed : null)}
                >
                  <Text style={[styles.messageActionText, { color: t.brandGreen }]}>Message</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {orgCount === 0 && matchedPeople.length === 0 && (
          <Text style={[styles.empty, { color: t.inkMuted }]}>
            {q ? `Nothing in the directory matches “${query.trim()}”.` : 'The directory is empty.'}
          </Text>
        )}
      </ScrollView>
      )}
      </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  tabs: { flexDirection: 'row', gap: 22, paddingTop: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottomWidth: 2 },
  tabLabel: { fontFamily: sans(600), fontSize: 14.5 },
  tabBadge: { minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeText: { fontFamily: sans(600), fontSize: 9.5 },

  topStrip: { paddingHorizontal: 16, borderBottomWidth: 1 },
  stripSpacer: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: sans(400),
    fontSize: 15,
  },

  list: { paddingBottom: 24 },
  count: { paddingTop: 16, paddingHorizontal: 16, fontFamily: sans(400), fontSize: 14 },

  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  cards: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  cardBody: { padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  orgName: {
    fontFamily: sans(600),
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: trackDisplay(18),
  },
  cardChips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orgBlurb: { marginTop: 12, fontFamily: sans(400), fontSize: 14.5, lineHeight: 22 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatars: { flexDirection: 'row' },
  // The stack overlaps by a third so three fit without crowding the count.
  avatarStacked: { marginLeft: -8 },
  memberCount: { fontFamily: sans(400), fontSize: 14 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  personName: { fontFamily: sans(600), fontSize: 16 },
  personMeta: { marginTop: 3, fontFamily: sans(400), fontSize: 14 },
  messageActionText: { fontFamily: sans(600), fontSize: 14 },

  empty: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 14.5,
  },
});
