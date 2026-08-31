import assert from 'node:assert/strict';
import test from 'node:test';

import { newsLinkDestination, newsSummaryBullets, stripMarkdownHtml } from '../src/lib/newsReader';

test('summary bullets match the web reader rules', () => {
  assert.deepEqual(newsSummaryBullets('- One\n• Two\nThree\nFour\nFive'), ['One', 'Two', 'Three', 'Four']);
  assert.deepEqual(newsSummaryBullets('One continuous summary.'), ['One continuous summary.']);
});

test('news links accept only HTTP(S) and exact member discussion paths', () => {
  assert.deepEqual(newsLinkDestination('https://example.com/a'), {
    kind: 'external', url: 'https://example.com/a',
  });
  assert.deepEqual(newsLinkDestination('/members/groups/collateral/thread-1'), {
    kind: 'group', slug: 'collateral', id: 'thread-1',
  });
  assert.deepEqual(newsLinkDestination('javascript:alert(1)'), { kind: 'invalid' });
  assert.deepEqual(newsLinkDestination('/members/groups/../admin'), { kind: 'invalid' });
});

test('raw HTML is removed before native Markdown rendering', () => {
  assert.equal(stripMarkdownHtml('Hello <script>alert(1)</script> **world**'), 'Hello alert(1) **world**');
  assert.equal(stripMarkdownHtml('![safe](https://example.com/a.png)'), '![safe](https://example.com/a.png)');
  assert.equal(stripMarkdownHtml('![unsafe](javascript:alert(1))'), 'unsafe');
});

