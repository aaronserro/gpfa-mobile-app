import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/common';
import { colors, mono, TAB_SPACE, TOP } from '../theme';
import { delay } from '../data';

export default function GroupThreads({ group, threads, onBack, onOpenThread, onCompose }) {
  if (!group) return null;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.backRow}>
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.scale]} onPress={onBack}>
          <Text style={styles.backText}>‹ Groups</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        {group.trending && (
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Trending</Text>
            </View>
          </View>
        )}
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.desc}>{group.desc}</Text>
      </View>

      <View style={styles.ctaWrap}>
        <Pressable style={({ pressed }) => [styles.cta, pressed && styles.scaleSm]} onPress={onCompose}>
          <Text style={styles.ctaText}>＋ Start a discussion</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {threads.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No threads yet — start the first discussion.</Text>
          </View>
        ) : (
          threads.map((t, i) => (
            <FadeIn key={t.id} delay={delay(i)}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.scaleXs]}
                onPress={() => onOpenThread(t)}
              >
                <Text style={styles.cardTitle}>{t.title}</Text>
                <View style={styles.tagRow}>
                  {t.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.meta}>{`${t.author} · ${t.posts.length - 1} replies · ${t.time}`}</Text>
              </Pressable>
            </FadeIn>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: TOP,
    paddingBottom: TAB_SPACE,
  },
  backRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  back: {
    height: 36,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.sub,
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 6,
  },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(227,154,148,0.4)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  chipText: { fontSize: 10.5, fontWeight: '600', color: colors.coral },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.52,
    color: colors.text,
  },
  desc: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 19,
  },
  ctaWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cta: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.greenInk,
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    gap: 10,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(169,217,164,0.5)',
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.text,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(169,217,164,0.1)',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  tagText: {
    fontFamily: mono,
    fontSize: 10.5,
    color: colors.green,
  },
  meta: {
    fontFamily: mono,
    fontSize: 11.5,
    color: colors.muted,
  },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.dim,
    fontSize: 13.5,
    textAlign: 'center',
  },
  scale: { transform: [{ scale: 0.95 }] },
  scaleSm: { transform: [{ scale: 0.97 }] },
  scaleXs: { transform: [{ scale: 0.98 }] },
});
