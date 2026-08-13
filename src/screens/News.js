import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DiagonalStripes, FadeIn } from '../components/common';
import { delay, newsItems } from '../data';
import { colors, mono, TAB_SPACE, TOP } from '../theme';

export default function News() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>UPDATES</Text>
        <Text style={styles.title}>
          What matters to <Text style={styles.accent}>securities finance</Text>, today.
        </Text>
      </View>

      <View style={styles.list}>
        {newsItems.map((n, i) => (
          <FadeIn key={n.title} delay={delay(i)}>
            <View style={styles.card}>
              <View style={styles.cover}>
                <DiagonalStripes height={110} />
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{n.tag}</Text>
                </View>
              </View>
              <View style={styles.body}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.meta}>{`${n.source} · ${n.date}`}</Text>
                <Text style={styles.excerpt}>{n.excerpt}</Text>
              </View>
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
    paddingBottom: 12,
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
  cover: {
    height: 110,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tag: {
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: colors.greenInk,
  },
  body: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    color: colors.text,
  },
  meta: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.dim,
  },
  excerpt: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
});
