import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AskDisplayMessage, AskSource } from '../api/types';
import AskMarkdownAnswer from '../components/ask-gpfa/AskMarkdownAnswer';
import AskResearchStatus from '../components/ask-gpfa/AskResearchStatus';
import AskSources from '../components/ask-gpfa/AskSources';
import { ArrowRight, ArrowUp, ChatCircleDots } from '../ds/icons';
import { Input, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';

import markLogo from '../../assets/logo-no-txt.png';

export default function AskScreen({
  messages,
  suggestions,
  loading,
  error,
  sending,
  hasEarlier,
  loadingEarlier,
  onSend,
  onStop,
  onOpenSource,
  onOpenHistory,
  onLoadEarlier,
  onRetry,
}: {
  messages: AskDisplayMessage[];
  suggestions: string[];
  loading: boolean;
  error: Error | null;
  sending: boolean;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
  onOpenSource: (source: AskSource) => void;
  onOpenHistory: () => void;
  onLoadEarlier: () => void;
  onRetry?: () => void;
}) {
  const { t } = useTheme();
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView>(null);
  const lastTailId = useRef<string | null>(null);

  useEffect(() => {
    const tailId = messages.at(-1)?.id ?? null;
    if (tailId === lastTailId.current) return;
    lastTailId.current = tailId;
    const frame = requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  const send = (q: string) => {
    const question = q.trim();
    if (!question || sending) return;
    setDraft('');
    onSend(question);
  };

  const empty = messages.length === 0 && !sending && !loading && !error;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Ask "
        accent="GPFA."
        actions={(
          <Pressable
            onPress={onOpenHistory}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Open Ask GPFA conversation history"
            hitSlop={8}
            style={({ pressed }) => [styles.headerAction, (pressed || sending) && { opacity: 0.7 }]}
          >
            <ChatCircleDots size={20} color={t.brandGreenOnDark} />
          </Pressable>
        )}
      />

      <ScrollView
        ref={scroller}
        style={styles.fill}
        contentContainerStyle={styles.chat}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading && messages.length === 0 && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={t.brandGreen} />
            <Text style={[styles.stateText, { color: t.inkMuted }]}>Loading conversation…</Text>
          </View>
        )}

        {error && messages.length === 0 && !loading && (
          <View style={styles.loadingState}>
            <Text style={[styles.stateText, { color: t.inkBody }]}>This conversation could not be loaded.</Text>
            {onRetry && (
              <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retryButton}>
                <Text style={[styles.retryText, { color: t.brandGreen }]}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {empty && (
          <View>
            <Image source={markLogo} style={styles.mark} resizeMode="contain" />
            <View style={styles.suggestions}>
              {suggestions.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => send(q)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    { borderColor: pressed ? t.ruleStrong : t.ruleHairline, backgroundColor: t.surfacePaper },
                  ]}
                >
                  <Text style={[styles.suggestionText, { color: t.inkBody }]}>{q}</Text>
                  <ArrowRight size={15} color={t.inkFaint} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.messages}>
          {error && messages.length > 0 && !loading && (
            <View style={[styles.inlineError, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
              <Text style={[styles.stateText, { color: t.inkBody }]}>Ask GPFA could not complete that request.</Text>
              {onRetry && (
                <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retryButton}>
                  <Text style={[styles.retryText, { color: t.brandGreen }]}>Reload conversation</Text>
                </Pressable>
              )}
            </View>
          )}
          {hasEarlier && (
            <Pressable
              onPress={onLoadEarlier}
              disabled={loadingEarlier}
              accessibilityRole="button"
              style={styles.loadEarlier}
            >
              {loadingEarlier && <ActivityIndicator size="small" color={t.brandGreen} />}
              <Text style={[styles.loadEarlierText, { color: t.brandGreen }]}>
                {loadingEarlier ? 'Loading earlier messages…' : 'Load earlier messages'}
              </Text>
            </Pressable>
          )}
          {messages.map((m) => (
            <View key={m.id} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <View
                style={[
                  styles.bubble,
                  m.role === 'user'
                    ? { backgroundColor: t.surfaceAnchor, borderColor: 'transparent' }
                    : { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline },
                ]}
              >
                {m.stream && <AskResearchStatus stream={m.stream} />}
                {m.role === 'user' ? (
                  <Text style={[styles.bubbleText, { color: t.inkInverse }]}>{m.text}</Text>
                ) : m.text ? (
                  <AskMarkdownAnswer streaming={m.stream?.status === 'generating'}>{m.text}</AskMarkdownAnswer>
                ) : null}
                {m.stream?.status === 'stopped' && (
                  <Text style={[styles.stoppedCopy, { color: t.inkMuted }]}>Stopped — this partial answer was not saved.</Text>
                )}
                <AskSources sources={m.sources} sourceState={m.sourceState} onOpen={onOpenSource} />
                {m.stream?.status === 'generating' && (
                  <Pressable
                    onPress={onStop}
                    accessibilityRole="button"
                    accessibilityLabel="Stop generating answer"
                    style={[styles.stopButton, { borderColor: t.ruleHairline }]}
                  >
                    <View style={[styles.stopIcon, { backgroundColor: t.inkMuted }]} />
                    <Text style={[styles.stopText, { color: t.inkMuted }]}>Stop</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.composer,
          { borderTopColor: t.ruleHairline, backgroundColor: t.surfacePaper, paddingBottom: 6 },
        ]}
      >
        <View style={styles.composerRow}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask GPFA…"
            editable={!sending}
            style={styles.composerInput}
            returnKeyType="send"
            onSubmitEditing={() => send(draft)}
          />
          <Pressable
            onPress={() => send(draft)}
            disabled={sending || !draft.trim()}
            accessibilityLabel="Send"
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: pressed ? t.brandGreenStrong : t.brandGreen },
              (sending || !draft.trim()) && { opacity: 0.5 },
            ]}
          >
            <ArrowUp size={18} color={t.primaryForeground} />
          </Pressable>
        </View>
        <Text style={[styles.disclaimer, { color: t.inkFaint }]}>
          Answers reflect member discussion and are not investment advice.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerAction: { padding: 2 },
  chat: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  mark: {
    width: 56,
    height: 56,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 30,
    opacity: 0.85,
  },
  suggestions: { gap: 8 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  suggestionText: {
    flex: 1,
    fontFamily: sans(400),
    fontSize: 13.5,
  },
  messages: { gap: 12 },
  loadingState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: { fontFamily: sans(400), fontSize: 13.5, textAlign: 'center' },
  inlineError: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  retryButton: { paddingHorizontal: 12, paddingVertical: 8 },
  retryText: { fontFamily: sans(600), fontSize: 13 },
  loadEarlier: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  loadEarlierText: { fontFamily: sans(600), fontSize: 12.5 },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bubbleText: {
    fontFamily: sans(400),
    fontSize: 13.5,
    lineHeight: 21,
  },
  stoppedCopy: { marginTop: 7, fontFamily: sans(400), fontSize: 11, lineHeight: 16 },
  stopButton: { marginTop: 9, minHeight: 32, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderWidth: 1, borderRadius: 16 },
  stopIcon: { width: 8, height: 8, borderRadius: 1 },
  stopText: { fontFamily: sans(600), fontSize: 11.5 },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  composerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    marginTop: 7,
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 9.5,
  },
});
