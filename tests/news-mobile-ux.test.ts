import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { newsCardImageUrl } from '../src/lib/news-images';

const ROOT = join(import.meta.dirname, '..');

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

test('News Radar cards use the same image resolver as the web app', () => {
  const screen = source('src/screens/NewsFeedScreen.tsx');

  assert.match(screen, /newsCardImageUrl\(item\.imageUrl, item\.topic, AUTH_BASE_URL\)/);
  assert.match(screen, /imageUrl \? <Image source=\{imageUrl\}/);
  assert.match(screen, /cachePolicy="memory-disk"/);
});

test('News Radar image resolution prefers publisher art and matches web topic fallbacks', () => {
  const origin = 'https://www.gpfa.ai';

  assert.equal(
    newsCardImageUrl('https://publisher.example/story.jpg', 'Derivatives', origin),
    'https://publisher.example/story.jpg'
  );
  assert.equal(
    newsCardImageUrl(undefined, 'Regulation & Policy', origin),
    'https://www.gpfa.ai/assets/regulation-policy.png'
  );
  assert.equal(
    newsCardImageUrl(undefined, 'Collateral', origin),
    'https://www.gpfa.ai/assets/securities-finance.png'
  );
  assert.equal(
    newsCardImageUrl(undefined, 'Unmapped topic', origin),
    'https://www.gpfa.ai/assets/generic-fallback.png'
  );
});

test('selecting Home closes a stale story reader', () => {
  const app = source('App.tsx');

  assert.match(app, /if \(next === 'home'\) \{\s*setNewsOpen\(false\);\s*newsFeed\.close\(\);\s*\}/);
});

test('Resources uses the canonical News Radar total', () => {
  const app = source('App.tsx');
  const resources = source('src/screens/ResourcesScreen.tsx');

  assert.match(app, /newsCount=\{newsFeed\.totalAvailable\}/);
  assert.match(resources, /meta=\{`\$\{newsCount\} STOR/);
  assert.doesNotMatch(resources, /news\.length/);
});

test('the Menu calls the combined destination Resources', () => {
  const menu = source('src/screens/MoreScreen.tsx');

  assert.match(menu, /label="Resources"/);
  assert.doesNotMatch(menu, /label="Library & podcasts"/);
});
