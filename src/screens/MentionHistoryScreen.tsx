import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MemberMentionActivity } from '../api/types';
import { At, CaretRight } from '../ds/icons';
import { ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';

export default function MentionHistoryScreen({
  items,
  onBack,
  onOpen,
}: {
  items: MemberMentionActivity[];
  onBack: () => void;
  onOpen: (item: MemberMentionActivity) => void;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Mentions" onBack={onBack} backLabel="Back to account" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            <At size={25} color={t.brandGreen} />
            <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No mentions yet</Text>
            <Text style={[styles.emptyBody, { color: t.inkMuted }]}>When another member mentions you in a working-group discussion, it will appear here.</Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => onOpen(item)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: pressed ? alpha(t.surfaceSoft, 0.65) : t.surfacePaper, borderColor: t.ruleHairline },
              ]}
            >
              <View style={styles.flex}>
                <Text style={[styles.group, { color: t.brandGreen }]}>{item.groupName}</Text>
                <Text style={[styles.title, { color: t.inkStrong }]}>{item.title}</Text>
                <Text style={[styles.context, { color: t.inkMuted }]}>{item.context}</Text>
                <Text style={[styles.date, { color: t.inkFaint }]}>{formatDate(item.createdAt)}</Text>
              </View>
              <CaretRight size={15} color={t.inkFaint} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  card: { minHeight: 112, borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  group: { fontFamily: mono(500), fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { marginTop: 5, fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  context: { marginTop: 4, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  date: { marginTop: 7, fontFamily: mono(400), fontSize: 10.5 },
  empty: { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center' },
  emptyTitle: { marginTop: 10, fontFamily: sans(600), fontSize: 16 },
  emptyBody: { marginTop: 6, maxWidth: 300, textAlign: 'center', fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
});
