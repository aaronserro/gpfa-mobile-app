import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DirectoryMemberSummary, DirectoryPerson, MemberOrg } from '../../api/types';
import { ChatCircle } from '../../ds/icons';
import { Avatar, ScreenHeader } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { sans, trackDisplay } from '../../ds/tokens';

export default function MemberProfile({
  person,
  organization,
  summary,
  loading,
  error,
  onBack,
  onRetry,
  onMessage,
}: {
  person: DirectoryPerson;
  organization: MemberOrg | null;
  summary: DirectoryMemberSummary | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
  onMessage: (memberId: string) => void;
}) {
  const { t } = useTheme();

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title={person.name} onBack={onBack} backLabel="Back to episode" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <Avatar initials={person.initials ?? person.name.slice(0, 2)} photoUrl={person.photoUrl} size={64} />
          <Text style={[styles.name, { color: t.inkStrong }]}>{person.name}</Text>
          <Text style={[styles.meta, { color: t.inkMuted }]}>
            {[summary?.roleTitle ?? person.role, summary?.organization ?? organization?.name]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {summary?.region ? (
            <Text style={[styles.region, { color: t.inkMuted }]}>{summary.region}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Message ${person.name}`}
            onPress={() => onMessage(person.id)}
            style={[styles.messageButton, { backgroundColor: t.surfaceAnchor }]}
          >
            <ChatCircle size={17} color={t.inkInverse} />
            <Text style={[styles.messageText, { color: t.inkInverse }]}>Message</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator color={t.brandGreen} style={styles.status} /> : null}
        {error ? (
          <View style={styles.status}>
            <Text style={[styles.error, { color: t.brandRed }]}>{error}</Text>
            <Pressable onPress={onRetry} style={[styles.retry, { borderColor: t.ruleHairline }]}>
              <Text style={[styles.retryText, { color: t.brandGreen }]}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {summary && summary.sharedGroupCount > 0 ? (
          <View style={[styles.stats, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            <Stat label="Threads" value={summary.threadCount} />
            <Stat label="Replies" value={summary.replyCount} />
            <Stat label="Shared groups" value={summary.sharedGroupCount} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  const { t } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: t.inkStrong }]}>{value ?? '—'}</Text>
      <Text style={[styles.statLabel, { color: t.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32, gap: 16 },
  card: { alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 20 },
  name: { marginTop: 12, fontFamily: sans(600), fontSize: 20, letterSpacing: trackDisplay(20) },
  meta: { marginTop: 5, textAlign: 'center', fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  region: { marginTop: 3, fontFamily: sans(400), fontSize: 12 },
  messageButton: { marginTop: 16, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 7, paddingHorizontal: 16 },
  messageText: { fontFamily: sans(600), fontSize: 13 },
  status: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  error: { textAlign: 'center', fontFamily: sans(400), fontSize: 13 },
  retry: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 14 },
  retryText: { fontFamily: sans(600), fontSize: 12 },
  stats: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statValue: { fontFamily: sans(600), fontSize: 18 },
  statLabel: { marginTop: 3, textAlign: 'center', fontFamily: sans(400), fontSize: 10.5 },
});
