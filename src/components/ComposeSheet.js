import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Sheet from './Sheet';
import { colors, mono } from '../theme';
import { tagList } from '../data';

export default function ComposeSheet({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [picked, setPicked] = useState({});

  const toggle = (tag) => setPicked((prev) => ({ ...prev, [tag]: !prev[tag] }));

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed, Object.keys(picked).filter((k) => picked[k]));
  };

  return (
    <Sheet onClose={onClose} panelStyle={styles.panel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <View style={styles.header}>
            <Text style={styles.title}>Start a discussion</Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Create a new thread for this working group.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Thread title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What should peers compare or decide?"
              placeholderTextColor={colors.dim}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Context</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={context}
              onChangeText={setContext}
              placeholder="Share the question, constraint, meeting follow-up, or decision point."
              placeholderTextColor={colors.dim}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tags</Text>
            <View style={styles.tagRow}>
              {tagList.map((tag) => {
                const on = !!picked[tag];
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggle(tag)}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: on ? 'rgba(169,217,164,0.18)' : 'rgba(255,255,255,0.03)',
                        borderColor: on ? 'rgba(169,217,164,0.5)' : 'rgba(255,255,255,0.12)',
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: on ? colors.green : colors.muted }]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]} onPress={submit}>
            <Text style={styles.ctaText}>Create thread</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: '85%',
    paddingBottom: 0,
  },
  body: {
    gap: 14,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.sub,
    fontSize: 15,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sub,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.fill,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textarea: {
    height: 92,
    paddingTop: 12,
    paddingBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontFamily: mono,
    fontSize: 12,
  },
  cta: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    color: colors.greenInk,
    fontSize: 15,
    fontWeight: '700',
  },
});
