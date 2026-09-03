/**
 * Groups tab, level one: every working group, split into the ones the member
 * subscribes to and the rest.
 *
 * Presentational — subscription state and the post counts arrive resolved.
 */
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ArrowRight, Fire, MagnifyingGlass, UsersThree } from '../../ds/icons';
import { ScreenHeader } from '../../ds/primitives';
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
  const [failedImages, setFailedImages] = useState<Record<string, boolean | undefined>>({});

  const sections = [
    { label: 'Your groups', groups: subscribed },
    { label: 'All groups', groups: rest },
  ].filter((s) => s.groups.length > 0);

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Working groups">
        <View style={[styles.search, { backgroundColor: t.surfacePage, borderColor: t.ruleHairline }]}>
          <MagnifyingGlass size={15} color={t.inkMuted} />
          <TextInput
            value={query}
            onChangeText={onQuery}
            placeholder="Search working groups"
            placeholderTextColor={t.inkFaint}
            style={[styles.searchInput, { color: t.inkStrong }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.directoryControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortStrip}>
            {SORTS.map((option) => {
              const active = option.id === sort;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onSort(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.sortChip,
                    {
                      backgroundColor: active ? t.surfaceAnchor : pressed ? alpha(t.surfaceSoft, 0.65) : t.surfacePaper,
                      borderColor: active ? t.surfaceAnchor : t.ruleHairline,
                    },
                  ]}
                >
                  <Text style={[styles.sortChipText, { color: active ? t.inkInverse : t.inkMuted }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {sections.map((s) => (
          <View key={s.label}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionLabel, { color: t.inkStrong }]}>{s.label}</Text>
            </View>

            <View style={styles.cards}>
              {s.groups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => onOpen(g.id)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: t.surfacePaper,
                      borderColor: pressed ? t.ruleStrong : t.ruleHairline,
                    },
                  ]}
                >
                    <View style={styles.bannerFrame}>
                      <HatchBanner />
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
                      <View style={styles.cardTop}>
                        <Text style={[styles.groupName, { color: t.inkStrong }]}>{g.n}</Text>
                        <View style={styles.cardChips}>
                          {g.trending && (
                            <View
                              style={[styles.trendChip, { borderColor: alpha(t.brandAmber, 0.4) }]}
                            >
                              <Fire size={11} weight="fill" color={t.brandAmber} />
                              <Text style={[styles.trendText, { color: t.brandAmber }]}>Trending</Text>
                            </View>
                          )}
                          <View style={[styles.memberChip, { backgroundColor: t.surfaceSoft }]}>
                            <UsersThree size={11} weight="fill" color={t.inkStrong} />
                            <Text style={[styles.memberChipText, { color: t.inkStrong }]}>
                              {g.memberCount ?? g.members.length}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {!!g.meta && (
                        <Text numberOfLines={3} style={[styles.groupBio, { color: t.inkMuted }]}>{g.meta}</Text>
                      )}

                      <View style={styles.cardFoot}>
                        {g.joined && (
                          <Text style={[styles.cardSubCount, { color: t.inkFaint }]}>
                            Subscribed
                          </Text>
                        )}
                        <View style={[styles.openBtn, { backgroundColor: t.surfaceAnchor }]}>
                          <Text style={styles.openBtnText}>Open</Text>
                          <ArrowRight size={12} color="#fff" />
                        </View>
                      </View>
                    </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {sections.length === 0 && (
          <Text style={[styles.empty, { color: t.inkMuted }]}>
            {query.trim() ? `No working group matches “${query.trim()}”.` : 'No working groups yet.'}
          </Text>
        )}

        <Text style={[styles.disclaimer, { color: t.inkFaint }]}>
          Content reflects member discussion and is not investment advice.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

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
  searchInput: { flex: 1, height: '100%', padding: 0, fontFamily: sans(400), fontSize: 13 },
  directoryControls: { paddingTop: 14, paddingHorizontal: 16 },
  sortStrip: { gap: 8 },
  sortChip: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipText: { fontFamily: sans(600), fontSize: 12 },

  scroll: { paddingBottom: 26 },
  sectionHead: {
    paddingTop: 18,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontFamily: sans(600),
    fontSize: 13,
    letterSpacing: trackDisplay(13),
  },

  cards: { gap: 12, paddingTop: 8, paddingBottom: 4, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  bannerFrame: { height: 112, position: 'relative', overflow: 'hidden' },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardBody: { paddingTop: 13, paddingHorizontal: 14, paddingBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  groupName: {
    flex: 1,
    fontFamily: sans(600),
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: trackDisplay(16),
  },
  cardChips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 32,
  },
  trendText: { fontFamily: sans(400), fontSize: 10 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 32,
  },
  memberChipText: { fontFamily: sans(500), fontSize: 10.5, fontVariant: ['tabular-nums'] },
  groupBio: { marginTop: 8, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18.75 },
  cardSubCount: { fontFamily: mono(400), fontSize: 10.5 },
  cardFoot: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  openBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  openBtnText: { fontFamily: sans(600), fontSize: 12.5, color: '#fff' },

  empty: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 13,
  },
  disclaimer: {
    paddingTop: 14,
    paddingHorizontal: 16,
    fontFamily: sans(400),
    fontSize: 10.5,
    lineHeight: 16.8,
  },
});
