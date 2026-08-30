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
import { Input } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { mono, postTypeStyle, sans, trackDisplay } from '../ds/tokens';
import type { ForumUploadFile, Group, GroupMember, NewPostInput, PostType } from '../api/types';
import ForumFilePicker from './groups/ForumFilePicker';
import { MentionInput } from './groups/MentionInput';

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
 * Creates forum posts and uploads selected attachments before submission.
 */
export default function PostComposer({
  groups,
  initialGroupId,
  tagSuggestions = [],
  mentionMembersByGroup,
  onSelectGroup,
  onClose,
  onCreate,
}: {
  groups: Group[];
  initialGroupId: string;
  tagSuggestions?: string[];
  mentionMembersByGroup: Record<string, GroupMember[] | undefined>;
  onSelectGroup?: (groupId: string) => void;
  onClose: () => void;
  onCreate: (draft: NewPostInput) => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [groupId, setGroupId] = useState(initialGroupId);
  const [type, setType] = useState<PostType>('discussion');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<ForumUploadFile[]>([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [timezone, setTimezone] = useState('');
  const [location, setLocation] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const parsedPollOptions = pollOptions
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);
  const canPost = title.trim().length > 0 && (type !== 'poll' || parsedPollOptions.length >= 2);

  const submit = () => {
    if (!canPost) return;
    onCreate({
      groupId,
      groupSlug: selectedGroup?.slug ?? groupId,
      type,
      title: title.trim(),
      body: body.trim(),
      tags,
      files: type === 'poll' ? undefined : files,
      pollQuestion: pollQuestion.trim() || undefined,
      pollOptions: parsedPollOptions,
      closesAt: closesAt.trim() || undefined,
      startsAt: startsAt.trim() || undefined,
      endsAt: endsAt.trim() || undefined,
      timezone: timezone.trim() || undefined,
      location: location.trim() || undefined,
      registrationUrl: registrationUrl.trim() || undefined,
      isVirtual,
    });
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
            <Text style={[styles.fieldLabel, { color: t.inkMuted }]}>Working group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {groups.map((g) => {
                const on = g.id === groupId;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setGroupId(g.id);
                      onSelectGroup?.(g.id);
                    }}
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

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Post type</Text>
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

            {tagSuggestions.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Tags</Text>
                <View style={styles.suggestionRow}>
                  {tagSuggestions.map((tag) => {
                    const on = tags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() =>
                          setTags((prev) => on ? prev.filter((value) => value !== tag) : [...prev, tag])
                        }
                        style={[
                          styles.suggestionChip,
                          {
                            borderColor: on ? t.surfaceAnchor : t.ruleHairline,
                            backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                          },
                        ]}
                      >
                        <Text style={[styles.suggestionText, { color: on ? t.inkInverse : t.inkMuted }]}>{tag}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Title</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="What should peers compare or decide?"
              style={styles.field}
            />

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Body</Text>
            <MentionInput
              value={body}
              onChangeText={setBody}
              members={mentionMembersByGroup[groupId] ?? []}
              placeholder="Share the question, constraint, or decision point."
              multiline
              textAlignVertical="top"
              inputStyle={[styles.field, styles.textarea]}
            />

            {type === 'poll' && (
              <>
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Poll question</Text>
                <Input value={pollQuestion} onChangeText={setPollQuestion} placeholder="Question members will answer" style={styles.field} />
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Options</Text>
                <Input
                  value={pollOptions}
                  onChangeText={setPollOptions}
                  placeholder="One option per line"
                  multiline
                  textAlignVertical="top"
                  style={[styles.field, styles.textarea]}
                />
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Closes at</Text>
                <Input value={closesAt} onChangeText={setClosesAt} placeholder="2026-09-01T17:00:00Z" style={styles.field} />
              </>
            )}

            {type === 'event' && (
              <>
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Starts at</Text>
                <Input value={startsAt} onChangeText={setStartsAt} placeholder="2026-09-01T17:00:00Z" style={styles.field} />
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Ends at</Text>
                <Input value={endsAt} onChangeText={setEndsAt} placeholder="2026-09-01T18:00:00Z" style={styles.field} />
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Timezone</Text>
                <Input value={timezone} onChangeText={setTimezone} placeholder="America/Toronto" style={styles.field} />
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Location</Text>
                <Input value={location} onChangeText={setLocation} placeholder="Toronto or Zoom" style={styles.field} />
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Registration URL</Text>
                <Input value={registrationUrl} onChangeText={setRegistrationUrl} placeholder="https://..." autoCapitalize="none" style={styles.field} />
                <Pressable onPress={() => setIsVirtual((value) => !value)} style={[styles.virtualToggle, { borderColor: t.ruleHairline }]}>
                  <Text style={[styles.virtualText, { color: t.inkMuted }]}>{isVirtual ? 'Virtual event' : 'In-person or hybrid'}</Text>
                </Pressable>
              </>
            )}

            {type !== 'poll' && (
              <>
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Attachments</Text>
                <ForumFilePicker files={files} onChange={setFiles} />
              </>
            )}
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
  fieldLabel: { fontFamily: sans(500), fontSize: 12.5 },
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
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  suggestionChip: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 32,
  },
  suggestionText: { fontFamily: sans(500), fontSize: 11.5 },
  field: {
    marginTop: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textarea: { minHeight: 88 },
  virtualToggle: {
    minHeight: 38,
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  virtualText: { fontFamily: sans(500), fontSize: 12.5 },
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
