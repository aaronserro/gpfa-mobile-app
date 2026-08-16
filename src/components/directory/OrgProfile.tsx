/**
 * Directory → one member organization.
 *
 * Presentational: the org, its people and its open roles all arrive resolved.
 * The design puts the Members/Jobs strip inside the scrolling region; it is
 * pinned here instead, so a long roster never scrolls the control away.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowRight, CaretLeft } from '../../ds/icons';
import { Avatar, Eyebrow, MastheadMeta, OrgMark } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, jobFunctionRule, sans, topPad, trackDisplay } from '../../ds/tokens';
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
}

export default function OrgProfile({ org, people, jobs, onBack, onOpenJob }: OrgProfileProps) {
  const { t, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ProfileTab>('members');

  const stats: { value: number; label: string }[] = [
    { value: org.members, label: 'Members' },
    { value: org.workingGroups, label: 'Working groups' },
    { value: jobs.length, label: 'Open roles' },
  ];

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      {/* The index behind this is the anchor surface; the profile's masthead is
          paper, so the glyphs flip back while it's mounted. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.masthead,
          {
            backgroundColor: t.surfacePaper,
            borderBottomColor: t.ruleHairline,
            paddingTop: topPad(insets.top, 54),
          },
        ]}
      >
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to directory"
          style={styles.backRow}
        >
          <CaretLeft size={15} color={t.inkMuted} />
          <Text style={[styles.backLabel, { color: t.inkMuted }]}>Directory</Text>
        </Pressable>

        <View style={styles.orgRow}>
          <OrgMark initials={orgInitials(org.short)} logoUrl={org.logoUrl} size={52} />
          <View style={styles.flex}>
            <Text style={[styles.orgName, { color: t.inkStrong }]}>{org.fullName ?? org.name}</Text>
            <MastheadMeta size={10.5} style={styles.orgMeta}>
              {`${org.short} · ${org.city}, ${org.country}`.toUpperCase()}
            </MastheadMeta>
          </View>
        </View>

        <Text style={[styles.blurb, { color: t.inkBody }]}>{org.blurb}</Text>
      </View>

      <View
        style={[
          styles.stats,
          { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline },
        ]}
      >
        {stats.map((s, i) => (
          <View
            key={s.label}
            style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.ruleHairline }]}
          >
            <Text style={[styles.statValue, { color: t.inkStrong }]}>{s.value}</Text>
            <Eyebrow size={9} style={styles.statLabel}>
              {s.label}
            </Eyebrow>
          </View>
        ))}
      </View>

      <View
        style={[styles.tabs, { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline }]}
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline },
              ]}
            >
              {people.map((p) => (
                <View key={p.id} style={[styles.personRow, { borderBottomColor: t.ruleHairline }]}>
                  <Avatar
                    initials={p.initials ?? initialsOf(p.name)}
                    photoUrl={p.photoUrl}
                    size={36}
                  />
                  <View style={styles.flex}>
                    <Text style={[styles.personName, { color: t.inkStrong }]}>{p.name}</Text>
                    <Text numberOfLines={1} style={[styles.personRole, { color: t.inkMuted }]}>
                      {p.role}
                    </Text>
                  </View>
                  <ArrowRight size={14} color={t.ruleStrong} />
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
                { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline },
              ]}
            >
              {jobs.map((j) => (
                <Pressable
                  key={j.id}
                  onPress={() => onOpenJob?.(j)}
                  style={({ pressed }) => [
                    styles.jobRow,
                    {
                      borderBottomColor: t.ruleHairline,
                      borderLeftColor: jobFunctionRule(t, j.fnKey),
                      backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.jobTitle, { color: t.inkStrong }]}>{j.title}</Text>
                    <MastheadMeta size={10.5} style={styles.jobMeta}>
                      {`${j.loc} · ${j.closes}`.toUpperCase()}
                    </MastheadMeta>
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
      </ScrollView>
    </View>
  );
}

/** The eyebrow-and-count line above either list. */
function SectionHead({ label, count }: { label: string; count: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Eyebrow size={11.5}>{label}</Eyebrow>
      <MastheadMeta size={11} color={t.inkFaint}>
        {count}
      </MastheadMeta>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },

  masthead: { borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  backLabel: { fontFamily: sans(400), fontSize: 12.5 },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14 },
  orgName: {
    fontFamily: sans(600),
    fontSize: 19,
    lineHeight: 20.9,
    letterSpacing: trackDisplay(19),
  },
  orgMeta: { marginTop: 5 },
  blurb: { marginTop: 12, fontFamily: sans(400), fontSize: 13, lineHeight: 20.8 },

  stats: { flexDirection: 'row', borderBottomWidth: 1 },
  stat: { flex: 1, gap: 2.4, paddingVertical: 13.6, paddingHorizontal: 16 },
  statValue: {
    fontFamily: sans(600),
    fontSize: 20,
    letterSpacing: trackDisplay(20),
    fontVariant: ['tabular-nums'],
  },
  statLabel: { letterSpacing: 1.44 },

  tabs: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingTop: 12, borderBottomWidth: 1 },
  tab: { paddingBottom: 9, borderBottomWidth: 2 },
  tabLabel: { fontFamily: sans(600), fontSize: 13 },

  scroll: { paddingBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  rows: { borderTopWidth: 1, borderBottomWidth: 1 },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  personName: { fontFamily: sans(500), fontSize: 13.5 },
  personRole: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5 },

  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingRight: 20,
    paddingLeft: 17,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
  },
  jobTitle: { fontFamily: sans(600), fontSize: 13.5, letterSpacing: trackDisplay(13.5) },
  jobMeta: { marginTop: 2 },

  empty: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 13,
  },
});
