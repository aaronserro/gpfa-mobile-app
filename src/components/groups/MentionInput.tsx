import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputSelectionChangeEventData,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { GroupMember } from '../../api/types';
import { Avatar, Input, type InputProps } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans } from '../../ds/tokens';

const MAX_SUGGESTIONS = 12;
const MENTION_PATTERN = /(^|[^a-z0-9-])(@[a-z0-9]+(?:-[a-z0-9]+)*)\b/gi;

type Selection = { start: number; end: number };
type ActiveMention = { atIndex: number; cursor: number; query: string };

export type MentionInputProps = Omit<
  InputProps,
  'value' | 'onChangeText' | 'selection' | 'onSelectionChange' | 'style'
> & {
  value: string;
  onChangeText: (value: string) => void;
  members: GroupMember[];
  suggestionsPlacement?: 'above' | 'below';
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

function normalizeMentionHandle(value: string) {
  return value.trim().replace(/^@/, '').toLowerCase();
}

function activeMentionAt(value: string, selection: Selection): ActiveMention | null {
  if (selection.start !== selection.end) return null;

  const cursor = selection.start;
  const atIndex = value.lastIndexOf('@', cursor - 1);
  if (atIndex < 0 || atIndex >= cursor) return null;
  if (atIndex > 0 && !/\s/.test(value[atIndex - 1])) return null;

  const query = value.slice(atIndex + 1, cursor);
  if (/\s/.test(query) || /[@!.,;:"'?/\\\n]/.test(query)) return null;

  return { atIndex, cursor, query: query.toLowerCase() };
}

function setForwardedRef(ref: ForwardedRef<TextInput>, value: TextInput | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export const MentionInput = forwardRef<TextInput, MentionInputProps>(function MentionInput(
  {
    value,
    onChangeText,
    members,
    suggestionsPlacement = 'below',
    containerStyle,
    inputStyle,
    ...inputProps
  },
  forwardedRef
) {
  const { t } = useTheme();
  const inputRef = useRef<TextInput | null>(null);
  const [selection, setSelection] = useState<Selection>({
    start: value.length,
    end: value.length,
  });
  const activeMention = activeMentionAt(value, selection);

  const candidates = useMemo(() => {
    if (!activeMention) return [];

    return members
      .filter((member) => member.id && member.name && member.mentionHandle)
      .filter((member) => {
        const handle = normalizeMentionHandle(member.mentionHandle ?? '');
        return (
          member.name.toLowerCase().includes(activeMention.query) ||
          handle.includes(activeMention.query)
        );
      })
      .sort((a, b) => {
        if (a.isCurrentMember && !b.isCurrentMember) return -1;
        if (!a.isCurrentMember && b.isCurrentMember) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [activeMention, members]);

  const selectMember = (member: GroupMember) => {
    if (!activeMention || !member.mentionHandle) return;

    const handle = normalizeMentionHandle(member.mentionHandle);
    const before = value.slice(0, activeMention.atIndex);
    const after = value.slice(activeMention.cursor);
    const nextValue = `${before}@${handle} ${after}`;
    const cursor = before.length + handle.length + 2;

    onChangeText(nextValue);
    setSelection({ start: cursor, end: cursor });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const suggestions = activeMention ? (
    <View
      style={[
        styles.suggestions,
        {
          backgroundColor: t.surfacePaper,
          borderColor: t.ruleHairline,
        },
      ]}
    >
      {candidates.length === 0 ? (
        <Text style={[styles.emptyText, { color: t.inkMuted }]}>No members found</Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          style={styles.suggestionScroll}
        >
          {candidates.map((member) => (
            <Pressable
              key={member.id ?? member.mentionHandle}
              accessibilityRole="button"
              accessibilityLabel={`Mention ${member.name}`}
              onPress={() => selectMember(member)}
              style={({ pressed }) => [
                styles.suggestion,
                {
                  backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper,
                  borderBottomColor: t.ruleHairline,
                },
              ]}
            >
              <Avatar
                initials={member.initials ?? member.name.slice(0, 2).toUpperCase()}
                photoUrl={member.photo}
                size={28}
              />
              <View style={styles.memberText}>
                <Text numberOfLines={1} style={[styles.memberName, { color: t.inkStrong }]}>
                  {member.name}{member.isCurrentMember ? ' (You)' : ''}
                </Text>
                <Text numberOfLines={1} style={[styles.memberHandle, { color: t.inkMuted }]}>
                  @{normalizeMentionHandle(member.mentionHandle ?? '')}
                  {member.org ? ` · ${member.org}` : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.container, containerStyle]}>
      {suggestionsPlacement === 'above' ? suggestions : null}
      <Input
        {...inputProps}
        ref={(instance) => {
          inputRef.current = instance;
          setForwardedRef(forwardedRef, instance);
        }}
        value={value}
        onChangeText={onChangeText}
        selection={selection}
        onSelectionChange={(
          event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
        ) => setSelection(event.nativeEvent.selection)}
        style={inputStyle}
      />
      {suggestionsPlacement === 'below' ? suggestions : null}
    </View>
  );
});

export function MentionText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const { t } = useTheme();
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of children.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? -1;
    if (start < 0) continue;

    const prefix = match[1] ?? '';
    const mention = match[2] ?? '';
    if (start > cursor) parts.push(children.slice(cursor, start));
    if (prefix) parts.push(prefix);
    parts.push(
      <Text
        key={`${mention}-${start}`}
        style={{ color: t.brandBlue, fontFamily: sans(600) }}
      >
        @{normalizeMentionHandle(mention)}
      </Text>
    );
    cursor = start + prefix.length + mention.length;
  }

  if (cursor < children.length) parts.push(children.slice(cursor));

  return <Text style={style}>{parts.length > 0 ? parts : children}</Text>;
}

const styles = StyleSheet.create({
  container: { minWidth: 0 },
  suggestions: {
    maxHeight: 240,
    marginVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionScroll: { maxHeight: 238 },
  suggestion: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { fontFamily: sans(600), fontSize: 12.5 },
  memberHandle: { marginTop: 2, fontFamily: mono(400), fontSize: 10.5 },
  emptyText: { paddingVertical: 12, paddingHorizontal: 10, fontFamily: sans(400), fontSize: 12 },
});
