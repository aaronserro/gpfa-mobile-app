/**
 * Groups tab, level one: every working group, split into the ones the member
 * subscribes to and the rest.
 *
 * Presentational — subscription state and the post counts arrive resolved.
 */
import { useState } from 'react';
import { Image } from 'expo-image';
import { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChatText, Fire, Funnel, MagnifyingGlass, UsersThree } from '../../ds/icons';
import { FilterChip, FilterChipRow } from '../../ds/controls';
import { CollectionEmptyState } from '../../ds/feedback';
import { Chip, PageActions, PageHead, StickyTitle } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../../ds/tokens';
import { HatchBanner } from './parts';
import type { Group } from '../../api/types';

export type GroupSortId = 'recommended' | 'active' | 'members' | 'name';

const SORTS: Array<{ id: GroupSortId; label: string }> = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'active', label: 'Active' },
  { id: 'members', label: 'Members' },
  { id: 'name', label: 'A-Z' },
];

export interface GroupDirectoryProps {
  /** Groups the member subscribes to — the "Your groups" section. */
  subscribed: Group[];
  /** Everything else — the "All groups" section. */
  rest: Group[];
  query: string;
  onQuery: (query: string) => void;
  sort: GroupSortId;
  onSort: (sort: GroupSortId) => void;
  onOpen: (groupId: string) => void;
}

