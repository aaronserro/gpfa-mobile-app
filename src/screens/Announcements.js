import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/common';
import { announcements, delay } from '../data';
import { colors, mono, TAB_SPACE, TOP } from '../theme';

export default function Announcements() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>UPDATES</Text>
        <Text style={styles.title}>
          Announcements <Text style={styles.accent}>from GPFA.</Text>
        </Text>
        <Text style={styles.blurb}>Read site-wide updates and respond to active member surveys.</Text>
      </View>

      <View style={styles.list}>
        {announcements.map((a, i) => (
          <FadeIn key={a.title} delay={delay(i)}>
            <View style={[styles.card, { borderLeftColor: a.edge }]}>
              {a.isSurvey && (
                <View style={styles.chipRow}>
                  <View style={styles.surveyChip}>
                    <Text style={styles.surveyChipText}>Survey</Text>
                  </View>
                  <View style={styles.statusChip}>
                    <Text style={styles.statusChipText}>{a.status}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.cardTitle}>{a.title}</Text>
              <Text style={styles.date}>{a.date}</Text>
              <Text style={styles.body}>{a.body}</Text>
              {a.isSurvey && (
                <Pressable style={({ pressed }) => [styles.cta, pressed && styles.scale]}>
                  <Text style={styles.ctaText}>View response →</Text>
                </Pressable>
              )}
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
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.56,
    color: colors.text,
  },
  accent: { color: colors.green },
  blurb: {
    fontSize: 13.5,
    color: colors.muted,
  },
  list: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    borderLeftWidth: 3,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 7,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  surveyChip: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 9,
  },
  surveyChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.greenInk,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 9,
  },
  statusChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.muted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    color: colors.text,
  },
  date: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.dim,
  },
  body: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 20,
  },
  cta: {
    alignSelf: 'flex-start',
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  ctaText: {
    color: colors.greenInk,
    fontSize: 13,
    fontWeight: '700',
  },
  scale: { transform: [{ scale: 0.96 }] },
});
