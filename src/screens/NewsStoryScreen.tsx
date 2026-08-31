import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Markdown from 'markdown-to-jsx/native';

import type { NewsFeedItem, RelatedNewsThread } from '../api/types';
import { ArrowLeft, ArrowRight, ArrowSquareOut, LockSimple, Sparkle } from '../ds/icons';
import { MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans } from '../ds/tokens';
import { newsLinkDestination, newsSummaryBullets, stripMarkdownHtml } from '../lib/newsReader';

export default function NewsStoryScreen({ item, relatedThreads, canPrevious, canNext, onBack, onPrevious, onNext, onOpenThread }: {
  item: NewsFeedItem; relatedThreads: RelatedNewsThread[]; canPrevious: boolean; canNext: boolean;
  onBack: () => void; onPrevious: () => void; onNext: () => void;
  onOpenThread: (thread: RelatedNewsThread) => void;
}) {
  const { t } = useTheme();
  const openMarkdownLink = (href: string) => {
    const destination = newsLinkDestination(href);
    if (destination.kind === 'external') void Linking.openURL(destination.url);
    if (destination.kind === 'group') {
      const thread = relatedThreads.find((row) => row.id === destination.id && row.groupSlug === destination.slug);
      if (thread) onOpenThread(thread);
    }
  };
  const storyThreads = item.kind === 'radar'
    ? (item.relatedThreadIds ?? []).map((id) => relatedThreads.find((thread) => thread.id === id)).filter((thread): thread is RelatedNewsThread => Boolean(thread))
    : [];

  return <View style={styles.fill}>
    <ScreenHeader title="Story" onBack={onBack} backLabel="Back to News Radar" />
    <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors /> : <View style={[styles.hero, { backgroundColor: t.surfaceSoft }]} />}
      <View style={styles.article}>
        <View style={styles.badges}><Text style={[styles.badge, { borderColor: t.ruleHairline, color: t.inkMuted }]}>{item.kind === 'gpfa' ? item.articleType : item.topic}</Text>{item.kind === 'gpfa' && item.isMemberOnly ? <View style={styles.lock}><LockSimple size={13} color={t.inkMuted} /><Text style={{ color: t.inkMuted, fontFamily: mono(500), fontSize: 9 }}>MEMBERS ONLY</Text></View> : null}</View>
        <Text style={[styles.title, { color: t.inkStrong }]}>{item.title}</Text>
        <MastheadMeta size={10}>{item.sourceName} · {item.publishedAt}</MastheadMeta>
        {item.kind === 'radar' ? <>
          <Text style={[styles.sectionTitle, { color: t.inkStrong }]}>Summary</Text>
          <View>{newsSummaryBullets(item.summary).map((bullet, index) => <View key={`${item.id}-${index}`} style={[styles.bulletRow, { borderBottomColor: t.ruleHairline }]}><View style={[styles.number, { borderColor: t.ruleHairline, backgroundColor: t.surfaceSoft }]}><Text style={{ color: t.inkMuted, fontFamily: mono(500), fontSize: 10 }}>{index + 1}</Text></View><Text style={[styles.body, styles.flex, { color: t.inkStrong }]}>{bullet}</Text></View>)}</View>
          <View style={[styles.analysis, { backgroundColor: alpha(t.brandGreen, 0.1), borderColor: alpha(t.brandGreen, 0.3) }]}><View style={styles.analysisTitle}><Sparkle size={15} color={t.brandGreen} /><Text style={{ color: t.brandGreen, fontFamily: sans(600) }}>Why this matters</Text></View><Text style={[styles.body, { color: t.inkStrong }]}>{item.whyItMatters}</Text></View>
        </> : <>
          {item.excerpt ? <Text style={[styles.lead, { color: t.inkStrong }]}>{item.excerpt}</Text> : null}
          {item.body ? <Markdown options={{
            onLinkPress: openMarkdownLink,
            overrides: { table: { component: MarkdownTable } },
            styles: {
              text: { color: t.inkStrong, fontFamily: sans(400), fontSize: 15, lineHeight: 24 },
              heading1: { color: t.inkStrong, fontFamily: sans(700) }, heading2: { color: t.inkStrong, fontFamily: sans(600) }, heading3: { color: t.inkStrong, fontFamily: sans(600) },
              link: { color: t.brandGreen }, strong: { fontFamily: sans(700) }, em: { fontFamily: sans(400) },
              codeInline: { color: t.inkStrong, backgroundColor: t.surfaceSoft, fontFamily: mono(400) }, codeBlock: { backgroundColor: t.surfaceSoft },
              blockquote: { borderLeftColor: t.brandGreen }, thematicBreak: { backgroundColor: t.ruleHairline },
              table: { borderColor: t.ruleHairline }, tableCell: { borderColor: t.ruleHairline }, tableHeader: { backgroundColor: t.surfaceSoft },
            },
          }}>{stripMarkdownHtml(item.body)}</Markdown> : item.isMemberOnly ? <View style={[styles.unavailable, { borderColor: t.ruleHairline }]}><Text style={[styles.body, { color: t.inkMuted }]}>This member article is temporarily unavailable.</Text></View> : null}
          {item.topics.length ? <View style={styles.topics}>{item.topics.map((topic) => <Text key={topic} style={[styles.topic, { color: t.inkStrong, borderColor: alpha(t.brandGreen, 0.3), backgroundColor: alpha(t.brandGreen, 0.1) }]}>{topic}</Text>)}</View> : null}
        </>}
        {storyThreads.length ? <View style={[styles.discussions, { borderTopColor: t.ruleHairline }]}><Text style={[styles.sectionTitle, { color: t.inkStrong }]}>Discussed in</Text>{storyThreads.map((thread) => <Pressable key={thread.id} onPress={() => onOpenThread(thread)} style={[styles.thread, { borderColor: t.ruleHairline }]}><Text style={[styles.flex, { color: t.inkStrong, fontFamily: sans(500) }]}>{thread.title}</Text><ArrowRight size={15} color={t.inkMuted} /></Pressable>)}</View> : null}
      </View>
    </ScrollView>
    <View style={[styles.footer, { borderTopColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      <View style={styles.nav}><NavButton disabled={!canPrevious} onPress={onPrevious}><ArrowLeft size={17} color={canPrevious ? t.inkStrong : t.inkFaint} /></NavButton><NavButton disabled={!canNext} onPress={onNext}><ArrowRight size={17} color={canNext ? t.inkStrong : t.inkFaint} /></NavButton></View>
      {(item.kind === 'radar' || (!item.isMemberOnly && item.externalUrl)) ? <Pressable onPress={() => void Linking.openURL(item.kind === 'radar' ? item.url : item.externalUrl!)} style={[styles.source, { backgroundColor: t.surfaceAnchor }]}><Text style={{ color: t.inkInverse, fontFamily: sans(600), fontSize: 12 }}>{item.kind === 'radar' ? 'View full article' : 'View original'}</Text><ArrowSquareOut size={15} color={t.inkInverse} /></Pressable> : null}
    </View>
  </View>;
}

function NavButton({ disabled, onPress, children }: { disabled: boolean; onPress: () => void; children: React.ReactNode }) {
  const { t } = useTheme();
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.navButton, { borderColor: t.ruleHairline }, disabled && { opacity: 0.5 }]}>{children}</Pressable>;
}

