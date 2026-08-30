import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MemberContentItem } from '../api/types';
import { ArrowFatUp } from '../ds/icons';
import { ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { mono, sans, trackDisplay } from '../ds/tokens';

export default function UpvoteHistoryScreen({ items, onBack }: { items: MemberContentItem[]; onBack: () => void }) {
  const { t } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Upvote history" onBack={onBack} backLabel="Back to account" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            <ArrowFatUp size={25} color={t.brandGreen} />
            <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No upvotes yet</Text>
            <Text style={[styles.body, { color: t.inkMuted }]}>Posts you upvote in member working groups will appear here.</Text>
          </View>
        ) : items.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            <ArrowFatUp size={18} color={t.brandGreen} />
            <View style={styles.flex}>
              <Text style={[styles.title, { color: t.inkStrong }]}>{labelFor(item.target_type)}</Text>
              <Text style={[styles.body, { color: t.inkMuted }]}>You upvoted this member contribution.</Text>
              <Text style={[styles.date, { color: t.inkFaint }]}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function labelFor(type: MemberContentItem['target_type']): string {
  if (type === 'poll') return 'Poll';
  if (type === 'event') return 'Event';
  if (type === 'announcement') return 'Announcement';
  return 'Discussion';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  card: { borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: 'row', gap: 12 },
  title: { fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  body: { marginTop: 4, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  date: { marginTop: 7, fontFamily: mono(400), fontSize: 10.5 },
  empty: { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center' },
  emptyTitle: { marginTop: 10, fontFamily: sans(600), fontSize: 16 },
});
