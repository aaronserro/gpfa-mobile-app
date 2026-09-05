import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resourceDownloadHeaders,
  resourceIsTrustedContentAsset,
} from '../src/api/resource-download-policy';
import {
  BLOCKED_RESOURCE_HTML_TAGS,
  MAX_RESOURCE_HTML_BYTES,
  resolveResourceHtmlUrl,
  resourceHtmlImageHeaders,
  resourceHtmlResponseTypeIsSupported,
  shouldIgnoreResourceHtmlNode,
} from '../src/lib/resource-html';

const TRUSTED_ORIGINS = ['https://api.gpfa.org', 'https://members.gpfa.org'];

test('HTML response policy accepts only HTML document content types', () => {
  assert.equal(resourceHtmlResponseTypeIsSupported('text/html; charset=utf-8'), true);
  assert.equal(resourceHtmlResponseTypeIsSupported('application/xhtml+xml'), true);
  assert.equal(resourceHtmlResponseTypeIsSupported(null), true);
  assert.equal(resourceHtmlResponseTypeIsSupported('application/pdf'), false);
  assert.equal(resourceHtmlResponseTypeIsSupported('text/plain'), false);
  assert.equal(MAX_RESOURCE_HTML_BYTES, 1_000_000);
});

test('HTML embedded URLs resolve relative HTTP resources and reject unsafe schemes', () => {
  assert.equal(
    resolveResourceHtmlUrl('../images/chart.png', 'https://api.gpfa.org/api/content-assets/report/index.html'),
    'https://api.gpfa.org/api/content-assets/images/chart.png'
  );
  assert.equal(resolveResourceHtmlUrl('https://cdn.example/chart.png', 'https://api.gpfa.org/a'), 'https://cdn.example/chart.png');
  assert.equal(resolveResourceHtmlUrl('javascript:alert(1)', 'https://api.gpfa.org/a'), null);
  assert.equal(resolveResourceHtmlUrl('data:image/svg+xml;base64,abc', 'https://api.gpfa.org/a'), null);
  assert.equal(resolveResourceHtmlUrl('file:///tmp/private.png', 'https://api.gpfa.org/a'), null);
  assert.equal(resolveResourceHtmlUrl('://bad', 'not-a-url'), null);
});

test('HTML policy removes active browser elements and unsafe images', () => {
  for (const name of BLOCKED_RESOURCE_HTML_TAGS) {
    assert.equal(shouldIgnoreResourceHtmlNode({ type: 'tag', name }, 'https://api.gpfa.org/doc.html'), true);
  }
  assert.equal(
    shouldIgnoreResourceHtmlNode(
      { type: 'tag', name: 'img', attribs: { src: '/api/content-assets/image.png' } },
      'https://api.gpfa.org/doc.html'
    ),
    false
  );
  assert.equal(
    shouldIgnoreResourceHtmlNode(
      { type: 'tag', name: 'img', attribs: { src: 'javascript:alert(1)' } },
      'https://api.gpfa.org/doc.html'
    ),
    true
  );
  assert.equal(
    shouldIgnoreResourceHtmlNode({ type: 'tag', name: 'img', attribs: {} }, 'https://api.gpfa.org/doc.html'),
    true
  );
});

test('embedded image credentials remain scoped to trusted content assets', () => {
  assert.equal(
    resourceIsTrustedContentAsset('https://api.gpfa.org/api/content-assets/image.png', TRUSTED_ORIGINS),
    true
  );
  assert.equal(
    resourceIsTrustedContentAsset('https://api.gpfa.org/public/image.png', TRUSTED_ORIGINS),
    false
  );
  assert.equal(
    resourceIsTrustedContentAsset('https://cdn.example/api/content-assets/image.png', TRUSTED_ORIGINS),
    false
  );
  assert.deepEqual(
    resourceHtmlImageHeaders(
      '/api/content-assets/image.png',
      'https://api.gpfa.org/api/content-assets/report.html',
      'secret-token',
      TRUSTED_ORIGINS
    ),
    { Authorization: 'Bearer secret-token' }
  );
  assert.equal(
    resourceHtmlImageHeaders(
      'https://cdn.example/image.png',
      'https://api.gpfa.org/api/content-assets/report.html',
      'secret-token',
      TRUSTED_ORIGINS
    ),
    undefined
  );
  assert.deepEqual(
    resourceDownloadHeaders(
      'https://api.gpfa.org/api/content-assets/image.png',
      'secret-token',
      TRUSTED_ORIGINS
    ),
    { Authorization: 'Bearer secret-token' }
  );
});