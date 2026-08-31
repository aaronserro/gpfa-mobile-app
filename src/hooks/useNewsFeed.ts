import { useCallback, useEffect, useRef, useState } from 'react';

import { getNewsFeedPage } from '../api/portal';
import type {
  NewsFeedFacets,
  NewsFeedItem,
  NewsSourceFilter,
  RelatedNewsThread,
} from '../api/types';

const EMPTY_FACETS: NewsFeedFacets = {
  topics: [],
  sources: { gpfa: 0, industry: 0 },
  allTopicsCount: 0,
  allSourcesCount: 0,
};

export function useNewsFeed(enabled: boolean) {
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [relatedThreads, setRelatedThreads] = useState<RelatedNewsThread[]>([]);
  const [topic, setTopic] = useState('All');
  const [source, setSource] = useState<NewsSourceFilter>('all');
  const [facets, setFacets] = useState(EMPTY_FACETS);
  const [totalMatching, setTotalMatching] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<NewsFeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const generation = useRef(0);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'more', nextTopic = topic, nextSource = source) => {
    if (!enabled || (mode === 'more' && (!nextCursor || loadingMore))) return;
    const append = mode === 'more';
    const requestGeneration = append ? generation.current : ++generation.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (append) setLoadingMore(true);
    setError(null);

    try {
      const page = await getNewsFeedPage({
        topic: nextTopic,
        source: nextSource,
        limit: 18,
        ...(append && nextCursor ? { cursor: nextCursor } : {}),
        ...(append && snapshotAt ? { snapshotAt } : {}),
      });
      if (generation.current !== requestGeneration) return;
      setItems((current) => {
        if (!append) return page.items;
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !ids.has(item.id))];
      });
      setRelatedThreads((current) => {
        const rows = append ? [...current, ...page.relatedThreads] : page.relatedThreads;
        return [...new Map(rows.map((thread) => [thread.id, thread])).values()];
      });
      setFacets(page.facets);
      setTotalMatching(page.totalMatching);
      setTotalAvailable(page.totalAvailable);
      setNextCursor(page.nextCursor);
      setSnapshotAt(page.snapshotAt);
    } catch (cause) {
      if (generation.current === requestGeneration) {
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    } finally {
      if (generation.current === requestGeneration) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [enabled, loadingMore, nextCursor, snapshotAt, source, topic]);

  useEffect(() => {
    if (enabled) void load('initial');
  // The explicit filter callback owns filter reloads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const applyFilters = useCallback((nextTopic: string, nextSource: NewsSourceFilter) => {
    setTopic(nextTopic);
    setSource(nextSource);
    setSelected(null);
    setNextCursor(null);
    setSnapshotAt(null);
    void load('initial', nextTopic, nextSource);
  }, [load]);

  const open = useCallback(async (item: NewsFeedItem) => {
    setSelected(item);
    if (items.some((candidate) => candidate.id === item.id)) return;
    try {
      const page = await getNewsFeedPage({ topic, source, limit: 1, story: item.id });
      if (page.selectedItem) setSelected(page.selectedItem);
      setRelatedThreads((current) => [
        ...new Map([...current, ...page.relatedThreads].map((thread) => [thread.id, thread])).values(),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }, [items, source, topic]);

  const openById = useCallback(async (id: string) => {
    const loaded = items.find((item) => item.id === id);
    if (loaded) {
      setSelected(loaded);
      return;
    }
    try {
      const page = await getNewsFeedPage({ topic, source, limit: 1, story: id });
      if (!page.selectedItem) throw new Error('This story is no longer available.');
      setSelected(page.selectedItem);
      setRelatedThreads((current) => [
        ...new Map([...current, ...page.relatedThreads].map((thread) => [thread.id, thread])).values(),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }, [items, source, topic]);

  const move = useCallback(async (direction: -1 | 1) => {
    if (!selected) return;
    const index = items.findIndex((item) => item.id === selected.id);
    const target = index + direction;
    if (target >= 0 && target < items.length) {
      setSelected(items[target]);
      return;
    }
    if (direction === 1 && target === items.length && nextCursor) {
      if (loadingMore) return;
      setLoadingMore(true);
      setError(null);
      try {
        const page = await getNewsFeedPage({
          topic,
          source,
          limit: 18,
          cursor: nextCursor,
          ...(snapshotAt ? { snapshotAt } : {}),
        });
        const ids = new Set(items.map((item) => item.id));
        const appended = page.items.filter((item) => !ids.has(item.id));
        setItems([...items, ...appended]);
        setRelatedThreads((current) => [
          ...new Map([...current, ...page.relatedThreads].map((thread) => [thread.id, thread])).values(),
        ]);
        setNextCursor(page.nextCursor);
        setSnapshotAt(page.snapshotAt);
        if (appended[0]) setSelected(appended[0]);
      } catch (cause) {
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      } finally {
        setLoadingMore(false);
      }
    }
  }, [items, loadingMore, nextCursor, selected, snapshotAt, source, topic]);

  return {
    items, relatedThreads, topic, source, facets, totalMatching, totalAvailable,
    nextCursor, selected, loading, refreshing, loadingMore, error,
    applyFilters, open, openById, close: () => setSelected(null),
    refresh: () => void load('refresh'), loadMore: () => void load('more'), move,
  };
}
