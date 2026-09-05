import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import test from 'node:test';

const ROOT = join(import.meta.dirname, '..');

function runtimeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return runtimeFiles(path);
    return ['.js', '.jsx', '.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

test('runtime source does not embed browser or DOM rendering surfaces', () => {
  const forbidden = [
    /from\s+['"]react-native-webview['"]/,
    /from\s+['"]@expo\/dom-webview['"]/,
    /<WebView\b/,
    /<!doctype\s+html/i,
    /dangerouslySetInnerHTML/,
    /\bdocument\.(?:createElement|getElementById|querySelector)\b/,
    /\bwindow\.ReactNativeWebView\b/,
  ];

  for (const file of runtimeFiles(join(ROOT, 'src'))) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains prohibited embedded-web code`);
    }
  }

  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.equal(manifest.dependencies?.['react-native-webview'], undefined);
  assert.equal(manifest.dependencies?.['@expo/dom-webview'], undefined);
  assert.equal(manifest.dependencies?.cobe, undefined);
  assert.equal(existsSync(join(ROOT, 'src/components/globe/Globe.tsx')), false);
  assert.equal(existsSync(join(ROOT, 'scripts/vendor-cobe.js')), false);
});