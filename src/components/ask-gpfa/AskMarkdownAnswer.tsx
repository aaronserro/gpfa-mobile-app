import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';
import Markdown from 'markdown-to-jsx/native';

import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans } from '../../ds/tokens';

function InertLink({ children, style }: TextProps) {
  return <Text style={style}>{children}</Text>;
}

function HiddenImage() {
  return null;
}

function HorizontalBlock({ children, style }: ViewProps & { children?: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent}>
      <View style={style}>{children}</View>
    </ScrollView>
  );
}

export default function AskMarkdownAnswer({
  children,
  streaming = false,
}: {
  children: string;
  streaming?: boolean;
}) {
  const { t } = useTheme();

  return (
    <View>
      <Markdown
        options={{
          optimizeForStreaming: streaming,
          disableAutoLink: true,
          disableParsingRawHTML: true,
          ignoreHTMLBlocks: true,
          overrides: {
            a: { component: InertLink },
            img: { component: HiddenImage },
            table: { component: HorizontalBlock },
            pre: { component: HorizontalBlock },
          },
          styles: {
            text: { color: t.inkBody, fontFamily: sans(400), fontSize: 13.5, lineHeight: 21 },
            paragraph: { marginTop: 0, marginBottom: 8 },
            heading1: { color: t.inkStrong, fontFamily: sans(700), fontSize: 19, lineHeight: 25, marginBottom: 8 },
            heading2: { color: t.inkStrong, fontFamily: sans(700), fontSize: 17, lineHeight: 23, marginBottom: 7 },
            heading3: { color: t.inkStrong, fontFamily: sans(600), fontSize: 15, lineHeight: 21, marginBottom: 6 },
            strong: { fontFamily: sans(700) },
            em: { fontFamily: sans(400), fontStyle: 'italic' },
            link: { color: t.inkBody, textDecorationLine: 'none' },
            blockquote: { borderLeftColor: t.brandGreen, borderLeftWidth: 2, paddingLeft: 10, marginVertical: 8 },
            codeInline: { color: t.inkStrong, backgroundColor: t.surfaceSoft, fontFamily: mono(400), fontSize: 12 },
            codeBlock: { backgroundColor: t.surfaceSoft, padding: 10 },
            thematicBreak: { backgroundColor: t.ruleHairline, height: 1, marginVertical: 10 },
            listItem: { marginBottom: 4 },
            listItemBullet: { color: t.brandGreen },
            listItemNumber: { color: t.brandGreen, fontFamily: mono(500) },
            table: { borderColor: t.ruleHairline, borderWidth: 1 },
            tableHeader: { backgroundColor: t.surfaceSoft },
            tableHeaderCell: { padding: 7 },
            tableCell: { padding: 7 },
            tableCellDivider: { backgroundColor: t.ruleHairline },
            tableRowDivider: { backgroundColor: t.ruleHairline },
          },
        }}
      >
        {children}
      </Markdown>
      {streaming && <Text style={[styles.caret, { color: t.brandGreen }]}>▍</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContent: { minWidth: '100%' },
  caret: { fontFamily: mono(500), fontSize: 13, lineHeight: 18 },
});
