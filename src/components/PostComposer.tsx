import { useEffect, useMemo, useRef, useState } from 'react';
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
import { postTypeStyle, sans, trackDisplay } from '../ds/tokens';
import type { ForumUploadFile, Group, GroupMember, NewPostInput, PostType } from '../api/types';
import ForumFilePicker from './groups/ForumFilePicker';
import { MentionInput } from './groups/MentionInput';
import PollQuestionFields, {
  createPollQuestionDraft,
  pollQuestionDraftsToInput,
} from './groups/PollQuestionFields';
import {
  deviceTimezone,
  nextWholeHour,
  PostDateTimeField,
  PostTimezoneField,
} from './groups/PostDateTimeFields';
import { pollQuestionsAreValid } from '../lib/polls';
import {
  appendTagToken,
  filterTagSuggestions,
  formatTagCountText,
  getTagSuggestionQuery,
  parseTagInput,
  serializeTagInput,
  type TagSuggestion,
} from '../lib/tags';

const TYPES: PostType[] = ['discussion', 'poll', 'announcement', 'event'];

const TYPE_ICON: Record<PostType, Icon> = {
  discussion: ChatCircle,
  poll: ChartBar,
  announcement: Megaphone,
  event: CalendarDots,
};

const TYPE_HINT: Record<PostType, string> = {
  discussion: 'Share the question you want the group to answer.',
  poll: 'Add one or more questions, then the options for each.',
  announcement: 'What changed, and what members need to do about it.',
  event: 'Date, time, location, and who should attend.',
};

/**
 * Creates forum posts and uploads selected attachments before submission.
 */
