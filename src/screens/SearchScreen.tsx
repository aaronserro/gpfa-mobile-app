import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { MemberSearchResult } from '../api/types';
import { Badge, PageHead } from '../ds/primitives';
import { MagnifyingGlass, X } from '../ds/icons';
import { useTheme } from '../ds/ThemeProvider';
import { sans, trackDisplay } from '../ds/tokens';

export type SearchErrorKind = 'network' | 'rate-limit' | 'malformed' | 'other';

interface SearchSection {
  title: string;
  data: MemberSearchResult[];
}

export default function SearchScreen({
  query,
  results,
  loading,
  refreshing,
  error,
  errorKind,
  showingSuggestions,
  onChangeQuery,
  onClear,
  onClose,
  onRetry,
  onRefresh,
  onSelect,
}: {
  query: string;
  results: MemberSearchResult[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  errorKind: SearchErrorKind | null;
  showingSuggestions: boolean;
  onChangeQuery: (query: string) => void;
  onClear: () => void;
  onClose: () => void;
  onRetry: () => void;
  onRefresh: () => void;
  onSelect: (result: MemberSearchResult) => void;
}) {
  const { t } = useTheme();
  const normalizedQuery = query.trim();
  const sections = useMemo(() => groupResults(results), [results]);
  const emptyCopy = searchEmptyCopy({
    error,
    errorKind,
    loading,
    normalizedQuery,
    showingSuggestions,
  });

  return (
    <View style={[styles.screen, { backgroundColor: t.surfacePage }]}>
      <PageHead
        title="Search"
        actions={(
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close search"
            style={({ pressed }) => [
              styles.headerButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <X size={22} color={t.inkStrong} />
          </Pressable>
        )}
      >
        <View
          style={[
            styles.searchBar,
            { backgroundColor: t.surfaceSubtle, borderColor: t.rule },
          ]}
        >
          <MagnifyingGlass size={20} color={t.inkMuted} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            enterKeyHint="search"
            returnKeyType="search"
            accessibilityLabel="Search the member portal"
            placeholder="Search members, groups, resources…"
            placeholderTextColor={t.inkFaint}
            selectionColor={t.brandGreen}
            style={[styles.input, { color: t.inkStrong }]}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={onClear}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
            >
              <X size={18} color={t.inkMuted} />
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.hint, { color: t.inkMuted }]}>
          Enter at least two characters to search across the member portal.
        </Text>
      </PageHead>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 ? styles.listContentEmpty : null,
        ]}
        refreshing={refreshing}
        onRefresh={onRefresh}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: t.inkStrong }]}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.badge}: ${item.title}`}
            accessibilityHint="Opens this search result"
            style={({ pressed }) => [
              styles.result,
              { backgroundColor: t.surfacePaper, borderColor: t.rule },
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.resultHead}>
              <Text style={[styles.resultTitle, { color: t.inkStrong }]}>{item.title}</Text>
              <Badge size={10}>{item.badge}</Badge>
            </View>
            {item.subtitle ? (
              <Text style={[styles.subtitle, { color: t.inkMuted }]}>{item.subtitle}</Text>
            ) : null}
            {item.excerpt ? (
              <Text style={[styles.excerpt, { color: t.inkBody }]}>{item.excerpt}</Text>
            ) : null}
          </Pressable>
        )}
        ListHeaderComponent={(
          <Text style={[styles.listLabel, { color: t.inkMuted }]}>
            {showingSuggestions ? 'Suggested for you' : 'Search results'}
          </Text>
        )}
        ListEmptyComponent={(
          <View style={styles.empty} accessibilityLiveRegion="polite">
            {loading ? <ActivityIndicator color={t.brandGreen} /> : null}
            <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>{emptyCopy.title}</Text>
            <Text style={[styles.emptyBody, { color: t.inkMuted }]}>{emptyCopy.body}</Text>
            {error ? (
              <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry search"
                style={({ pressed }) => [
                  styles.retryButton,
                  { backgroundColor: t.surfaceAnchor },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.retryLabel, { color: t.inkInverse }]}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

function groupResults(results: MemberSearchResult[]): SearchSection[] {
  const grouped = new Map<string, MemberSearchResult[]>();
  for (const result of results) {
    const section = grouped.get(result.section);
    if (section) section.push(result);
    else grouped.set(result.section, [result]);
  }
  return Array.from(grouped, ([title, data]) => ({ title, data }));
}

function searchEmptyCopy({
  error,
  errorKind,
  loading,
  normalizedQuery,
  showingSuggestions,
}: {
  error: Error | null;
  errorKind: SearchErrorKind | null;
  loading: boolean;
  normalizedQuery: string;
  showingSuggestions: boolean;
}): { title: string; body: string } {
  if (loading) return { title: 'Searching', body: 'Finding the most relevant results.' };
  if (errorKind === 'network') {
    return { title: 'You appear to be offline', body: 'Reconnect and try your search again.' };
  }
  if (errorKind === 'rate-limit') {
    return { title: 'Search is temporarily limited', body: 'Wait a moment, then try again.' };
  }
  if (errorKind === 'malformed') {
    return { title: 'Search results are unavailable', body: 'The response could not be read. Please try again.' };
  }
  if (error) return { title: 'Search is unavailable', body: error.message || 'Please try again.' };
  if (normalizedQuery.length === 1) {
    return { title: 'Keep typing', body: 'Enter one more character to begin searching.' };
  }
  if (showingSuggestions) {
    return { title: 'No suggestions yet', body: 'Enter at least two characters to search the portal.' };
  }
  return {
    title: 'No results found',
    body: `No member portal results matched “${normalizedQuery}”. Try another term.`,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerButton: {
    width: 44,
    height: 44,
    marginTop: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    minHeight: 50,
    marginTop: 18,
    paddingLeft: 14,
    paddingRight: 3,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: sans(400), fontSize: 16 },
  clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 8, fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  listContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48, gap: 10 },
  listContentEmpty: { flexGrow: 1 },
  listLabel: { marginBottom: 4, fontFamily: sans(500), fontSize: 13 },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 2,
    fontFamily: sans(600),
    fontSize: 19,
    letterSpacing: trackDisplay(19),
  },
  result: { minHeight: 44, padding: 14, borderWidth: 1, borderRadius: 12, gap: 7 },
  resultHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resultTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: sans(600),
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: trackDisplay(16),
  },
  subtitle: { fontFamily: sans(500), fontSize: 13, lineHeight: 19 },
  excerpt: { fontFamily: sans(400), fontSize: 14, lineHeight: 21 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  emptyTitle: { textAlign: 'center', fontFamily: sans(600), fontSize: 18, lineHeight: 24 },
  emptyBody: { textAlign: 'center', fontFamily: sans(400), fontSize: 14, lineHeight: 21 },
  retryButton: {
    minWidth: 120,
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { fontFamily: sans(600), fontSize: 14 },
  pressed: { opacity: 0.7 },
});
