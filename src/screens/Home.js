import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BellIcon, FadeIn, Logo } from '../components/common';
import { colors, mono, TAB_SPACE, TOP } from '../theme';
import { delay, events, homeNews, initials } from '../data';

export default function Home({ threads, notifCount, onOpenThread, onGoGroups, onGoNews, onGoProfile }) {
  const recent = threads.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Logo size={28} strokeWidth={2} />
        <Pressable style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]} onPress={onGoProfile}>
          <BellIcon />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notifCount}</Text>
          </View>
        </Pressable>
      </View>

      <FadeIn delay={50} style={styles.greeting}>
        <Text style={styles.date}>THU · AUG 13, 2026</Text>
        <Text style={styles.hello}>
          Good afternoon, <Text style={styles.accent}>Aaron.</Text>
        </Text>
      </FadeIn>

      <FadeIn delay={120}>
        <LinearGradient
          colors={['rgba(169,217,164,0.12)', 'rgba(169,217,164,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.missed}
        >
          <Text style={styles.missedEyebrow}>WHAT YOU MISSED</Text>
          <Text style={styles.missedTitle}>Register for GPFA Annual Meeting</Text>
          <Text style={styles.missedMeta}>September 21–23, 2026 · Columbus, Ohio</Text>
          <Pressable style={({ pressed }) => [styles.missedCta, pressed && styles.scaleSm]}>
            <Text style={styles.missedCtaText}>Register now →</Text>
          </Pressable>
        </LinearGradient>
      </FadeIn>

      <FadeIn delay={200} style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Text style={styles.sectionLink}>All events →</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRow}>
          {events.map((ev, i) => (
            <FadeIn key={ev.title} delay={delay(i)}>
              <View style={styles.eventCard}>
                <View style={styles.eventDate}>
                  <Text style={styles.eventMonth}>{ev.month}</Text>
                  <Text style={styles.eventDay}>{ev.day}</Text>
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventPlace}>{ev.place}</Text>
                  <Text style={styles.eventRsvp}>✕ Not responded</Text>
                </View>
              </View>
            </FadeIn>
          ))}
        </ScrollView>
      </FadeIn>

      <FadeIn delay={280} style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your groups</Text>
          <Pressable onPress={onGoGroups} hitSlop={8}>
            <Text style={styles.sectionLink}>Browse all →</Text>
          </Pressable>
        </View>
        <View style={styles.threadList}>
          {recent.map((t) => (
            <Pressable
              key={t.id}
              style={({ pressed }) => [styles.threadRow, pressed && styles.scale]}
              onPress={() => onOpenThread(t)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(t.author)}</Text>
              </View>
              <View style={styles.threadBody}>
                <Text style={styles.threadTitle}>{t.title}</Text>
                <Text style={styles.threadMeta}>
                  {`Operations & Technology · ${t.author} · ${t.posts.length - 1} replies · ${t.time}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={360} style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Industry news</Text>
          <Pressable onPress={onGoNews} hitSlop={8}>
            <Text style={styles.sectionLink}>Open news →</Text>
          </Pressable>
        </View>
        <View style={styles.newsList}>
          {homeNews.map((n) => (
            <Pressable
              key={n.title}
              onPress={onGoNews}
              style={({ pressed }) => [styles.newsRow, pressed && styles.fade]}
            >
              <Text style={styles.newsTitle}>{n.title}</Text>
              <Text style={styles.newsMeta}>{`${n.tag} · ${n.date}`}</Text>
            </Pressable>
          ))}
        </View>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: TOP,
    paddingBottom: TAB_SPACE,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellPressed: { transform: [{ scale: 0.94 }] },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.greenInk,
    fontSize: 10,
    fontWeight: '700',
  },
  greeting: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 4,
  },
  date: {
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.dim,
  },
  hello: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.text,
  },
  accent: { color: colors.green },
  missed: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(169,217,164,0.25)',
    padding: 16,
    gap: 10,
  },
  missedEyebrow: {
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 1.8,
    color: colors.green,
  },
  missedTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.text,
  },
  missedMeta: {
    fontFamily: mono,
    fontSize: 12.5,
    color: colors.muted,
  },
  missedCta: {
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedCtaText: {
    color: colors.greenInk,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    gap: 12,
    marginBottom: 22,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    fontSize: 13,
    color: colors.green,
    fontWeight: '600',
  },
  eventRow: {
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  eventCard: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  eventDate: {
    width: 48,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(227,154,148,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMonth: {
    fontFamily: mono,
    fontSize: 9,
    letterSpacing: 0.9,
    color: colors.coral,
  },
  eventDay: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.coral,
  },
  eventBody: { flex: 1, gap: 4 },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.text,
  },
  eventPlace: {
    fontFamily: mono,
    fontSize: 11.5,
    color: colors.muted,
  },
  eventRsvp: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.dim,
  },
  threadList: {
    gap: 8,
    paddingHorizontal: 20,
  },
  threadRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '700',
  },
  threadBody: { flex: 1, gap: 3 },
  threadTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 19,
    color: colors.text,
  },
  threadMeta: {
    fontFamily: mono,
    fontSize: 11.5,
    color: colors.muted,
  },
  newsList: { paddingHorizontal: 20 },
  newsRow: {
    gap: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairSoft,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    color: colors.text,
  },
  newsMeta: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.dim,
  },
  scale: { transform: [{ scale: 0.98 }] },
  scaleSm: { transform: [{ scale: 0.96 }] },
  fade: { opacity: 0.7 },
});
