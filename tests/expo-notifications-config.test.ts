import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = join(import.meta.dirname, '..');

type ExpoConfig = {
  ios?: {
    entitlements?: Record<string, unknown>;
    infoPlist?: Record<string, unknown>;
  };
  plugins?: Array<string | [string, Record<string, unknown>]>;
};

test('expo notifications dependency and plugin options stay pinned to the native contract', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const appConfig = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as {
    expo: ExpoConfig;
  };

  assert.equal(manifest.dependencies?.['expo-notifications'], '~0.32.17');
  assert.equal(manifest.dependencies?.['onesignal-expo-plugin'], undefined);
  assert.equal(manifest.dependencies?.['react-native-onesignal'], undefined);

  const plugin = appConfig.expo.plugins?.find(
    (entry) => Array.isArray(entry) && entry[0] === 'expo-notifications'
  );
  assert.deepEqual(plugin, [
    'expo-notifications',
    {
      icon: './assets/notification-icon.png',
      color: '#33565f',
      defaultChannel: 'member-updates',
      enableBackgroundRemoteNotifications: false,
    },
  ]);

  assert.equal(JSON.stringify(plugin).includes('sounds'), false);
  assert.equal(JSON.stringify(plugin).includes('remote-notification'), false);
  assert.equal(JSON.stringify(appConfig).toLowerCase().includes('onesignal'), false);
});

test('iOS config does not manually add push entitlements or background notification modes', () => {
  const appConfig = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as {
    expo: ExpoConfig;
  };
  const ios = appConfig.expo.ios;

  assert.equal(ios?.entitlements?.['aps-environment'], undefined);
  assert.equal(JSON.stringify(ios).includes('aps-environment'), false);
  assert.deepEqual(ios?.infoPlist?.UIBackgroundModes, ['audio']);
});

test('notification icon is a 96x96 RGBA PNG', () => {
  const png = readFileSync(join(ROOT, 'assets/notification-icon.png'));

  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(png.readUInt32BE(16), 96);
  assert.equal(png.readUInt32BE(20), 96);
  assert.equal(png.readUInt8(24), 8);
  assert.equal(png.readUInt8(25), 6, 'PNG must use RGBA color with an alpha channel');
});