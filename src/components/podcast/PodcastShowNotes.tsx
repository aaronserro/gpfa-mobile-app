import Markdown from 'markdown-to-jsx/native';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans, trackDisplay } from '../../ds/tokens';
import { distinctEpisodeShowNotes, isSafeShowNotesHref } from '../../lib/podcast-show-notes';

export default function PodcastShowNotes({
  markdown,
  episodeTitle,
  summary,
  onOpenLink,
}: {
  markdown?: string;
  episodeTitle: string;
  summary: string;
  onOpenLink?: (href: string) => void;
}) {
  const { t } = useTheme();
  const notes = distinctEpisodeShowNotes(markdown, episodeTitle, summary);
  if (!notes) return null;

  return (
    <View style={[styles.section, { borderTopColor: t.ruleHairline }]}>
      <Text style={[styles.title, { color: t.inkStrong }]}>About this episode</Text>
      <Markdown
        options={{
          disableParsingRawHTML: true,
          onLinkPress: (href) => {
            if (isSafeShowNotesHref(href)) onOpenLink?.(href);
          },
          styles: {
            paragraph: [styles.paragraph, { color: t.inkBody }],
            heading1: [styles.heading, { color: t.inkStrong }],
            heading2: [styles.heading, { color: t.inkStrong }],
            heading3: [styles.subheading, { color: t.inkStrong }],
            link: [styles.link, { color: t.brandGreen }],
            strong: { fontFamily: sans(600) },
            em: { fontStyle: 'italic' },
            codeInline: [styles.codeInline, { color: t.inkStrong, backgroundColor: t.surfaceSoft }],
            codeBlock: [styles.codeBlock, { backgroundColor: t.surfaceSoft }],
            blockquote: [styles.blockquote, { borderLeftColor: t.ruleStrong }],
            listOrdered: styles.list,
            listUnordered: styles.list,
            listItem: styles.listItem,
            listItemBullet: { color: t.inkMuted },
            listItemNumber: { color: t.inkMuted },
          },
        }}
      >
        {notes}
      </Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18, paddingTop: 18, borderTopWidth: 1 },
  title: {
    marginBottom: 10,
    fontFamily: sans(600),
    fontSize: 15,
    letterSpacing: trackDisplay(15),
  },
  paragraph: { marginBottom: 10, fontFamily: sans(400), fontSize: 13, lineHeight: 20.8 },
  heading: { marginTop: 10, marginBottom: 7, fontFamily: sans(600), fontSize: 16, lineHeight: 21 },
  subheading: { marginTop: 8, marginBottom: 6, fontFamily: sans(600), fontSize: 14, lineHeight: 19 },
  link: { textDecorationLine: 'underline', fontFamily: sans(500) },
  codeInline: { fontFamily: mono(400), fontSize: 12 },
  codeBlock: { marginBottom: 10, padding: 10, borderRadius: 6 },
  blockquote: { marginBottom: 10, paddingLeft: 12, borderLeftWidth: 2 },
  list: { marginBottom: 10 },
  listItem: { marginBottom: 5 },
});