export default function GroupDirectory({
  subscribed,
  rest,
  query,
  onQuery,
  sort,
  onSort,
  onOpen,
}: GroupDirectoryProps) {
  const { t } = useTheme();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [sortOpen, setSortOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean | undefined>>({});

  const sections = [
    { label: 'Your groups', groups: subscribed },
    { label: 'All groups', groups: rest },
  ].filter((s) => s.groups.length > 0);
  const total = subscribed.length + rest.length;
  const wideCards = windowWidth >= 700 && fontScale < 1.35;

  return (
    <View style={styles.fill}>
      <StickyTitle
        scrollY={scrollY}
        title="Working "
        em="groups."
        actions={<PageActions />}
      />
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        <PageHead
          actions={<PageActions />}
          title="Working "
          em="groups."
        />

        <View style={styles.body}>
          <View style={styles.controls}>
            <View style={[styles.search, { backgroundColor: t.surfacePaper, borderColor: t.rule }]}>
              <MagnifyingGlass size={16} color={t.inkMuted} />
              <TextInput
                value={query}
                onChangeText={onQuery}
                placeholder="Search groups"
                accessibilityLabel="Search working groups"
                accessibilityHint="Filters groups by name, topic, or description"
                placeholderTextColor={t.inkMuted}
                style={[styles.searchInput, { color: t.inkStrong }]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <Pressable
              onPress={() => setSortOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="Sort groups"
              accessibilityState={{ expanded: sortOpen }}
              style={({ pressed }) => [
                styles.sortButton,
                { backgroundColor: t.surfacePaper, borderColor: t.rule },
                pressed ? styles.pressed : null,
              ]}
            >
              <Funnel size={16} color={t.inkStrong} />
              <Text style={[styles.sortButtonText, { color: t.inkStrong }]}>Sort</Text>
            </Pressable>
          </View>

          {sortOpen && (
            <FilterChipRow>
              {SORTS.map((option) => {
                const active = option.id === sort;
                return (
                  <FilterChip
                    key={option.id}
                    label={option.label}
                    selected={active}
                    onPress={() => {
                      onSort(option.id);
                      setSortOpen(false);
                    }}
                  />
                );
              })}
            </FilterChipRow>
          )}

          <Text style={[styles.count, { color: t.inkMuted }]}>
            {total} working {total === 1 ? 'group' : 'groups'}
          </Text>

          {sections.map((s) => (
            <View key={s.label} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: t.inkStrong }]}>{s.label}</Text>
              <View style={styles.cardGrid}>
                {s.groups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => onOpen(g.id)}
                    accessibilityRole="button"
                    android_ripple={{ color: alpha(t.inkStrong, 0.08) }}
                    style={({ pressed }) => [
                      styles.card,
                      wideCards && styles.cardWide,
                      { backgroundColor: t.surfacePaper, borderColor: t.rule },
                      pressed && Platform.OS !== 'android'
                        ? { backgroundColor: t.surfaceSubtle }
                        : null,
                    ]}
                  >
                  {/* The card art sits above the v2 body, edge to edge. The
                      hatch is the fallback, and stays behind the image so a
                      slow or broken load never shows a bare rectangle. */}
                  <View style={styles.bannerFrame}>
                    <HatchBanner height={112} />
                    {!!g.cardImageUrl && !failedImages[g.id] && (
                      <Image
                        source={g.cardImageUrl}
                        style={styles.bannerImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={160}
                        accessibilityIgnoresInvertColors
                        onError={() => setFailedImages((prev) => ({ ...prev, [g.id]: true }))}
                      />
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={[styles.groupName, { color: t.inkStrong }]}>{g.n}</Text>

                    <View style={styles.cardChips}>
                      {g.joined && <Chip Glyph={ChatText}>Subscribed</Chip>}
                      <Chip Glyph={UsersThree}>
                        {`${g.memberCount ?? g.members.length} members`}
                      </Chip>
                      {g.trending && (
                        <Chip Glyph={Fire} glyphColor={t.brandAmber}>
                          Trending
                        </Chip>
                      )}
                    </View>

                    {!!g.meta && (
                      <Text style={[styles.groupBio, { color: t.inkMuted }]}>
                        {g.meta}
                      </Text>
                    )}

                    {(() => {
                      const latest = latestPost(g);
                      return latest ? (
                        <View style={[styles.cardFoot, { borderTopColor: t.rule }]}>
                          <Text style={[styles.cardStamp, { color: t.inkMuted }]}>{latest}</Text>
                        </View>
                      ) : null;
                    })()}
                  </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {sections.length === 0 && (
            <CollectionEmptyState
              title={query.trim() ? 'No matching groups' : 'No working groups yet'}
              body={query.trim()
                ? `No working group matches “${query.trim()}”. Try a broader search.`
                : 'New member working groups will appear here when they become available.'}
              Glyph={UsersThree}
              actionLabel={query.trim() ? 'Clear search' : undefined}
              onAction={query.trim() ? () => onQuery('') : undefined}
            />
          )}

          <Text style={[styles.disclaimer, { color: t.inkFaint }]}>
            Content reflects member discussion and is not investment advice.
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

/**
 * v2 closes each group card with a mono stamp — "Aaron S. posted 7m ago".
 * `Group` carries no last-activity field, so it comes from the freshest thread
 * (`mins` is the feed's age-in-minutes sort key) and the card simply omits the
 * footer when the group has no posts yet.
 */
function latestPost(group: Group): string | null {
  const newest = group.threads.reduce<Group['threads'][number] | null>((best, thread) => {
    if (!thread.time) return best;
    if (!best) return thread;
    return (thread.mins ?? Infinity) < (best.mins ?? Infinity) ? thread : best;
  }, null);
  if (!newest) return null;
  return `${shortName(newest.author)} posted ${newest.time}`;
}

/** "Aaron Serro" → "Aaron S.", the form v2 uses on directory and group cards. */
function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0]}.` : first;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  scroll: { paddingBottom: 26 },
  body: { padding: 16, gap: 12 },

  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  search: {
    flexGrow: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: '100%', padding: 0, fontFamily: sans(400), fontSize: 15 },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortButtonText: { fontFamily: sans(500), fontSize: 15 },
  count: { fontFamily: sans(400), fontSize: 14 },
  section: { gap: 12 },
  sectionLabel: {
    marginTop: 6,
    fontFamily: sans(600),
    fontSize: 15,
    letterSpacing: trackDisplay(15),
  },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '100%', minWidth: 0, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  cardWide: { width: '48.5%' },
  bannerFrame: { height: 112, position: 'relative', overflow: 'hidden' },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardBody: { padding: 16 },
  groupName: {
    fontFamily: sans(600),
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: trackDisplay(18),
  },
  cardChips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupBio: { marginTop: 12, fontFamily: sans(400), fontSize: 14.5, lineHeight: 22 },
  cardFoot: { marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  cardStamp: { fontFamily: mono(400), fontSize: 12.5 },

  disclaimer: {
    paddingTop: 14,
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 20,
  },
});
