import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AskConversationSummary } from '../../api/types';
import { CaretRight, Plus, X } from '../../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MastheadMeta } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { sans } from '../../ds/tokens';

function conversationDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value)
  );
}

export default function AskConversationHistory({
  conversations,
  activeConversationId,
  loading,
  error,
  onBack,
  onNewConversation,
  onOpenConversation,
  onRetry,
}: {
  conversations: AskConversationSummary[];
  activeConversationId: string | null;
  loading: boolean;
  error: Error | null;
  onBack: () => void;
  onNewConversation: () => void;
  onOpenConversation: (conversationId: string) => void;
  onRetry: () => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      {/* This renders inside `SidePanel`, so it gets a panel header — a title,
          a new-conversation action and a close — rather than a screen's back
          control. */}
      <View
        style={[
          styles.panelHead,
          { borderBottomColor: t.rule, paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Conversation history</Text>
        <Pressable
          onPress={onNewConversation}
          accessibilityRole="button"
          accessibilityLabel="Start a new Ask GPFA conversation"
          hitSlop={8}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
        >
          <Plus size={20} color={t.inkMuted} />
        </Pressable>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Close conversation history"
          hitSlop={8}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
        >
          <X size={19} color={t.inkMuted} />
        </Pressable>
      </View>

      {loading && conversations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.brandGreen} />
          <Text style={[styles.supporting, { color: t.inkMuted }]}>Loading conversations…</Text>
        </View>
      ) : error && conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>History could not be loaded.</Text>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.retry,
              { borderColor: t.ruleStrong, backgroundColor: t.surfacePaper },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.retryText, { color: t.inkStrong }]}>Try again</Text>
          </Pressable>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No saved conversations yet.</Text>
          <Text style={[styles.supporting, { color: t.inkMuted }]}>Your first question will start one.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {error && (
            <Pressable onPress={onRetry} accessibilityRole="button" style={styles.inlineError}>
              <Text style={[styles.supporting, { color: t.inkMuted }]}>History may be out of date. Tap to retry.</Text>
            </Pressable>
          )}
          {conversations.map((conversation) => (
            <Pressable
              key={conversation.id}
              onPress={() => onOpenConversation(conversation.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: conversation.id === activeConversationId }}
              accessibilityLabel={`${conversation.title}, updated ${conversationDate(conversation.updatedAt)}`}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: conversation.id === activeConversationId ? t.ruleStrong : t.rule,
                  backgroundColor: t.surfacePaper,
                },
                pressed && { borderColor: t.ruleStrong },
              ]}
            >
              <View style={styles.rowText}>
                <Text numberOfLines={2} style={[styles.title, { color: t.inkStrong }]}>
                  {conversation.title}
                </Text>
                <MastheadMeta size={11}>{conversationDate(conversation.updatedAt)}</MastheadMeta>
              </View>
              <CaretRight size={17} color={t.inkFaint} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  panelTitle: { flex: 1, fontFamily: sans(600), fontSize: 19 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  emptyTitle: { fontFamily: sans(600), fontSize: 19, textAlign: 'center' },
  supporting: { fontFamily: sans(400), fontSize: 15, textAlign: 'center' },
  retry: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { fontFamily: sans(600), fontSize: 14.5 },
  list: { paddingHorizontal: 20, paddingVertical: 20, gap: 10 },
  inlineError: { paddingVertical: 8 },
  row: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1, gap: 5 },
  title: { fontFamily: sans(600), fontSize: 15, lineHeight: 20.5 },
});
