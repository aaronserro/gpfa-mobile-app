import assert from 'node:assert/strict';
import test from 'node:test';

import {
  podcastDownloadFilename,
  podcastDownloadHeaders,
  podcastDownloadMime,
} from '../src/api/podcast-download-policy';
import {
  activeTranscriptSegmentIndex,
  centeredTranscriptOffset,
} from '../src/components/podcast/transcript';
import { podcastStartPosition } from '../src/components/podcast/playback-position';
import { memberDirectoryDestination } from '../src/lib/member-directory-route';
import {
  distinctEpisodeShowNotes,
  isSafeShowNotesHref,
  withoutDuplicateEpisodeTitle,
} from '../src/lib/podcast-show-notes';

const segments = [
  { start: 0, text: 'Opening' },
  { start: 42, text: 'Board questions' },
  { start: 96, text: 'Comparison matrix' },
];

test('transcript synchronization selects the latest started segment', () => {
  assert.equal(activeTranscriptSegmentIndex(segments, 0), 0);
  assert.equal(activeTranscriptSegmentIndex(segments, 41.9), 0);
  assert.equal(activeTranscriptSegmentIndex(segments, 42), 1);
  assert.equal(activeTranscriptSegmentIndex(segments, 400), 2);
  assert.equal(activeTranscriptSegmentIndex(segments, Number.NaN), -1);
  assert.equal(activeTranscriptSegmentIndex([], 20), -1);
});

test('transcript timestamps override resume progress during source loading', () => {
  assert.equal(podcastStartPosition(300, 42, 600), 42);
  assert.equal(podcastStartPosition(300, undefined, 600), 300);
  assert.equal(podcastStartPosition(300, -5, 600), 0);
  assert.equal(podcastStartPosition(300, 900, 600), 0);
  assert.equal(podcastStartPosition(300, 42, 0), 42);
});

test('transcript following centers a segment without scrolling above the sheet', () => {
  assert.equal(centeredTranscriptOffset(500, 100, 40, 300), 470);
  assert.equal(centeredTranscriptOffset(20, 10, 40, 300), 0);
  assert.equal(centeredTranscriptOffset(Number.NaN, 10, 40, 300), 0);
});

test('show notes remove a duplicated title and remain distinct from the summary', () => {
  const title = 'Indemnification after Basel';
  assert.equal(
    withoutDuplicateEpisodeTitle(`# ${title}\n\nFull editorial notes.`, title),
    'Full editorial notes.'
  );
  assert.equal(distinctEpisodeShowNotes('Same summary', title, 'Same summary'), null);
  assert.equal(
    distinctEpisodeShowNotes(`## ${title}\n\nA detailed discussion.`, title, 'Short summary.'),
    'A detailed discussion.'
  );
});

test('show-note links allow only explicit web URLs', () => {
  assert.equal(isSafeShowNotesHref('https://www.gpfa.org/resource'), true);
  assert.equal(isSafeShowNotesHref('http://localhost:3000/resource'), true);
  assert.equal(isSafeShowNotesHref('/members/private'), false);
  assert.equal(isSafeShowNotesHref('javascript:alert(1)'), false);
});

test('member profile navigation accepts only strict relative directory routes', () => {
  assert.deepEqual(memberDirectoryDestination('/members/directory/apg/elena-rossi'), {
    organizationSlug: 'apg',
    mentionHandle: 'elena-rossi',
  });
  for (const href of [
    'https://attacker.example/members/directory/apg/elena-rossi',
    '//attacker.example/members/directory/apg/elena-rossi',
    '/members/directory/apg/elena-rossi?admin=1',
    '/members/directory/apg/elena-rossi#private',
    '/members/directory/apg/10000000-0000-4000-8000-000000000001',
    '/members/directory/apg/../admin',
  ]) {
    assert.equal(memberDirectoryDestination(href), null);
  }
});

test('download policy sanitizes filenames and scopes authorization to trusted origins', () => {
  assert.equal(podcastDownloadFilename('../Quarterly: Review', 'audio'), 'quarterly-review.mp3');
  assert.equal(
    podcastDownloadFilename('../Quarterly: Review', 'transcript'),
    'quarterly-review-transcript.txt'
  );
  assert.deepEqual(
    podcastDownloadHeaders(
      'https://api.gpfa.org/api/members/podcasts/episode/transcript?download=1',
      'secret-token',
      ['https://api.gpfa.org']
    ),
    { Authorization: 'Bearer secret-token' }
  );
  assert.deepEqual(
    podcastDownloadHeaders(
      'https://storage.example/audio.mp3?signature=private',
      'secret-token',
      ['https://api.gpfa.org']
    ),
    {}
  );
  assert.deepEqual(podcastDownloadMime('transcript'), {
    mimeType: 'text/plain',
    UTI: 'public.plain-text',
  });
});
