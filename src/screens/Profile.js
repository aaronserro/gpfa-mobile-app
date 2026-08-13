import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeIn, PopIn } from '../components/common';
import { profileRows } from '../data';
import { colors, mono, TAB_SPACE, TOP } from '../theme';

export default function Profile({ onSignOut }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <PopIn duration={450}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AS</Text>
          </View>
        </PopIn>
        <View style={styles.identity}>
          <Text style={styles.name}>Aaron Serro</Text>
          <Text style={styles.org}>Healthcare of Ontario Pension Plan</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>GPFA MEMBER ORGANIZATION</Text>
        </View>
      </View>

      <View style={styles.body}>
        <FadeIn delay={100} style={styles.card}>
          {profileRows.map((r, i) => (
            <Pressable
              key={r.label}
              style={({ pressed }) => [
                styles.row,
                i === profileRows.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowLabel}>{r.label}</Text>
              <View style={styles.rowRight}>
                {!!r.detail && <Text style={styles.rowDetail}>{r.detail}</Text>}
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          ))}
        </FadeIn>

        <FadeIn delay={180}>
          <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.scale]} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </FadeIn>

        <Text style={styles.footer}>member-led · non-profit · est. 2020</Text>
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
    paddingTop: 24,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.greenInk,
  },
  identity: { alignItems: 'center' },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  org: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(169,217,164,0.4)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
  body: {
    padding: 20,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowLast: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowDetail: {
    fontSize: 12.5,
    color: colors.dim,
  },
  chevron: {
    color: colors.dim,
    fontSize: 18,
  },
  signOut: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(227,154,148,0.35)',
    backgroundColor: 'rgba(227,154,148,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.coral,
  },
  footer: {
    textAlign: 'center',
    fontFamily: mono,
    fontSize: 10.5,
    color: colors.faint,
    paddingTop: 8,
  },
  scale: { transform: [{ scale: 0.97 }] },
});