function MarkdownTable({ children }: { children?: React.ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator>{children}</ScrollView>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, flex: { flex: 1 }, scroll: { paddingBottom: 28 }, hero: { width: '100%', aspectRatio: 16 / 9 }, article: { padding: 20, gap: 14 }, badges: { flexDirection: 'row', alignItems: 'center', gap: 10 }, badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, fontFamily: mono(500), fontSize: 9, textTransform: 'uppercase' }, lock: { flexDirection: 'row', gap: 5, alignItems: 'center' }, title: { fontFamily: sans(700), fontSize: 28, lineHeight: 34 }, sectionTitle: { fontFamily: sans(600), fontSize: 16, marginTop: 6 }, body: { fontFamily: sans(400), fontSize: 15, lineHeight: 24 }, lead: { fontFamily: sans(400), fontSize: 17, lineHeight: 27 }, bulletRow: { flexDirection: 'row', gap: 12, paddingVertical: 13, borderBottomWidth: 1 }, number: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, analysis: { borderWidth: 1, borderRadius: 8, padding: 15, gap: 10 }, analysisTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 }, topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, topic: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontFamily: sans(500), fontSize: 11 }, unavailable: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 15 }, discussions: { borderTopWidth: 1, paddingTop: 12, gap: 9 }, thread: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, footer: { borderTopWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, nav: { flexDirection: 'row', gap: 8 }, navButton: { width: 38, height: 36, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, source: { minHeight: 36, borderRadius: 7, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
});
