import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { NewsFeedFacets, NewsFeedItem, NewsSourceFilter } from '../api/types';
import { LockSimple, Tray } from '../ds/icons';
import { MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans } from '../ds/tokens';
import { newsStoryPreview } from '../lib/newsReader';

const SOURCES: Array<{ value: NewsSourceFilter; label: string }> = [
  { value: 'all', label: 'All' }, { value: 'gpfa', label: 'GPFA' }, { value: 'industry', label: 'Industry' },
];

export default function NewsFeedScreen({
  items, facets, topic, source, totalMatching, totalAvailable, refreshing, loadingMore, error,
  onBack, onOpen, onFilters, onRefresh, onLoadMore, onRetry,
}: {
  items: NewsFeedItem[]; facets: NewsFeedFacets; topic: string; source: NewsSourceFilter;
  totalMatching: number; totalAvailable: number; refreshing: boolean; loadingMore: boolean;
  error: Error | null; onBack: () => void; onOpen: (item: NewsFeedItem) => void;
  onFilters: (topic: string, source: NewsSourceFilter) => void; onRefresh: () => void;
  onLoadMore: () => void; onRetry: () => void;
}) {
  const { t } = useTheme();
  const topics = [{ value: 'All', count: facets.allTopicsCount }, ...facets.topics];
  return <View style={styles.fill}>
    <ScreenHeader title="News Radar" onBack={onBack} backLabel="Back" />
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.brandGreen} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={<View style={styles.controls}>
        <View style={styles.controlRow}>
          <MastheadMeta size={10}>{totalMatching === totalAvailable ? `${totalAvailable} STORIES` : `${totalMatching} OF ${totalAvailable} STORIES`}</MastheadMeta>
          <View style={[styles.segment, { borderColor: t.ruleHairline }]}>{SOURCES.map((option) => <Pressable
            key={option.value} onPress={() => onFilters(topic, option.value)}
            style={({ pressed }) => [styles.segmentButton, pressed ? { opacity: 0.7 } : null, option.value === source && { backgroundColor: t.surfaceAnchor }]}
          ><Text style={{ fontFamily: sans(500), fontSize: 11, color: option.value === source ? t.inkInverse : t.inkMuted }}>{option.label}</Text></Pressable>)}</View>
        </View>
        <FlatList horizontal data={topics} keyExtractor={(item) => item.value} showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicRow} renderItem={({ item }) => <Pressable
            onPress={() => onFilters(item.value, source)}
            style={({ pressed }) => [styles.topic, { borderColor: item.value === topic ? t.surfaceAnchor : t.ruleHairline, backgroundColor: item.value === topic ? t.surfaceAnchor : t.surfacePaper }, pressed ? { opacity: 0.7 } : null]}
          ><Text style={{ color: item.value === topic ? t.inkInverse : t.inkMuted, fontFamily: sans(500), fontSize: 11 }}>{item.value}</Text><Text style={[styles.count, { color: item.value === topic ? t.inkInverse : t.inkMuted }]}>{item.count}</Text></Pressable>} />
      </View>}
      renderItem={({ item }) => <StoryCard item={item} onOpen={() => onOpen(item)} />}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListEmptyComponent={!refreshing ? <View style={[styles.empty, { borderColor: t.ruleHairline }]}><Tray size={22} color={t.inkFaint} /><Text style={{ color: t.inkStrong, fontFamily: sans(600) }}>No stories match these filters</Text></View> : null}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={t.brandGreen} style={styles.footer} /> : error && items.length ? <Pressable onPress={onRetry} style={styles.footer}><Text style={{ color: t.brandGreen, fontFamily: sans(600) }}>Could not load more · Try again</Text></Pressable> : null}
    />
  </View>;
}

function StoryCard({ item, onOpen }: { item: NewsFeedItem; onOpen: () => void }) {
  const { t } = useTheme();
  return <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, { borderColor: t.ruleHairline, backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper }]}>
    {item.imageUrl ? <Image source={item.imageUrl} style={styles.image} contentFit="cover" cachePolicy="memory-disk" recyclingKey={item.id} transition={160} accessibilityIgnoresInvertColors /> : <View style={[styles.image, { backgroundColor: t.surfaceSoft }]} />}
    <View style={styles.cardBody}>
      <View style={styles.badges}><Text style={[styles.badge, { borderColor: t.ruleHairline, color: t.inkMuted }]}>{item.kind === 'gpfa' ? item.articleType : item.topic}</Text>{item.kind === 'gpfa' && item.isMemberOnly ? <LockSimple size={13} color={t.inkMuted} /> : null}</View>
      <Text style={[styles.title, { color: t.inkStrong }]}>{item.title}</Text>
      <MastheadMeta size={10}>{item.sourceName} · {item.publishedAt}</MastheadMeta>
      <Text numberOfLines={3} style={[styles.preview, { color: t.inkMuted }]}>{newsStoryPreview(item)}</Text>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, list: { padding: 20, paddingBottom: 32 }, controls: { gap: 12, marginBottom: 16 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' }, segmentButton: { paddingHorizontal: 10, paddingVertical: 7 },
  topicRow: { gap: 8 }, topic: { flexDirection: 'row', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, count: { fontFamily: mono(400), fontSize: 10 },
  gap: { height: 14 }, card: { borderWidth: 1, borderRadius: 9, overflow: 'hidden' }, image: { width: '100%', aspectRatio: 16 / 8 }, cardBody: { padding: 15, gap: 8 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 7 }, badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontFamily: mono(500), fontSize: 9, textTransform: 'uppercase' },
  title: { fontFamily: sans(600), fontSize: 17, lineHeight: 23 }, preview: { fontFamily: sans(400), fontSize: 14, lineHeight: 21 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 28, alignItems: 'center', gap: 10 }, footer: { padding: 20, alignItems: 'center' },
});
