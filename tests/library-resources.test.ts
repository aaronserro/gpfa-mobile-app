import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_RESOURCE_TYPES,
  filterLibraryResources,
  formatBytes,
  relatedResources,
  resourceFileFacts,
  resourceTypeCounts,
} from '../src/lib/library-resources';
import {
  resourceDownloadFilename,
  resourceDownloadHeaders,
  resourceDownloadMedia,
} from '../src/api/resource-download-policy';
import type { LibraryResource } from '../src/api/types';

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

test('file facts use authoritative filename and byte size', () => {
  const file = resource({
    artifact: {
      kind: 'file',
      href: 'https://api.gpfa.org/api/content-assets/a',
      fileName: 'report.final.pdf',
      contentType: 'application/pdf',
      byteSize: 151263,
      previewable: true,
    },
  });

  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(151263), '148 KB');
  assert.equal(formatBytes(1_572_864), '1.5 MB');
  assert.equal(formatBytes(undefined), null);
  assert.equal(resourceFileFacts(file), 'PDF · 148 KB');
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
