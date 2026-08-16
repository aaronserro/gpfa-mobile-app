import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, ArrowUp, FileText } from '../ds/icons';
import { Input, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';
import { askGpfa, getAskSuggestions } from '../api/portal';
import { useQuery } from '../api/useQuery';

interface ChatMessage {
  /** true when the member asked it, false for a GPFA answer. */
  user: boolean;
  text: string;
  sources?: string[];
}

import markLogo from '../../assets/logo-no-txt.png';

/** One dot of the three-dot typing indicator (@keyframes ask-dot). */
function Dot({ delay, color }: { delay: number; color: string }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(p, { toValue: 1, duration: 330, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(p, { toValue: 0, duration: 330, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(440 - delay),
      ])
    );
    a.start();
    return () => a.stop();
  }, [delay, p]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
        transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
      }}
    />
  );
}

export default function AskScreen() {
  const { t } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { data: suggestions } = useQuery(getAskSuggestions, []);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question) return;
    setMessages((prev) => [...prev, { user: true, text: question }]);
    setDraft('');
    setTyping(true);
    try {
      const answer = await askGpfa(question);
      if (!alive.current) return;
      setMessages((prev) => [...prev, { user: false, text: answer.text, sources: answer.sources }]);
    } catch {
      if (!alive.current) return;
      setMessages((prev) => [
        ...prev,
        { user: false, text: 'Ask GPFA is unavailable right now. Please try again.' },
      ]);
    } finally {
      if (alive.current) setTyping(false);
    }
  };

  const scrollDown = () => scroller.current?.scrollToEnd({ animated: true });
  const empty = messages.length === 0 && !typing;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Ask " accent="GPFA." />

      <ScrollView
        ref={scroller}
        style={styles.fill}
        contentContainerStyle={styles.chat}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollDown}
      >
        {empty && (
          <View>
            <Image source={markLogo} style={styles.mark} resizeMode="contain" />
            <View style={styles.suggestions}>
              {(suggestions ?? []).map((q) => (
                <Pressable
                  key={q}
                  onPress={() => void ask(q)}
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
          {messages.map((m, i) => (
            <View key={i} style={{ alignItems: m.user ? 'flex-end' : 'flex-start' }}>
              <View
                style={[
                  styles.bubble,
                  m.user
                    ? { backgroundColor: t.surfaceAnchor, borderColor: 'transparent' }
                    : { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline },
                ]}
              >
                <Text style={[styles.bubbleText, { color: m.user ? t.inkInverse : t.inkBody }]}>{m.text}</Text>
                {!!m.sources?.length && (
                  <View style={[styles.sources, { borderTopColor: t.ruleHairline }]}>
                    {m.sources.map((src) => (
                      <View key={src} style={styles.sourceRow}>
                        <FileText size={11} color={t.brandGreen} />
                        <MastheadMeta size={10} style={styles.sourceText}>
                          {src}
                        </MastheadMeta>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {typing && (
            <View style={[styles.typing, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
              <Dot delay={0} color={t.inkMuted} />
              <Dot delay={180} color={t.inkMuted} />
              <Dot delay={360} color={t.inkMuted} />
            </View>
          )}
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
            style={styles.composerInput}
            returnKeyType="send"
            onSubmitEditing={() => void ask(draft)}
          />
          <Pressable
            onPress={() => void ask(draft)}
            accessibilityLabel="Send"
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: pressed ? t.brandGreenStrong : t.brandGreen },
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
  sources: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 5,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  sourceText: { flex: 1 },
  typing: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
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
