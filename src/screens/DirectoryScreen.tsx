/**
 * The Directory tab — a dense index of member organizations, with a profile
 * behind each row.
 *
 * From the Member Directory design, option 1c (index) and 1d (profile). Search
 * covers organizations by name and country; people are only searched once
 * something is typed, so the resting state is the institutional index.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaretRight, MagnifyingGlass } from '../ds/icons';
import { DisplayHead, Eyebrow, MastheadMeta } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, orgSectorRule, sans, topPad, trackDisplay } from '../ds/tokens';
import OrgProfile from '../components/directory/OrgProfile';
import type { DirectoryPerson, JobListing, MemberOrg } from '../api/types';

/** A run of organizations sharing an initial letter. */
interface LetterGroup {
  letter: string;
  items: MemberOrg[];
}

/**
 * Group consecutive organizations by initial letter. Consecutive, not sorted —
 * the list arrives alphabetical and the index never reorders it, so a server
 * that sends another order gets the headings its own order implies.
 */
export function groupByLetter(orgs: MemberOrg[]): LetterGroup[] {
  const groups: LetterGroup[] = [];
  for (const org of orgs) {
    const letter = (org.name[0] ?? '').toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.items.push(org);
    else groups.push({ letter, items: [org] });
  }
  return groups;
}

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
  /** Alphabetical by `name` — the index groups them but does not sort them. */
  orgs: MemberOrg[];
  /** Everyone in the directory, flat; `orgId` joins each to an organization. */
  people: DirectoryPerson[];
  /** Open roles, for a profile's Jobs tab and its Open roles stat. */
  jobs: JobListing[];
  /** Opens a role on the job board. Absent leaves a profile's job rows inert. */
  onOpenJob?: (job: JobListing) => void;
}

export default function DirectoryScreen({ orgs, people, jobs, onOpenJob }: DirectoryScreenProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const openOrg = orgId ? orgs.find((o) => o.id === orgId) ?? null : null;

  const groups = useMemo(() => {
    const rows = q
      ? orgs.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.country.toLowerCase().includes(q) ||
            (o.fullName ?? '').toLowerCase().includes(q)
        )
      : orgs;
    return groupByLetter(rows);
  }, [orgs, q]);

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

  const orgCount = groups.reduce((n, g) => n + g.items.length, 0);

  if (openOrg) {
    return (
      <OrgProfile
        org={openOrg}
        people={people.filter((p) => p.orgId === openOrg.id)}
        jobs={jobsForOrg(jobs, openOrg)}
        onBack={() => setOrgId(null)}
        onOpenJob={onOpenJob}
      />
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePaper }]}>
      <View
        style={[
          styles.masthead,
          { backgroundColor: t.surfaceAnchor, paddingTop: topPad(insets.top, 54) },
        ]}
      >
        <MastheadMeta size={10} color={alpha(t.inkInverse, 0.7)}>
          GPFA MEMBER INTELLIGENCE NETWORK
        </MastheadMeta>
        <View style={styles.mastheadRow}>
          <DisplayHead size={24} onAnchor>
            Directory
          </DisplayHead>
          <MastheadMeta size={11} color={alpha(t.inkInverse, 0.7)}>
            {orgs.length} ORGS
          </MastheadMeta>
        </View>
      </View>

      <View
        style={[
          styles.searchBar,
          { backgroundColor: t.surfacePage, borderBottomColor: t.ruleHairline },
        ]}
      >
        <MagnifyingGlass size={15} color={t.inkMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search organizations or people"
          placeholderTextColor={t.inkFaint}
          style={[styles.searchInput, { color: t.inkStrong }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        style={{ backgroundColor: t.surfacePaper }}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {groups.map((g) => (
          <View key={g.letter}>
            <View
              style={[
                styles.letterHead,
                { backgroundColor: t.surfacePage, borderBottomColor: t.ruleHairline },
              ]}
            >
              <Eyebrow size={10}>{`${g.letter} · ${g.items.length}`}</Eyebrow>
            </View>
            {g.items.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => setOrgId(o.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: t.ruleHairline,
                    borderLeftColor: orgSectorRule(t, o.sector),
                    backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent',
                  },
                ]}
              >
                <View style={styles.rowMain}>
                  <Text numberOfLines={1} style={[styles.rowName, { color: t.inkStrong }]}>
                    {o.name}
                  </Text>
                  <Text style={[styles.rowSub, { color: t.inkMuted }]}>{o.sector}</Text>
                </View>
                <View style={styles.rowRail}>
                  <MastheadMeta size={10.5} color={t.inkFaint}>
                    {o.countryCode}
                  </MastheadMeta>
                  <MastheadMeta size={11} color={t.inkStrong} style={styles.rowCount}>
                    {String(o.members)}
                  </MastheadMeta>
                </View>
              </Pressable>
            ))}
          </View>
        ))}

        {matchedPeople.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setOrgId(p.orgId)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.ruleHairline,
                borderLeftColor: t.ruleStrong,
                backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent',
              },
            ]}
          >
            <View style={styles.rowMain}>
              <Text style={[styles.rowName, { color: t.inkStrong }]}>{p.name}</Text>
              <Text numberOfLines={1} style={[styles.rowSub, { color: t.inkMuted }]}>
                {p.meta}
              </Text>
            </View>
            <CaretRight size={14} color={t.ruleStrong} />
          </Pressable>
        ))}

        {orgCount === 0 && matchedPeople.length === 0 && (
          <Text style={[styles.empty, { color: t.inkMuted }]}>
            {q ? `Nothing in the directory matches “${query.trim()}”.` : 'The directory is empty.'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  masthead: { paddingHorizontal: 20, paddingBottom: 16 },
  mastheadRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: sans(400),
    fontSize: 13.5,
  },

  list: { paddingBottom: 24 },
  letterHead: {
    paddingTop: 9,
    paddingBottom: 5,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingRight: 20,
    paddingLeft: 17,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: sans(600), fontSize: 13.5, letterSpacing: trackDisplay(13.5) },
  rowSub: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5 },
  rowRail: { alignItems: 'flex-end' },
  rowCount: { marginTop: 2 },

  empty: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 13,
  },
});
