import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDots, ChartBar, ChatCircle, Megaphone, X, type Icon } from '../ds/icons';
import { Eyebrow, Input } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { mono, postTypeStyle, sans, trackDisplay } from '../ds/tokens';
import type { Group, NewPostInput, PostType } from '../api/types';

const TYPES: PostType[] = ['discussion', 'poll', 'announcement', 'event'];

const TYPE_ICON: Record<PostType, Icon> = {
  discussion: ChatCircle,
  poll: ChartBar,
  announcement: Megaphone,
  event: CalendarDots,
};

const TYPE_HINT: Record<PostType, string> = {
  discussion: 'Share the question you want the group to answer.',
  poll: 'Question, then options. One response per organization.',
  announcement: 'What changed, and what members need to do about it.',
  event: 'Date, time, location, and who should attend.',
};

/**
 * Scaffold composer: enough to create a real post in the feed (group, type,
 * title, body). Poll options and event details are not captured yet — a poll
 * or event created here posts without them.
 */
export default function PostComposer({
  groups,
  initialGroupId,
  onClose,
  onCreate,
}: {
  groups: Group[];
  initialGroupId: string;
  onClose: () => void;
  onCreate: (draft: NewPostInput) => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [groupId, setGroupId] = useState(initialGroupId);
  const [type, setType] = useState<PostType>('discussion');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const canPost = title.trim().length > 0;

  const submit = () => {
    if (!canPost) return;
    onCreate({ groupId, type, title: title.trim(), body: body.trim() });
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline, paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.ruleHairline }]} />

          <View style={styles.head}>
            <Text style={[styles.title, { color: t.inkStrong }]}>New post</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={18} color={t.inkMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Eyebrow size={10}>Working group</Eyebrow>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {groups.map((g) => {
                const on = g.id === groupId;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGroupId(g.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                        borderColor: on ? t.surfaceAnchor : t.ruleHairline,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? t.inkInverse : t.inkMuted }]}>{g.short}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Eyebrow size={10} style={styles.label}>
              Post type
            </Eyebrow>
            <View style={styles.typeGrid}>
              {TYPES.map((k) => {
                const kind = postTypeStyle(t, k);
                const TypeIcon = TYPE_ICON[k];
                const on = k === type;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setType(k)}
                    style={[
                      styles.typeTile,
                      {
                        backgroundColor: on ? kind.chipBg : t.surfacePaper,
                        borderColor: on ? kind.chipBd : t.ruleHairline,
                      },
                    ]}
                  >
                    <TypeIcon size={15} color={kind.ink} />
                    <Text style={[styles.typeLabel, { color: on ? kind.ink : t.inkMuted }]}>{kind.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.hint, { color: t.inkFaint }]}>{TYPE_HINT[type]}</Text>

            <Eyebrow size={10} style={styles.label}>
              Title
            </Eyebrow>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="What should peers compare or decide?"
              style={styles.field}
            />

            <Eyebrow size={10} style={styles.label}>
              Body
            </Eyebrow>
            <Input
              value={body}
              onChangeText={setBody}
              placeholder="Share the question, constraint, or decision point."
              multiline
              textAlignVertical="top"
              style={[styles.field, styles.textarea]}
            />
          </ScrollView>

          <Pressable
            onPress={submit}
            disabled={!canPost}
            style={({ pressed }) => [
              styles.post,
              {
                backgroundColor: canPost ? (pressed ? t.brandGreenStrong : t.surfaceAnchor) : t.muted,
              },
            ]}
          >
            <Text style={[styles.postText, { color: canPost ? '#fff' : t.inkFaint }]}>Post to group</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,35,41,.42)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: sans(600),
    fontSize: 16,
    letterSpacing: trackDisplay(16),
  },
  body: { paddingBottom: 14 },
  label: { marginTop: 16 },
  chips: {
    gap: 8,
    paddingVertical: 10,
  },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: mono(400),
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  typeTile: {
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  typeLabel: {
    fontFamily: sans(500),
    fontSize: 13,
  },
  hint: {
    marginTop: 8,
    fontFamily: sans(400),
    fontSize: 11.5,
    lineHeight: 17,
  },
  field: {
    marginTop: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textarea: { minHeight: 88 },
  post: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  postText: {
    fontFamily: sans(600),
    fontSize: 14,
  },
});
