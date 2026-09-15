import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  ALL_RESOURCE_TYPES,
  filterLibraryResources,
  relatedResources,
  resourceTypeCounts,
} from '../src/lib/library-resources';
import {
  resourceDownloadFilename,
  resourceDownloadHeaders,
  resourceDownloadMedia,
  resourceCanPreview,
  resourceExtractedTextPreviewUrl,
  resourcePreviewKind,
} from '../src/api/resource-download-policy';
import type { LibraryResource } from '../src/api/types';

const ROOT = join(import.meta.dirname, '..');

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function resource(overrides: Partial<LibraryResource>): LibraryResource {
  return {
    id: 'resource-1',
    title: 'Collateral guide',
    type: 'Explainer',
    summary: 'Operational collateral guidance.',
    authors: 'GPFA',
    updatedAt: 'Aug 20',
    mins: 10,
    tags: ['Collateral'],
    artifact: { kind: 'none' },
    ...overrides,
  };
}

test('library filtering combines type and full-text search', () => {
  const resources = [
    resource({ id: 'a', type: 'Explainer', tags: ['Liquidity'] }),
    resource({ id: 'b', title: 'Legal annex', type: 'Template', tags: ['GMSLA'] }),
    resource({ id: 'c', title: 'Liquidity template', type: 'Template' }),
  ];

  assert.deepEqual(
    filterLibraryResources(resources, 'liquidity', 'Template').map(({ id }) => id),
    ['c']
  );
  assert.equal(filterLibraryResources(resources, '', ALL_RESOURCE_TYPES).length, 3);
  assert.deepEqual([...resourceTypeCounts(resources).entries()], [
    ['Explainer', 1],
    ['Template', 2],
  ]);
});

test('related resources prioritize shared tags then preserve stable newest order', () => {
  const current = resource({ id: 'a', tags: ['Collateral', 'Capital'] });
  const resources = [
    current,
    resource({ id: 'b', tags: ['collateral', 'capital'], mins: 500 }),
    resource({ id: 'c', tags: ['Collateral'], mins: 5 }),
    resource({ id: 'd', tags: ['Other'], mins: 1 }),
    resource({ id: 'e', tags: [], mins: 2 }),
  ];

  assert.deepEqual(relatedResources(resources, current).map(({ id }) => id), ['b', 'c', 'd']);
  assert.deepEqual(
    relatedResources(
      [current, resource({ id: 'x', tags: [], mins: undefined }), resource({ id: 'y', tags: [], mins: 1 })],
      current
    ).map(({ id }) => id),
    ['x', 'y']
  );
});

test('download policy sanitizes filenames and limits bearer headers to asset routes', () => {
  assert.equal(resourceDownloadFilename('../Quarterly Review.pdf', 'resource-1'), 'Quarterly_Review.pdf');
  assert.deepEqual(
    resourceDownloadHeaders(
      'https://api.gpfa.org/api/content-assets/asset-1',
      'secret-token',
      ['https://api.gpfa.org']
    ),
    { Authorization: 'Bearer secret-token' }
  );
  assert.deepEqual(
    resourceDownloadHeaders(
      'https://api.gpfa.org/api/members/private-export',
      'secret-token',
      ['https://api.gpfa.org']
    ),
    {}
  );
  assert.deepEqual(
    resourceDownloadHeaders('https://files.example/report.pdf', 'secret-token', ['https://api.gpfa.org']),
    {}
  );
  assert.deepEqual(resourceDownloadMedia('application/pdf'), {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
});

test('resource preview policy prefers MIME type and safely falls back to extensions', () => {
  assert.equal(
    resourcePreviewKind({
      href: 'https://api.gpfa.org/api/content-assets/a',
      fileName: 'report.pdf',
      contentType: 'application/pdf; charset=binary',
      previewable: false,
    }),
    'pdf'
  );
  assert.equal(
    resourcePreviewKind({
      href: 'https://api.gpfa.org/api/content-assets/b',
      fileName: 'photo.pdf',
      contentType: 'image/jpeg',
      previewable: true,
    }),
    'image'
  );
  assert.equal(
    resourcePreviewKind({
      href: 'https://api.gpfa.org/api/content-assets/c',
      fileName: 'notes.md',
      previewable: false,
    }),
    'text'
  );
  assert.equal(
    resourcePreviewKind({
      href: 'https://api.gpfa.org/api/content-assets/d',
      fileName: 'page.html',
      contentType: 'text/html',
      previewable: true,
    }),
    'html'
  );
  assert.equal(
    resourcePreviewKind({
      href: 'https://api.gpfa.org/api/content-assets/e',
      fileName: 'report.pdf',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      previewable: true,
    }),
    'document'
  );
  assert.equal(
    resourceCanPreview({
      href: 'https://api.gpfa.org/api/content-assets/f',
      fileName: 'report.pdf',
      previewable: false,
    }),
    true
  );
  assert.equal(
    resourceExtractedTextPreviewUrl('https://api.gpfa.org/api/content-assets/f?download=1'),
    'https://api.gpfa.org/api/content-assets/f?download=1&preview=text'
  );
});

test('authenticated native previews render from an Expo-managed local cache file', () => {
  const viewer = source('src/components/ResourceViewer.tsx');

  assert.match(
    viewer,
    /\(previewKind === 'pdf' && !pdfUnavailableInExpoGo\) \|\|\s*\(previewKind === 'image'/
  );
  assert.match(viewer, /File\.downloadFileAsync\(file\.href, destination/);
  assert.match(viewer, /headers: source\.headers/);
  assert.match(viewer, /if \(previewKind === 'pdf'\) setPdfPath\(downloaded\.uri\)/);
  assert.match(viewer, /disabled=\{!pdfPath \|\| printing\}/);
  assert.match(viewer, /const rendererUri = localPreviewUri \?\? source\.uri/);
  assert.match(viewer, /const rendererHeaders = localPreviewUri \? undefined : source\.headers/);
  assert.match(viewer, /if \(directory\.exists\) directory\.delete\(\)/);
});

test('Office documents use the authenticated extracted-text preview endpoint', () => {
  const viewer = source('src/components/ResourceViewer.tsx');

  assert.match(viewer, /resourceIsTrustedContentAsset\(file\.href, trustedOrigins\)/);
  assert.match(viewer, /resourceExtractedTextPreviewUrl\(file\.href\)/);
  assert.match(viewer, /previewKind === 'document' \|\| pdfUnavailableInExpoGo/);
  assert.match(viewer, /ResourceTextRenderer uri=\{extractedTextPreviewUri\} headers=\{source\.headers\}/);
});

test('text document previews fill the viewer and reject binary or empty responses', () => {
  const renderer = source('src/components/resource-viewer/ResourceTextRenderer.tsx');

  assert.match(renderer, /style=\{\[styles\.fill, \{ backgroundColor: t\.surfacePaper \}\]\}/);
  assert.match(renderer, /!contentType\.startsWith\('text\/'\)/);
  assert.match(renderer, /if \(!text\.trim\(\)\)/);
});

test('native PDF previews receive explicit dimensions and fail visibly if rendering stalls', () => {
  const renderer = source('src/components/resource-viewer/ResourcePdfRenderer.tsx');

  assert.match(renderer, /onLayout=\{\(event\) =>/);
  assert.match(renderer, /width: viewport\.width/);
  assert.match(renderer, /height: viewport\.height/);
  assert.match(renderer, /onError\('The PDF preview took too long to render\.'\)/);
  assert.match(renderer, /setLoaded\(true\)/);
});
