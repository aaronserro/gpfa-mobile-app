/**
 * Groups tab, level one: every working group, split into the ones the member
 * subscribes to and the rest.
 *
 * Presentational — subscription state and the post counts arrive resolved.
 */
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowRight, Bell, Fire, MagnifyingGlass, UsersThree } from '../../ds/icons';
import { Avatar, MastheadMeta } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, sans, topPad, trackDisplay, FRAME_STATUS_BAR } from '../../ds/tokens';
import { HatchBanner } from './parts';
import type { Group } from '../../api/types';

export interface GroupDirectoryProps {
  /** Groups the member subscribes to — the "Your groups" section. */
  subscribed: Group[];
  /** Everything else — the "All groups" section. */
  rest: Group[];
  /** Post count per group id, counting anything composed this session. */
  postCounts: Record<string, number>;
  /** Unread total across every group, shown in the masthead. */
  unreadTotal: number;
  /** Total number of groups, before the search filter. */
  totalGroups: number;
  memberInitials: string;
  query: string;
  onQuery: (query: string) => void;
  onOpen: (groupId: string) => void;
}

export default function GroupDirectory({
  subscribed,
  rest,
  postCounts,
  unreadTotal,
  totalGroups,
  memberInitials,
  query,
  onQuery,
  onOpen,
}: GroupDirectoryProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const sections = [
    { label: 'Your groups', groups: subscribed },
    { label: 'All groups', groups: rest },
  ].filter((s) => s.groups.length > 0);

  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: t.surfacePaper,
            borderBottomColor: t.ruleHairline,
            // This design draws the status bar as its own row rather than
            // folding it into the header's padding, so the 4px is all that
            // sits above the content.
            paddingTop: topPad(insets.top, FRAME_STATUS_BAR + 4),
          },
        ]}
      >
        <View style={styles.searchRow}>
          <Avatar initials={memberInitials} size={32} />
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
          <Bell size={21} color={t.inkMuted} />
        </View>

        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.inkStrong }]}>Working groups</Text>
          <MastheadMeta size={9.5} color={t.inkFaint}>
            {`${totalGroups} GROUPS · ${unreadTotal} UNREAD`}
          </MastheadMeta>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {sections.map((s) => (
          <View key={s.label}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionLabel, { color: t.inkFaint }]}>{s.label.toUpperCase()}</Text>
              <MastheadMeta size={9.5} color={t.inkFaint}>
                {String(s.groups.length)}
              </MastheadMeta>
            </View>

            <View style={styles.cards}>
              {s.groups.map((g) => {
                const posts = postCounts[g.id] ?? 0;
                return (
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
                    <HatchBanner />
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
                              {g.members.length}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <MastheadMeta size={9.5} style={styles.cardMeta}>
                        {g.meta.toUpperCase()}
                      </MastheadMeta>

                      <View style={styles.cardFoot}>
                        <MastheadMeta size={11} color={t.inkFaint}>
                          {`${posts} active post${posts === 1 ? '' : 's'}`}
                        </MastheadMeta>
                        <View style={[styles.openBtn, { backgroundColor: t.surfaceAnchor }]}>
                          <Text style={styles.openBtnText}>Open</Text>
                          <ArrowRight size={12} color="#fff" />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
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

  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    paddingBottom: 10,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: '100%', padding: 0, fontFamily: sans(400), fontSize: 13 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: sans(600),
    fontSize: 22,
    lineHeight: 24.2,
    letterSpacing: trackDisplay(22),
  },

  scroll: { paddingBottom: 26 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontFamily: mono(600),
    fontSize: 9.5,
    letterSpacing: 1.7,
  },

  cards: { gap: 12, paddingTop: 8, paddingBottom: 4, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
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
  cardMeta: { marginTop: 6 },
  cardFoot: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  openBtn: {
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
