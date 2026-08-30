import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AskSource, AskSourceState } from '../../api/types';
import { BookOpen, Buildings, CalendarDots, CaretDown, ChatCircle, FileText, Microphone, UsersThree } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans } from '../../ds/tokens';

const TYPE_LABELS: Record<AskSource['type'], string> = {
  event: 'Event',
  discussion: 'Discussion',
  reply: 'Reply',
  working_group_activity: 'Working group',
  member: 'Member',
  leader: 'Leader',
  organization: 'Organization',
  resource: 'Resource',
  podcast: 'Podcast',
  article: 'Article',
  news: 'News',
  intelligence: 'Intelligence',
  public_content: 'GPFA',
  file_material: 'Member material',
};

function SourceIcon({ source, color }: { source: AskSource; color: string }) {
  const Icon =
    source.type === 'event'
      ? CalendarDots
      : source.type === 'member'
        ? UsersThree
        : source.type === 'organization'
          ? Buildings
          : source.type === 'podcast'
            ? Microphone
            : source.type === 'discussion' || source.type === 'reply' || source.type === 'working_group_activity'
              ? ChatCircle
              : source.type === 'resource' || source.type === 'file_material'
                ? BookOpen
                : FileText;
  return <Icon size={15} color={color} />;
}

export default function AskSources({
  sources,
  sourceState,
  onOpen,
}: {
  sources: AskSource[];
  sourceState?: AskSourceState | null;
  onOpen?: (source: AskSource) => void;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);

  if (sources.length === 0) {
    return sourceState === 'failed' ? (
      <Text style={[styles.stateCopy, { color: t.inkMuted }]}>Sources unavailable for this answer.</Text>
    ) : null;
  }

  const stateCopy =
    sourceState === 'failed'
      ? 'Sources unavailable for this answer.'
      : sourceState === 'partial'
        ? 'Some supporting sources were unavailable.'
        : null;

  return (
    <View style={[styles.root, { borderTopColor: t.ruleHairline }]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        <Text style={[styles.heading, { color: t.inkStrong }]}>Sources</Text>
        <Text style={[styles.count, { color: t.inkMuted, borderColor: t.ruleHairline }]}>{sources.length}</Text>
        <CaretDown size={14} color={t.inkFaint} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {stateCopy && <Text style={[styles.stateCopy, { color: t.inkMuted }]}>{stateCopy}</Text>}
      {open && (
        <View style={styles.list}>
          {[...sources].sort((a, b) => a.rank - b.rank).map((source) => (
            <Pressable
              key={`${source.type}:${source.href}`}
              onPress={() => onOpen?.(source)}
              disabled={!onOpen}
              accessibilityRole={onOpen ? 'link' : undefined}
              accessibilityLabel={`Open source: ${source.title}`}
              style={({ pressed }) => [
                styles.source,
                { borderColor: t.ruleHairline, backgroundColor: pressed ? t.surfaceSoft : t.surfacePage },
              ]}
            >
              <SourceIcon source={source} color={t.brandGreen} />
              <View style={styles.sourceCopy}>
                <Text style={[styles.sourceType, { color: t.inkFaint }]}>{TYPE_LABELS[source.type]}</Text>
                <Text style={[styles.sourceTitle, { color: t.inkBody }]}>{source.title}</Text>
                {!!source.excerpt && <Text style={[styles.excerpt, { color: t.inkMuted }]}>{source.excerpt}</Text>}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  header: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heading: { flex: 1, fontFamily: sans(600), fontSize: 12.5 },
  count: { minWidth: 22, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderRadius: 10, textAlign: 'center', fontFamily: mono(500), fontSize: 9.5 },
  stateCopy: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5, lineHeight: 17 },
  list: { marginTop: 7, gap: 6 },
  source: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 9, borderWidth: 1, borderRadius: 8 },
  sourceCopy: { flex: 1, gap: 2 },
  sourceType: { fontFamily: mono(500), fontSize: 9, textTransform: 'uppercase' },
  sourceTitle: { fontFamily: sans(600), fontSize: 12, lineHeight: 17 },
  excerpt: { fontFamily: sans(400), fontSize: 11, lineHeight: 16 },
});
