/**
 * Resources → Job board. Open roles at member organizations, plus listings the
 * secretariat curates from outside the membership.
 *
 * Presentational: the listings, the search text and the active filter all come
 * in as props so the state survives a trip into a posting and back.
 */
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  ArrowRight,
  Briefcase,
  CalendarDots,
  CurrencyCircleDollar,
  MagnifyingGlass,
  MapPin,
} from '../../ds/icons';
import { MastheadMeta, OrgMark, ScreenHeader } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { jobFunctionRule, mono, sans, trackDisplay } from '../../ds/tokens';
import type { JobFunctionKey } from '../../ds/tokens';
import { FactChip, SourceChip } from './parts';
import { orgInitials } from '../../lib/format';
import type { JobListing } from '../../api/types';

/** Function filters plus the two that cut across them. */
export type JobFilterId = 'all' | JobFunctionKey | 'member';

export const JOB_FILTERS: { id: JobFilterId; label: string }[] = [
  { id: 'all', label: 'All roles' },
  { id: 'collateral', label: 'Collateral' },
  { id: 'risk', label: 'Risk' },
  { id: 'legal', label: 'Legal' },
  { id: 'tech', label: 'Technology' },
  { id: 'ops', label: 'Operations' },
  { id: 'member', label: 'Member orgs' },
];

/**
 * Filter, then order newest first — the board has no sort control, so `mins`
 * decides the order and a listing without one sorts as if posted today.
 */
export function filterJobs(jobs: JobListing[], query: string, filter: JobFilterId): JobListing[] {
  const q = query.trim().toLowerCase();
  const rows = jobs.filter((j) => {
    if (filter === 'member') {
      if (j.source !== 'member') return false;
    } else if (filter !== 'all' && j.fnKey !== filter) {
      return false;
    }
    if (!q) return true;
    return [j.title, j.org, j.loc, j.fn, j.blurb].join(' ').toLowerCase().includes(q);
  });
  return [...rows].sort((a, b) => (a.mins ?? 0) - (b.mins ?? 0));
}

export interface JobBoardProps {
  /** Already filtered and sorted — see `filterJobs`. */
  jobs: JobListing[];
  query: string;
  onQuery: (query: string) => void;
  filter: JobFilterId;
  onFilter: (filter: JobFilterId) => void;
  onBack: () => void;
  onOpen: (id: string) => void;
}

export default function JobBoard({
  jobs,
  query,
  onQuery,
  filter,
  onFilter,
  onBack,
  onOpen,
}: JobBoardProps) {
  const { t } = useTheme();
  const q = query.trim();

  return (
    <View style={styles.fill}>
      {/* The design has no back control — it previews the board as a tab of its
          own. Here it opens from the Resources hub, so it needs one. */}
      <ScreenHeader
        title="Job board"
        onBack={onBack}
        backLabel="Back to resources"
      >
        <View style={[styles.search, { backgroundColor: t.surfacePage, borderColor: t.ruleHairline }]}>
          <MagnifyingGlass size={15} color={t.inkMuted} />
          <TextInput
            value={query}
            onChangeText={onQuery}
            placeholder="Search roles, orgs, locations"
            placeholderTextColor={t.inkFaint}
            style={[styles.searchInput, { color: t.inkStrong }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {JOB_FILTERS.map(({ id, label }) => {
            const on = id === filter;
            return (
              <Pressable
                key={id}
                onPress={() => onFilter(id)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: on ? t.surfaceAnchor : t.ruleHairline,
                    backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: on ? t.inkInverse : t.inkMuted }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: t.inkMuted }]}>
            {jobs.length} open role{jobs.length === 1 ? '' : 's'}
          </Text>
        </View>

        {jobs.map((j) => (
          <Pressable
            key={j.id}
            onPress={() => onOpen(j.id)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: t.surfacePaper,
                borderTopColor: t.ruleHairline,
                borderBottomColor: t.ruleHairline,
                borderLeftColor: jobFunctionRule(t, j.fnKey),
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.cardTop}>
              <SourceChip source={j.source} />
              <MastheadMeta size={9.5} color={t.inkFaint} style={styles.flex}>
                Posted {j.posted}
              </MastheadMeta>
            </View>

            <View style={styles.orgRow}>
              <OrgMark initials={j.initials ?? orgInitials(j.org)} />
              <View style={styles.flex}>
                <Text style={[styles.org, { color: t.inkStrong }]}>{j.org}</Text>
                <MastheadMeta size={10}>{j.orgMeta}</MastheadMeta>
              </View>
            </View>

            <Text style={[styles.title, { color: t.inkStrong }]}>{j.title}</Text>
            <Text style={[styles.blurb, { color: t.inkBody }]}>{j.blurb}</Text>

            <View style={styles.facts}>
              <FactChip icon={(c) => <MapPin size={13} color={c} />}>{j.loc}</FactChip>
              <FactChip icon={(c) => <CurrencyCircleDollar size={13} color={c} />}>
                {j.comp}
              </FactChip>
            </View>

            <View style={[styles.closesRow, { borderBottomColor: t.ruleHairline }]}>
              <CalendarDots size={12} color={t.brandAmber} />
              <MastheadMeta size={10}>{j.closes}</MastheadMeta>
            </View>

            <View style={styles.cardFoot}>
              <View style={styles.footItem}>
                <Briefcase size={18} color={t.inkMuted} />
                <Text style={[styles.footText, { color: t.inkMuted }]}>{j.fn}</Text>
              </View>
              <View style={styles.footItem}>
                <Text style={[styles.footText, { color: t.brandGreen }]}>View role</Text>
                <ArrowRight size={16} color={t.brandGreen} />
              </View>
            </View>
          </Pressable>
        ))}

        {jobs.length === 0 && (
          <Text style={[styles.empty, { color: t.inkMuted }]}>
            {q ? `No roles match “${q}”.` : 'No roles match this filter.'}
          </Text>
        )}

        <Text style={[styles.disclaimer, { color: t.inkFaint }]}>
          Listings are provided by member organizations. GPFA is not the employer and does not
          endorse any listing.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: sans(400),
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
  },
  filterChip: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 32,
  },
  filterChipText: {
    fontFamily: mono(400),
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  list: { paddingBottom: 24 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  count: { fontFamily: sans(400), fontSize: 12 },

  card: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 11,
  },
  org: { fontFamily: sans(600), fontSize: 13.5 },
  title: {
    marginTop: 11,
    fontFamily: sans(700),
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: trackDisplay(18),
  },
  blurb: {
    marginTop: 7,
    fontFamily: sans(400),
    fontSize: 13.5,
    lineHeight: 21.6,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  closesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
    paddingBottom: 9,
    borderBottomWidth: 1,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  footText: { fontFamily: sans(500), fontSize: 12 },

  empty: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 13,
  },
  disclaimer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    fontFamily: sans(400),
    fontSize: 10.5,
    lineHeight: 17,
  },
});
