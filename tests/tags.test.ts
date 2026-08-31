import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendTagToken,
  filterTagSuggestions,
  formatTagCountText,
  getTagSuggestionQuery,
  normalizeTagToken,
  parseTagInput,
  serializeTagInput,
} from '../src/lib/tags';

test('normalizes tags with the web working-group rules', () => {
  assert.equal(normalizeTagToken(' #Legal & Repo '), 'legal-repo');
  assert.equal(normalizeTagToken('---COLLATERAL---'), 'collateral');
  assert.equal(normalizeTagToken('###'), '');
});

test('parses hashtag input, deduplicates, and preserves first-seen order', () => {
  assert.deepEqual(
    parseTagInput('#Repo ignored #LEGAL #repo #private-credit'),
    ['repo', 'legal', 'private-credit']
  );
  assert.deepEqual(parseTagInput('Repo Legal private credit'), [
    'repo',
    'legal',
    'private',
    'credit',
  ]);
});

test('caps parsed and serialized tags at eight', () => {
  const input = '#one #two #three #four #five #six #seven #eight #nine';
  assert.equal(parseTagInput(input).length, 8);
  assert.equal(
    serializeTagInput(input),
    '#one #two #three #four #five #six #seven #eight'
  );
});

test('appends normalized suggestions without duplicates', () => {
  assert.equal(appendTagToken('#repo', 'Legal & Repo'), '#repo #legal-repo ');
  assert.equal(appendTagToken('#repo ', '#REPO'), '#repo ');
});

test('extracts only an active trailing suggestion query', () => {
  assert.equal(getTagSuggestionQuery('#repo #leg'), 'leg');
  assert.equal(getTagSuggestionQuery('#repo '), '');
  assert.equal(getTagSuggestionQuery(''), '');
});

test('filters local suggestions while preserving usage metadata', () => {
  const entries = [
    { key: 'repo', label: 'repo', count: 3 },
    { key: 'legal', label: 'legal', count: 1 },
    { key: 'legal', label: 'duplicate', count: 9 },
  ];

  assert.deepEqual(filterTagSuggestions(entries, 'leg'), [
    { key: 'legal', label: 'legal', count: 1 },
  ]);
  assert.equal(formatTagCountText(1), '1 use');
  assert.equal(formatTagCountText(3), '3 uses');
});
