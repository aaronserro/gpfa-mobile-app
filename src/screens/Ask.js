import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FadeIn, Logo } from '../components/common';
import { askAnswerText, askSuggestions } from '../data';
import { colors, mono, TOP } from '../theme';

/** Blinking caret shown while the answer types out. */
function Caret() {
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 0, delay: 450, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 0, delay: 450, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [blink]);

  return <Animated.View style={[styles.caret, { opacity: blink }]} />;
}

export default function Ask() {
  const [text, setText] = useState('');
  const [asked, setAsked] = useState(null);
  const [answer, setAnswer] = useState('');
  const [typing, setTyping] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    clearInterval(timer.current);
    setAsked(trimmed);
    setText('');
    setAnswer('');
    setTyping(true);

    let i = 0;
    // The design reveals 3 characters every 18ms.
    timer.current = setInterval(() => {
      i += 3;
      if (i >= askAnswerText.length) {
        clearInterval(timer.current);
        setAnswer(askAnswerText);
        setTyping(false);
      } else {
        setAnswer(askAnswerText.slice(0, i));
      }
    }, 18);
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!asked ? (
          <View style={styles.idle}>
            <Logo size={40} spin />
            <Text style={styles.title}>
              Ask <Text style={styles.accent}>GPFA.</Text>
            </Text>
            <Text style={styles.blurb}>
              Answers drawn only from approved member materials: threads, papers, podcasts, and event notes. Every
              claim cited.
            </Text>
            <View style={styles.suggestions}>
              {askSuggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => start(s)}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.scale]}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.conversation}>
            <View style={styles.question}>
              <Text style={styles.questionText}>{asked}</Text>
            </View>
            <FadeIn delay={200} duration={400} style={styles.answerRow}>
              <Logo size={26} strokeWidth={2} />
              <View style={styles.answerBubble}>
                <Text style={styles.answerText}>
                  {answer}
                  {typing ? ' ' : ''}
                </Text>
                {typing && <Caret />}
                {!typing && (
                  <View style={styles.citations}>
                    <View style={styles.citation}>
                      <Text style={styles.citationText}>[1] O&T thread · Aug 11</Text>
                    </View>
                    <View style={styles.citation}>
                      <Text style={styles.citationText}>[2] Annual Meeting notes</Text>
                    </View>
                  </View>
                )}
              </View>
            </FadeIn>
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ask anything across GPFA threads…"
          placeholderTextColor={colors.dim}
          returnKeyType="send"
          onSubmitEditing={() => start(text)}
        />
        <Pressable style={({ pressed }) => [styles.askBtn, pressed && styles.scale]} onPress={() => start(text)}>
          <Text style={styles.askText}>Ask</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingTop: TOP },
  scroll: {
    flexGrow: 1,
    padding: 20,
  },
  idle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  accent: { color: colors.green },
  blurb: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  suggestion: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 12.5,
    color: colors.sub,
  },
  conversation: { gap: 16 },
  question: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: colors.deep,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  answerBubble: {
    flex: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.sub,
  },
  caret: {
    width: 8,
    height: 15,
    backgroundColor: colors.green,
    marginTop: 2,
  },
  citations: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  citation: {
    backgroundColor: 'rgba(169,217,164,0.1)',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  citationText: {
    fontFamily: mono,
    fontSize: 10,
    color: colors.green,
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
    borderTopWidth: 1,
    borderTopColor: colors.hairSoft,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.fill,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  askBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askText: {
    color: colors.greenInk,
    fontSize: 14,
    fontWeight: '700',
  },
  scale: { transform: [{ scale: 0.96 }] },
});
