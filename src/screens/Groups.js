import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DiagonalStripes, FadeIn } from '../components/common';
import { colors, mono, TAB_SPACE, TOP } from '../theme';
import { delay } from '../data';

const FILTERS = ['All', 'Subscribed', 'Trending'];

export default function Groups({ groups, threads, filter, onFilter, onToggleSub, onOpenGroup }) {
  const visible = groups.filter((g) => {
    if (filter === 'All') return true;
    return filter === 'Subscribed' ? g.subscribed : g.trending;
  });

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>
          Find your peer community. <Text style={styles.accent}>Member-led</Text> rooms.
        </Text>
        <Text style={styles.blurb}>Peer rooms that keep member memory between meetings.</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const on = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => onFilter(f)}
              style={[
                styles.filter,
                {
                  backgroundColor: on ? colors.green : colors.fill,
                  borderColor: on ? colors.green : 'rgba(255,255,255,0.12)',
                },
              ]}
            >
              <Text style={[styles.filterText, { color: on ? colors.greenInk : colors.muted }]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {visible.map((g, i) => {
          const count = threads.filter((t) => t.group === g.id).length;
          return (
            <FadeIn key={g.id} delay={delay(i)}>
              <View style={styles.card}>
                <View style={styles.banner}>
                  <DiagonalStripes height={64} />
                  <Text style={styles.bannerText}>{`[ ${g.name.toUpperCase()} COVER ]`}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.chipRow}>
                    {g.subscribed && (
                      <View style={[styles.chip, styles.chipGreen]}>
                        <Text style={styles.chipGreenText}>✓ Subscribed</Text>
                      </View>
                    )}
                    {g.trending && (
                      <View style={[styles.chip, styles.chipCoral]}>
                        <Text style={styles.chipCoralText}>Trending</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.name}>{g.name}</Text>
                  <Text style={styles.desc}>{g.desc}</Text>
                  <Text style={styles.count}>{`${count} threads`}</Text>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => onToggleSub(g.id)}
                      style={({ pressed }) => [
                        styles.subBtn,
                        {
                          backgroundColor: g.subscribed ? colors.fill : 'rgba(169,217,164,0.9)',
                        },
                        pressed && styles.scale,
                      ]}
                    >
                      <Text style={[styles.subText, { color: g.subscribed ? colors.muted : colors.greenInk }]}>
                        {g.subscribed ? 'Unsubscribe' : 'Subscribe'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onOpenGroup(g.id)}
                      style={({ pressed }) => [styles.openBtn, pressed && styles.scale]}
                    >
                      <Text style={styles.openText}>Open →</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </FadeIn>
          );
        })}
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
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.52,
    lineHeight: 31,
    color: colors.text,
  },
  accent: { color: colors.green },
  blurb: {
    fontSize: 13.5,
    color: colors.muted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  filter: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  banner: {
    height: 64,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(169,217,164,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bannerText: {
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.dim,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  chipGreen: { borderColor: 'rgba(169,217,164,0.4)' },
  chipGreenText: { fontSize: 10.5, fontWeight: '600', color: colors.green },
  chipCoral: { borderColor: 'rgba(227,154,148,0.4)' },
  chipCoralText: { fontSize: 10.5, fontWeight: '600', color: colors.coral },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  desc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  count: {
    fontFamily: mono,
    fontSize: 11.5,
    color: colors.dim,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  subBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subText: {
    fontSize: 13,
    fontWeight: '600',
  },
  openBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(169,217,164,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  scale: { transform: [{ scale: 0.96 }] },
});
