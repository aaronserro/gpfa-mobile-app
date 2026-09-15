/**
 * Directory → one member organization.
 *
 * Presentational: the org, its people and its open roles all arrive resolved.
 * The page follows the same hierarchy as other member screens: title, back
 * action and global controls first, followed by organization stats and tabs.
 */
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { ArrowRight, ChatCircle } from '../../ds/icons';
import { Avatar, OrgMark, PageActions, PageHead, StickyTitle, SwipeBack, useStickyScroll } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, jobFunctionRule, sans, trackDisplay } from '../../ds/tokens';
import { initials as initialsOf, orgInitials } from '../../lib/format';
import type { DirectoryPerson, JobListing, MemberOrg } from '../../api/types';

type ProfileTab = 'members' | 'jobs';

export interface OrgProfileProps {
  org: MemberOrg;
  /** The organization's own people, in the order they should be listed. */
  people: DirectoryPerson[];
  /** The organization's open roles — also the source of the Open roles stat. */
  jobs: JobListing[];
  onBack: () => void;
  /** Opens a role on the job board. Absent leaves the rows inert. */
  onOpenJob?: (job: JobListing) => void;
  onOpenPerson: (memberId: string) => void;
  onMessagePerson: (memberId: string) => void;
}

export default function OrgProfile({ org, people, jobs, onBack, onOpenJob, onOpenPerson, onMessagePerson }: OrgProfileProps) {
  const { t } = useTheme();
  const { scrollY, handlers } = useStickyScroll();
  const [tab, setTab] = useState<ProfileTab>('members');

  const stats: { value: number; label: string }[] = [
    { value: org.members, label: 'Members' },
    ...(org.workingGroups === undefined
      ? []
      : [{ value: org.workingGroups, label: 'Working groups' }]),
    { value: jobs.length, label: 'Open roles' },
  ];
  const location = [org.city, org.country].filter(Boolean).join(', ');

  return (
    <SwipeBack onBack={onBack} style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <StickyTitle scrollY={scrollY} title={org.fullName ?? org.name} onBack={onBack} backLabel="Back to directory" actions={<PageActions />} />

      <Animated.ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} {...handlers}>
        <PageHead title={org.fullName ?? org.name} onBack={onBack} backLabel="Back to directory" actions={<PageActions />}>
          <View style={styles.orgRow}>
            <OrgMark initials={orgInitials(org.short)} logoUrl={org.logoUrl} size={44} />
            <View style={styles.flex}>
              <Text style={[styles.orgMeta, { color: t.inkMuted }]}>
                {[org.short, location].filter(Boolean).join(' · ')}
              </Text>
              {!!org.blurb && (
                <Text style={[styles.blurb, { color: t.inkBody }]}>{org.blurb}</Text>
              )}
            </View>
          </View>
        </PageHead>
        <View
          style={[
            styles.stats,
            { backgroundColor: t.surfacePaper, borderBottomColor: t.rule },
          ]}
        >
          {stats.map((s, i) => (
            <View
              key={s.label}
              style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.rule }]}
            >
              <Text style={[styles.statValue, { color: t.inkStrong }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: t.inkMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View
          style={[styles.tabs, { backgroundColor: t.surfacePaper, borderBottomColor: t.rule }]}
        >
          {(
            [
              ['members', 'Members'],
              ['jobs', 'Jobs'],
            ] as [ProfileTab, string][]
          ).map(([id, label]) => {
            const on = id === tab;
            return (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, { borderBottomColor: on ? t.surfaceAnchor : 'transparent' }]}
              >
                <Text style={[styles.tabLabel, { color: on ? t.inkStrong : t.inkFaint }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {tab === 'members' ? (
          <>
            <SectionHead
              label="People"
              // The roster may be shorter than the headcount — the count is what
              // the organization reports, the list is who has a profile.
              count={`${org.members} member${org.members === 1 ? '' : 's'}`}
            />
            <View
              style={[
                styles.rows,
                { backgroundColor: t.surfacePaper, borderColor: t.rule },
              ]}
            >
              {people.map((p) => (
                <View
                  key={p.id}
                  style={[styles.personRow, { borderBottomColor: t.rule }]}
                >
                  <Pressable
                    onPress={() => onOpenPerson(p.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${p.name}'s profile`}
                    style={({ pressed }) => [
                      styles.personIdentity,
                      { backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent' },
                    ]}
                  >
                    <Avatar
                      initials={p.initials ?? initialsOf(p.name)}
                      photoUrl={p.photoUrl}
                      size={36}
                    />
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={[styles.personName, { color: t.inkStrong }]}>{p.name}</Text>
                      <Text numberOfLines={1} style={[styles.personRole, { color: t.inkMuted }]}>
                        {p.role}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => onMessagePerson(p.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${p.name}`}
                    hitSlop={6}
                    style={styles.messageAction}
                  >
                    <ChatCircle size={18} color={t.brandGreen} />
                  </Pressable>
                </View>
              ))}
              {people.length === 0 && (
                <Text style={[styles.empty, { color: t.inkMuted }]}>
                  No member profiles published yet.
                </Text>
              )}
            </View>
          </>
        ) : (
          <>
            <SectionHead
              label="Open roles"
              count={`${jobs.length} role${jobs.length === 1 ? '' : 's'}`}
            />
            <View
              style={[
                styles.rows,
                { backgroundColor: t.surfacePaper, borderColor: t.rule },
              ]}
            >
              {jobs.map((j) => (
                <Pressable
                  key={j.id}
                  onPress={() => onOpenJob?.(j)}
                  style={({ pressed }) => [
                    styles.jobRow,
                    {
                      borderBottomColor: t.rule,
                      borderLeftColor: jobFunctionRule(t, j.fnKey),
                      backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text numberOfLines={2} style={[styles.jobTitle, { color: t.inkStrong }]}>{j.title}</Text>
                    <Text numberOfLines={2} style={[styles.jobMeta, { color: t.inkMuted }]}>
                      {`${j.loc} · ${j.closes}`}
                    </Text>
                  </View>
                  <ArrowRight size={14} color={t.ruleStrong} />
                </Pressable>
              ))}
              {jobs.length === 0 && (
                <Text style={[styles.empty, { color: t.inkMuted }]}>
                  No open roles listed at {org.name}.
                </Text>
              )}
            </View>
          </>
        )}
      </Animated.ScrollView>
    </SwipeBack>
  );
}

/** The heading above either list. */
function SectionHead({ label, count }: { label: string; count: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionLabel, { color: t.inkStrong }]}>{label}</Text>
      <Text style={[styles.sectionCount, { color: t.inkMuted }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  flex: { flex: 1, minWidth: 0 },

  orgRow: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingTop: 12 },
  orgMeta: { fontFamily: sans(400), fontSize: 13 },
  blurb: { marginTop: 6, fontFamily: sans(400), fontSize: 14.5, lineHeight: 23 },

  stats: { width: '100%', flexDirection: 'row', borderBottomWidth: 1 },
  stat: { flex: 1, minWidth: 0, gap: 2.4, paddingVertical: 13.6, paddingHorizontal: 8 },
  statValue: {
    fontFamily: sans(600),
    fontSize: 20,
    letterSpacing: trackDisplay(20),
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontFamily: sans(400), fontSize: 12.5 },

  tabs: { width: '100%', flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, borderBottomWidth: 1 },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', paddingBottom: 9, borderBottomWidth: 2 },
  tabLabel: { fontFamily: sans(600), fontSize: 14.5 },

  scroll: { paddingBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  sectionLabel: { fontFamily: sans(600), fontSize: 14.5, letterSpacing: trackDisplay(14.5) },
  sectionCount: { flexShrink: 1, textAlign: 'right', fontFamily: sans(400), fontSize: 13 },
  rows: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },

  personRow: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  personIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingLeft: 12,
  },
  messageAction: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
  },
  personName: { fontFamily: sans(500), fontSize: 15 },
  personRole: { marginTop: 2, fontFamily: sans(400), fontSize: 12.5 },

  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingRight: 12,
    paddingLeft: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
  },
  jobTitle: { fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  jobMeta: { marginTop: 2, fontFamily: sans(400), fontSize: 12.5 },

  empty: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 14.5,
  },
});
