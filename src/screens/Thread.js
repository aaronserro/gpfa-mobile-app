import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FadeIn } from '../components/common';
import { avatarColors, delay, initials } from '../data';
import { colors, mono, TOP } from '../theme';

export default function Thread({ thread, groupName, onBack, onReply }) {
  const [reply, setReply] = useState('');

  if (!thread) return null;

  const post = () => {
    if (!reply.trim()) return;
    onReply(reply.trim());
    setReply('');
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.backRow}>
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.scale]} onPress={onBack}>
          <Text style={styles.backText}>‹ {groupName}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>{thread.title}</Text>
          <View style={styles.tagRow}>
            {thread.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {thread.posts.map((p, i) => (
          <FadeIn key={`${p.author}-${i}`} delay={delay(i)} duration={400} style={styles.post}>
            <View style={[styles.avatar, { backgroundColor: avatarColors[p.author] || colors.green }]}>
              <Text style={styles.avatarText}>{initials(p.author)}</Text>
            </View>
            <View style={styles.bubble}>
              <View style={styles.bubbleHead}>
                <Text style={styles.author}>{p.author}</Text>
                <Text style={styles.time}>{p.time}</Text>
              </View>
              <Text style={styles.body}>{p.text}</Text>
            </View>
          </FadeIn>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={reply}
          onChangeText={setReply}
          placeholder="Reply to this thread…"
          placeholderTextColor={colors.dim}
          returnKeyType="send"
          onSubmitEditing={post}
        />
        <Pressable style={({ pressed }) => [styles.post_, pressed && styles.scale]} onPress={post}>
          <Text style={styles.postText}>Post</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingTop: TOP },
  backRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairSoft,
    alignItems: 'flex-start',
  },
  back: {
    height: 36,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.sub,
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  head: { gap: 8 },
  title: {
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 26,
    color: colors.text,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(169,217,164,0.1)',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  tagText: {
    fontFamily: mono,
    fontSize: 10.5,
    color: colors.green,
  },
  post: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.greenInk,
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 5,
  },
  bubbleHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  time: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.dim,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.sub,
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
    borderTopWidth: 1,
    borderTopColor: colors.hairSoft,
    backgroundColor: 'rgba(12,23,19,0.9)',
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
  post_: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postText: {
    color: colors.greenInk,
    fontSize: 14,
    fontWeight: '700',
  },
  scale: { transform: [{ scale: 0.95 }] },
});
