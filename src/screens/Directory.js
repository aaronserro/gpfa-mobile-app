import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FadeIn } from '../components/common';
import { delay, orgs } from '../data';
import { colors, mono, TAB_SPACE, TOP } from '../theme';

export default function Directory() {
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();
  const visible = orgs.filter(
    (o) => !q || o.name.toLowerCase().includes(q) || o.abbr.toLowerCase().includes(q)
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>
          Member <Text style={styles.accent}>directory.</Text>
        </Text>
        <Text style={styles.blurb}>
          Who do I talk to? Profiles are member-maintained and visible only inside the network.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by organization name"
          placeholderTextColor={colors.dim}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.count}>{`${visible.length} ORGANIZATIONS · 40 MEMBERS LISTED`}</Text>

      <View style={styles.list}>
        {visible.map((o, i) => (
          <FadeIn key={o.abbr} delay={delay(i)} duration={400}>
            <View style={[styles.card, { borderTopColor: o.accent }]}>
              <View style={styles.cardHead}>
                <View style={[styles.badge, { backgroundColor: o.accent }]}>
                  <Text style={styles.badgeText}>{o.abbr}</Text>
                </View>
                <View style={styles.identity}>
                  <Text style={styles.name}>{o.name}</Text>
                  <Text style={styles.country}>{o.country}</Text>
                </View>
              </View>
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{o.type}</Text>
                </View>
              </View>
              <Text style={styles.blurbText}>{o.blurb}</Text>
              <Text style={styles.members}>{o.members}</Text>
            </View>
          </FadeIn>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: TOP,
    paddingBottom: TAB_SPACE,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 6,
  },
  eyebrow: {
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.dim,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.56,
    color: colors.text,
  },
  accent: { color: colors.green },
  blurb: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 19,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  search: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.fill,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  count: {
    fontFamily: mono,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.dim,
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 10,
  },
  list: {
    gap: 10,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    borderTopWidth: 2,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  cardHead: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: colors.greenInk,
  },
  identity: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.text,
  },
  country: {
    fontSize: 11.5,
    color: colors.muted,
  },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 9,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.sub,
  },
  blurbText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  members: {
    fontFamily: mono,
    fontSize: 11.5,
    color: colors.dim,
  },
});
