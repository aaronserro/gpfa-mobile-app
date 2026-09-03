import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../ds/ThemeProvider';
import { mono } from '../../ds/tokens';

const MAX_TEXT_BYTES = 1_000_000;

export function ResourceTextRenderer({
  uri,
  headers,
  onError,
}: {
  uri: string;
  headers?: Record<string, string>;
  onError: (message: string) => void;
}) {
  const { t } = useTheme();
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setContent(null);

    void fetch(uri, { headers, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The preview returned status ${response.status}.`);
        const declaredSize = Number(response.headers.get('content-length'));
        if (Number.isFinite(declaredSize) && declaredSize > MAX_TEXT_BYTES) {
          throw new Error('This text file is too large to preview safely.');
        }
        const text = await response.text();
        if (text.length > MAX_TEXT_BYTES) {
          throw new Error('This text file is too large to preview safely.');
        }
        setContent(text);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          onError(cause instanceof Error ? cause.message : 'The text file could not be loaded.');
        }
      });

    return () => controller.abort();
  }, [headers, onError, uri]);

  if (content === null) {
    return (
      <View style={[styles.center, { backgroundColor: t.surfacePaper }]}>
        <ActivityIndicator color={t.brandGreen} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.surfacePaper }} contentContainerStyle={styles.content}>
      <Text selectable style={[styles.text, { color: t.inkBody }]}>
        {content}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { padding: 20 },
  text: { fontFamily: mono(400), fontSize: 13, lineHeight: 20 },
});