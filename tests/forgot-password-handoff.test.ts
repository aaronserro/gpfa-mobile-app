import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { buildForgotPasswordUrl } from '../src/api/config';

function recoveryUrl(
  origin: string,
  email = '',
  allowInsecureHttp = false
): string {
  const result = buildForgotPasswordUrl(origin, email, allowInsecureHttp);
  assert.equal(result.ok, true);
  return result.ok ? result.url : '';
}

test('builds a trusted forgot-password URL with an optional normalized prefill', () => {
  assert.equal(
    recoveryUrl('https://members.example.org'),
    'https://members.example.org/forgot-password'
  );
  assert.equal(
    recoveryUrl('https://members.example.org/', ' Member+Mobile@Example.com '),
    'https://members.example.org/forgot-password?email=member%2Bmobile%40example.com'
  );
});

test('omits empty, malformed, overlong, and control-character email values', () => {
  const origin = 'https://members.example.org';
  assert.equal(recoveryUrl(origin, 'not-an-email'), `${origin}/forgot-password`);
  assert.equal(recoveryUrl(origin, 'member @example.org'), `${origin}/forgot-password`);
  assert.equal(recoveryUrl(origin, `member\n@example.org`), `${origin}/forgot-password`);
  assert.equal(
    recoveryUrl(origin, `${'a'.repeat(309)}@example.org`),
    `${origin}/forgot-password`
  );
});

test('fails closed for missing, malformed, or path-bearing origins', () => {
  assert.deepEqual(buildForgotPasswordUrl(''), { ok: false, reason: 'missing_origin' });
  assert.deepEqual(buildForgotPasswordUrl('not a URL'), { ok: false, reason: 'invalid_origin' });
  assert.deepEqual(buildForgotPasswordUrl('https://user:pass@example.org'), {
    ok: false,
    reason: 'invalid_origin',
  });
  assert.deepEqual(buildForgotPasswordUrl('https://example.org/member'), {
    ok: false,
    reason: 'invalid_origin',
  });
  assert.deepEqual(buildForgotPasswordUrl('https://example.org?source=mobile'), {
    ok: false,
    reason: 'invalid_origin',
  });
  assert.deepEqual(buildForgotPasswordUrl('https://example.org#recovery'), {
    ok: false,
    reason: 'invalid_origin',
  });
});

test('allows HTTP only when the caller explicitly enables development origins', () => {
  assert.deepEqual(buildForgotPasswordUrl('http://192.168.1.25:3000'), {
    ok: false,
    reason: 'insecure_origin',
  });
  assert.equal(
    recoveryUrl('http://192.168.1.25:3000', 'member@example.org', true),
    'http://192.168.1.25:3000/forgot-password?email=member%40example.org'
  );
  assert.deepEqual(buildForgotPasswordUrl('javascript:alert(1)', '', true), {
    ok: false,
    reason: 'invalid_origin',
  });
  assert.deepEqual(buildForgotPasswordUrl('file:///tmp/gpfa', '', true), {
    ok: false,
    reason: 'invalid_origin',
  });
});

test('keeps the sign-in screen presentational and awaits the App-owned browser handoff', () => {
  const screen = readFileSync(resolve('src/screens/SignInScreen.tsx'), 'utf8');
  const app = readFileSync(resolve('App.tsx'), 'utf8');

  assert.match(screen, /onForgotPassword: \(email: string\) => Promise<void>/);
  assert.match(screen, /await onForgotPassword\(email\)/);
  assert.match(screen, /accessibilityLabel="Reset your password"/);
  assert.match(screen, /accessibilityState=\{\{ disabled: busy \|\| openingRecovery, busy: openingRecovery \}\}/);
  assert.doesNotMatch(screen, /Linking\.openURL/);
  assert.match(app, /onForgotPassword=\{openForgotPassword\}/);
  assert.match(app, /await Linking\.openURL\(destination\.url\)/);
});