export default function PostComposer({
  groups,
  initialGroupId,
  tagSuggestionsByGroup,
  mentionMembersByGroup,
  onSearchTags,
  onClose,
  onCreate,
}: {
  groups: Group[];
  initialGroupId: string;
  tagSuggestionsByGroup: Record<string, TagSuggestion[] | undefined>;
  mentionMembersByGroup: Record<string, GroupMember[] | undefined>;
  onSearchTags: (groupId: string, query: string) => Promise<TagSuggestion[]>;
  onClose: () => void;
  onCreate: (draft: NewPostInput) => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const groupId = initialGroupId;
  const [type, setType] = useState<PostType>('discussion');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [remoteTagSuggestions, setRemoteTagSuggestions] = useState<{
    key: string;
    entries: TagSuggestion[];
  } | null>(null);
  const tagRequestGeneration = useRef(0);
  const [files, setFiles] = useState<ForumUploadFile[]>([]);
  const [pollQuestions, setPollQuestions] = useState(() => [createPollQuestionDraft()]);
  const initialStart = useMemo(() => nextWholeHour(), []);
  const [startsAt, setStartsAt] = useState(initialStart);
  const [endsAt, setEndsAt] = useState(() => new Date(initialStart.getTime() + 60 * 60 * 1000));
  const [closesAt, setClosesAt] = useState(() => new Date(initialStart.getTime() + 7 * 24 * 60 * 60 * 1000));
  const [timezone, setTimezone] = useState(deviceTimezone);
  const [location, setLocation] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const normalizedPollQuestions = pollQuestionDraftsToInput(pollQuestions);
  const tags = useMemo(() => parseTagInput(tagInput, 8), [tagInput]);
  const tagQuery = getTagSuggestionQuery(tagInput);
  const tagLookupKey = `${groupId}:${tagQuery}`;
  const localTagSuggestions = useMemo(
    () => filterTagSuggestions(tagSuggestionsByGroup[groupId] ?? [], tagQuery, 6),
    [groupId, tagQuery, tagSuggestionsByGroup]
  );
  const tagSuggestions =
    remoteTagSuggestions?.key === tagLookupKey && remoteTagSuggestions.entries.length > 0
      ? remoteTagSuggestions.entries
      : localTagSuggestions;

  useEffect(() => {
    if (!groupId) return;

    const generation = tagRequestGeneration.current + 1;
    tagRequestGeneration.current = generation;
    let active = true;
    const timer = setTimeout(() => {
      void onSearchTags(groupId, tagQuery)
        .then((entries) => {
          if (active && tagRequestGeneration.current === generation) {
            setRemoteTagSuggestions({ key: tagLookupKey, entries });
          }
        })
        .catch(() => {
          // Previously loaded group tags remain useful when live lookup fails.
          if (active && tagRequestGeneration.current === generation) {
            setRemoteTagSuggestions({ key: tagLookupKey, entries: [] });
          }
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [groupId, onSearchTags, tagLookupKey, tagQuery]);
  const canPost =
    title.trim().length > 0 &&
    (type !== 'poll' || (pollQuestionsAreValid(normalizedPollQuestions) && closesAt.getTime() > Date.now())) &&
    (type !== 'event' || endsAt.getTime() > startsAt.getTime());

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
      pollQuestions: type === 'poll' ? normalizedPollQuestions : undefined,
      closesAt: type === 'poll' ? closesAt.toISOString() : undefined,
      startsAt: type === 'event' ? startsAt.toISOString() : undefined,
      endsAt: type === 'event' ? endsAt.toISOString() : undefined,
      timezone: type === 'event' ? timezone : undefined,
      location: type === 'event' ? location.trim() || undefined : undefined,
      registrationUrl: type === 'event' ? registrationUrl.trim() || undefined : undefined,
      isVirtual: type === 'event' ? isVirtual : undefined,
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
            <Text style={[styles.fieldLabel, { color: t.inkMuted }]}>Post type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {TYPES.map((k) => {
                const kind = postTypeStyle(t, k);
                const TypeIcon = TYPE_ICON[k];
                const on = k === type;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setType(k)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
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
            </ScrollView>
            <Text style={[styles.hint, { color: t.inkFaint }]}>{TYPE_HINT[type]}</Text>

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Title</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="What should peers compare or decide?"
              style={styles.field}
            />

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Tags</Text>
            <Input
              value={tagInput}
              onChangeText={setTagInput}
              onBlur={() => setTagInput((current) => serializeTagInput(current, 8))}
              placeholder="#repo #collateral #legal"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Tags"
              style={styles.field}
            />
            <Text style={[styles.tagHelp, { color: t.inkFaint }]}>Create new tags as you type. Use hashtags and add up to 8.</Text>
            {tagSuggestions.length > 0 && (
                <View style={styles.suggestionRow}>
                  {tagSuggestions.map((suggestion) => {
                    const normalizedLabel = parseTagInput(`#${suggestion.label}`, 1)[0] ?? suggestion.key;
                    const on = tags.includes(normalizedLabel);
                    return (
                      <Pressable
                        key={suggestion.key}
                        onPress={() => setTagInput((current) => appendTagToken(current, suggestion.label, 8))}
                        accessibilityRole="button"
                        accessibilityLabel={`Add tag ${suggestion.label}, ${formatTagCountText(suggestion.count)}`}
                        style={[
                          styles.suggestionChip,
                          {
                            borderColor: on ? t.surfaceAnchor : t.ruleHairline,
                            backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                          },
                        ]}
                      >
                        <Text style={[styles.suggestionText, { color: on ? t.inkInverse : t.inkMuted }]}>#{suggestion.label}</Text>
                        <Text style={[styles.suggestionCount, { color: on ? t.inkInverse : t.inkFaint }]}>{formatTagCountText(suggestion.count)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
            )}

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
                <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Questions</Text>
                <PollQuestionFields
                  questions={pollQuestions}
                  editable
                  onChange={setPollQuestions}
                />
                <PostDateTimeField
                  label="Closes at"
                  value={closesAt}
                  timezone={timezone}
                  minimumDate={new Date()}
                  onChange={setClosesAt}
                />
                <PostTimezoneField value={timezone} onChange={setTimezone} />
              </>
            )}

            {type === 'event' && (
              <>
                <PostDateTimeField
                  label="Starts at"
                  value={startsAt}
                  timezone={timezone}
                  minimumDate={new Date()}
                  onChange={(value) => {
                    setStartsAt(value);
                    if (endsAt <= value) setEndsAt(new Date(value.getTime() + 60 * 60 * 1000));
                  }}
                />
                <PostDateTimeField
                  label="Ends at"
                  value={endsAt}
                  timezone={timezone}
                  minimumDate={startsAt}
                  onChange={setEndsAt}
                />
                <PostTimezoneField value={timezone} onChange={setTimezone} />
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
  typeRow: {
    gap: 8,
    paddingVertical: 10,
  },
  typeTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 32,
  },
  suggestionText: { fontFamily: sans(500), fontSize: 11.5 },
  suggestionCount: { fontFamily: sans(400), fontSize: 9.5 },
  tagHelp: { marginTop: 6, fontFamily: sans(400), fontSize: 11, lineHeight: 16 },
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
