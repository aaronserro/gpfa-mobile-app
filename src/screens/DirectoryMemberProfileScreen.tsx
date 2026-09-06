import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  DirectoryMemberProfile,
  MemberProfileActivityItem,
  MemberProfileActivityKind,
  MemberProfileActivityPage,
} from '../api/types';
import BlockMemberAction from '../components/directory/BlockMemberAction';
import { ChatCircle, CaretLeft, CaretRight, DotsThree } from '../ds/icons';
import { Avatar, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';
import { initials as initialsOf } from '../lib/format';

const ACTIVITY_TABS: { id: MemberProfileActivityKind; label: string }[] = [
  { id: 'posts', label: 'Posts' },
  { id: 'replies', label: 'Replies' },
  { id: 'reposts', label: 'Reposts' },
];

export interface DirectoryMemberProfileScreenProps {
  profile: DirectoryMemberProfile | null;
  loading: boolean;
  error: Error | null;
  activityKind: MemberProfileActivityKind;
  activity: MemberProfileActivityPage | null;
  activityLoading: boolean;
  activityError: Error | null;
  onBack: () => void;
  onRetry: () => void;
  onSelectActivityKind: (kind: MemberProfileActivityKind) => void;
  onActivityPage: (page: number) => void;
  onOpenActivity: (item: MemberProfileActivityItem) => void;
  onOpenWorkingGroup: (groupSlug: string) => void;
  onOpenEvent: (event: NonNullable<DirectoryMemberProfile['events']>[number]) => void;
  onOpenOrganization: (organizationId: string) => void;
  onMessage?: (memberId: string) => void;
  blockPending: boolean;
  onBlockMember: (memberId: string) => Promise<void>;
  onEdit?: () => void;
}

export default function DirectoryMemberProfileScreen({
  profile,
  loading,
  error,
  activityKind,
  activity,
  activityLoading,
  activityError,
  onBack,
  onRetry,
  onSelectActivityKind,
  onActivityPage,
  onOpenActivity,
  onOpenWorkingGroup,
  onOpenEvent,
  onOpenOrganization,
  onMessage,
  blockPending,
  onBlockMember,
  onEdit,
}: DirectoryMemberProfileScreenProps) {
  const { t } = useTheme();
  const [actionsOpen, setActionsOpen] = useState(false);

  if (loading && !profile) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: t.surfacePage }]}>
        <ActivityIndicator color={t.brandGreen} />
        <Text style={[styles.statusText, { color: t.inkMuted }]}>Loading member profile…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
        <ScreenHeader title="Member profile" onBack={onBack} backLabel="Back" />
        <View style={[styles.center, styles.errorWrap]}>
          <Text style={[styles.error, { color: t.brandRed }]}>This member profile is unavailable.</Text>
          <Pressable onPress={onRetry} style={[styles.outlineButton, { borderColor: t.ruleHairline }]}>
            <Text style={[styles.buttonText, { color: t.brandGreen }]}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const memberSince = new Date(profile.memberSince).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title={profile.fullName} onBack={onBack} backLabel="Back" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.identityCard, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <Avatar
            initials={initialsOf(profile.fullName)}
            photoUrl={profile.avatarUrl ?? undefined}
            size={68}
          />
          <Text style={[styles.name, { color: t.inkStrong }]}>{profile.fullName}</Text>
          <Text style={[styles.role, { color: t.inkBody }]}>{profile.roleTitle}</Text>
          <MastheadMeta size={9.5} style={styles.meta}>
            {`${profile.organization.abbreviation} · ${profile.country} · MEMBER SINCE ${memberSince}`.toUpperCase()}
          </MastheadMeta>
          <View style={styles.actions}>
            {profile.isSelf ? (
              <Pressable onPress={onEdit} style={[styles.primaryButton, { backgroundColor: t.surfaceAnchor }]}>
                <Text style={[styles.primaryButtonText, { color: t.inkInverse }]}>Edit profile</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${profile.fullName}`}
                  onPress={() => onMessage?.(profile.id)}
                  style={[styles.primaryButton, { backgroundColor: t.surfaceAnchor }]}
                >
                  <ChatCircle size={17} color={t.inkInverse} />
                  <Text style={[styles.primaryButtonText, { color: t.inkInverse }]}>Message</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`More actions for ${profile.fullName}`}
                  accessibilityState={{ expanded: actionsOpen }}
                  onPress={() => setActionsOpen((current) => !current)}
                  style={[styles.moreButton, { borderColor: t.ruleStrong, backgroundColor: t.surfacePaper }]}
                >
                  <DotsThree size={20} color={t.inkStrong} weight="bold" />
                </Pressable>
              </>
            )}
          </View>
          {!profile.isSelf && actionsOpen ? (
            <View style={styles.actionMenu}>
              <BlockMemberAction
                member={{ id: profile.id, name: profile.fullName }}
                mode="block"
                pending={blockPending}
                onBlock={async (memberId) => {
                  await onBlockMember(memberId);
                  onBack();
                }}
                onUnblock={async () => undefined}
              />
            </View>
          ) : null}
        </View>

        {profile.bio ? (
          <Section title="About">
            <Text style={[styles.body, { color: t.inkBody }]}>{profile.bio}</Text>
          </Section>
        ) : null}

        {profile.skills.length > 0 ? (
          <Section title="Expertise">
            <View style={styles.tags}>
              {profile.skills.map((skill) => (
                <View key={skill} style={[styles.tag, { backgroundColor: t.surfaceSoft, borderColor: t.ruleHairline }]}>
                  <Text style={[styles.tagText, { color: t.inkBody }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Activity">
          <View style={[styles.tabs, { borderColor: t.ruleHairline }]}>
            {ACTIVITY_TABS.map((tab) => {
              const selected = tab.id === activityKind;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => onSelectActivityKind(tab.id)}
                  style={[styles.tab, selected && { backgroundColor: t.surfaceAnchor }]}
                >
                  <Text style={[styles.tabText, { color: selected ? t.inkInverse : t.inkMuted }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {activityLoading ? <ActivityIndicator color={t.brandGreen} style={styles.activityStatus} /> : null}
          {activityError ? (
            <Text style={[styles.activityStatus, styles.error, { color: t.brandRed }]}>Activity could not be loaded.</Text>
          ) : null}
          {!activityLoading && !activityError && activity?.items.length === 0 ? (
            <Text style={[styles.empty, { color: t.inkMuted }]}>No {activityKind} to show.</Text>
          ) : null}
          <View style={styles.activityList}>
            {activity?.items.map((item) => (
              <Pressable
                key={item.activityId}
                onPress={() => onOpenActivity(item)}
                style={({ pressed }) => [
                  styles.activityCard,
                  {
                    backgroundColor: pressed ? alpha(t.surfaceSoft, 0.5) : t.surfacePaper,
                    borderColor: t.ruleHairline,
                  },
                ]}
              >
                <MastheadMeta size={9}>{`${item.groupName} · ${item.kind}`.toUpperCase()}</MastheadMeta>
                <Text style={[styles.activityTitle, { color: t.inkStrong }]}>{item.title || item.parentTitle || 'Reply'}</Text>
                {item.excerpt ? <Text numberOfLines={3} style={[styles.body, { color: t.inkMuted }]}>{item.excerpt}</Text> : null}
              </Pressable>
            ))}
          </View>
          {activity && activity.totalItems > activity.pageSize ? (
            <View style={styles.pagination}>
              <Pressable
                disabled={activity.page === 1}
                onPress={() => onActivityPage(activity.page - 1)}
                style={[styles.pageButton, { borderColor: t.ruleHairline, opacity: activity.page === 1 ? 0.4 : 1 }]}
              >
                <CaretLeft size={14} color={t.inkBody} />
                <Text style={[styles.pageText, { color: t.inkBody }]}>Previous</Text>
              </Pressable>
              <Text style={[styles.pageText, { color: t.inkMuted }]}>Page {activity.page}</Text>
              <Pressable
                disabled={!activity.hasMore}
                onPress={() => onActivityPage(activity.page + 1)}
                style={[styles.pageButton, { borderColor: t.ruleHairline, opacity: activity.hasMore ? 1 : 0.4 }]}
              >
                <Text style={[styles.pageText, { color: t.inkBody }]}>Next</Text>
                <CaretRight size={14} color={t.inkBody} />
              </Pressable>
            </View>
          ) : null}
        </Section>

        <Section title="Working groups" count={profile.workingGroups.length}>
          {profile.workingGroups.length === 0 ? (
            <Text style={[styles.empty, { color: t.inkMuted }]}>No working groups to show.</Text>
          ) : (
            <View style={styles.activityList}>
              {profile.workingGroups.map((group) => (
                <Pressable
                  key={group.slug}
                  onPress={() => onOpenWorkingGroup(group.slug)}
                  style={({ pressed }) => [styles.groupCard, { backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper, borderColor: t.ruleHairline }]}
                >
                  <Text style={[styles.groupName, { color: t.inkStrong }]}>{group.name}</Text>
                  <Text style={[styles.body, { color: t.inkMuted }]}>{group.description}</Text>
                  <MastheadMeta size={9} style={styles.meta}>{`${group.role} · ${group.postCount} POSTS`}</MastheadMeta>
                </Pressable>
              ))}
            </View>
          )}
        </Section>

        {profile.isSelf && profile.events ? (
          <Section title="Events" count={profile.events.length}>
            {profile.events.length === 0 ? (
              <Text style={[styles.empty, { color: t.inkMuted }]}>Your RSVP events appear here.</Text>
            ) : (
              <View style={styles.activityList}>
                {profile.events.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() => onOpenEvent(event)}
                    style={({ pressed }) => [styles.groupCard, { backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper, borderColor: t.ruleHairline }]}
                  >
                    <MastheadMeta size={9}>{`${event.timing} · ${event.sourceLabel}`.toUpperCase()}</MastheadMeta>
                    <Text style={[styles.groupName, { color: t.inkStrong }]}>{event.title}</Text>
                    <Text style={[styles.body, { color: t.inkMuted }]}>{new Date(event.startsAt).toLocaleString()}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Section>
        ) : null}

        <Section title="Organization">
          <Pressable
            onPress={() => onOpenOrganization(profile.organization.id)}
            style={({ pressed }) => [styles.orgCard, { backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper, borderColor: t.ruleHairline }]}
          >
            <View style={styles.flex}>
              <Text style={[styles.groupName, { color: t.inkStrong }]}>{profile.organization.name}</Text>
              <MastheadMeta size={9} style={styles.meta}>{`${profile.organization.organizationType} · ${profile.organization.country}`.toUpperCase()}</MastheadMeta>
            </View>
            <CaretRight size={15} color={t.inkFaint} />
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: t.inkStrong }]}>{title}</Text>
        {count !== undefined ? <Text style={[styles.sectionCount, { color: t.inkMuted }]}>{count}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorWrap: { flex: 1, padding: 24 },
  scroll: { padding: 20, paddingBottom: 36, gap: 20 },
  identityCard: { alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 20 },
  name: { marginTop: 12, fontFamily: sans(600), fontSize: 21, letterSpacing: trackDisplay(21) },
  role: { marginTop: 5, textAlign: 'center', fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  meta: { marginTop: 6 },
  actions: { marginTop: 16, flexDirection: 'row', gap: 8 },
  actionMenu: { alignSelf: 'stretch', marginTop: 10 },
  primaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 7, paddingHorizontal: 17 },
  moreButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7 },
  primaryButtonText: { fontFamily: sans(600), fontSize: 13 },
  outlineButton: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 15 },
  buttonText: { fontFamily: sans(600), fontSize: 12 },
  statusText: { fontFamily: sans(400), fontSize: 13 },
  error: { textAlign: 'center', fontFamily: sans(400), fontSize: 13 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: sans(600), fontSize: 14, letterSpacing: trackDisplay(14) },
  sectionCount: { fontFamily: mono(400), fontSize: 11 },
  body: { fontFamily: sans(400), fontSize: 12.5, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontFamily: sans(500), fontSize: 11 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 7, padding: 3 },
  tab: { flex: 1, alignItems: 'center', borderRadius: 5, paddingVertical: 8 },
  tabText: { fontFamily: sans(600), fontSize: 11.5 },
  activityStatus: { marginVertical: 16 },
  activityList: { gap: 9 },
  activityCard: { borderWidth: 1, borderRadius: 8, padding: 13, gap: 6 },
  activityTitle: { fontFamily: sans(600), fontSize: 13.5, lineHeight: 19 },
  empty: { borderWidth: 1, borderColor: 'transparent', paddingVertical: 14, textAlign: 'center', fontFamily: sans(400), fontSize: 12.5 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10 },
  pageText: { fontFamily: sans(500), fontSize: 11.5 },
  groupCard: { borderWidth: 1, borderRadius: 8, padding: 13, gap: 4 },
  groupName: { fontFamily: sans(600), fontSize: 13.5, lineHeight: 19 },
  orgCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, padding: 14 },
});
