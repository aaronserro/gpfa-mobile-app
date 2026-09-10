import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  createNativeNotificationResponseConsumer,
  expoProjectIdFrom,
  notificationPermissionState,
  parseNativeNotificationData,
  type NativeNotificationResponse,
} from '../src/lib/expo-notifications';
import {
  commitPushRegistration,
  readPushRegistration,
  type PushRegistrationStorage,
} from '../src/lib/push-registration-storage';

const ROOT = join(import.meta.dirname, '..');
const MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const DEVICE_ID = '33333333-3333-4333-8333-333333333333';
const NOTIFICATION_ID = '44444444-4444-4444-8444-444444444444';

function memoryStorage(initial: string | null = null): PushRegistrationStorage & { value: string | null } {
  return {
    value: initial,
    async getItemAsync() { return this.value; },
    async setItemAsync(_key, value) { this.value = value; },
    async deleteItemAsync() { this.value = null; },
  };
}

function response(overrides: Partial<NativeNotificationResponse> = {}): NativeNotificationResponse {
  return {
    actionIdentifier: 'default',
    notification: {
      request: {
        identifier: 'native-request-1',
        content: {
          data: { schemaVersion: 1, kind: 'notification', notificationId: NOTIFICATION_ID },
        },
      },
    },
    ...overrides,
  };
}

test('authorized, provisional, and ephemeral iOS states allow notifications', () => {
  for (const status of [2, 3, 4]) {
    assert.deepEqual(
      notificationPermissionState({ granted: status === 2, canAskAgain: false, status: 'granted', ios: { status } }),
      { allowed: true, canAskAgain: false, status: 'allowed' }
    );
  }
  assert.deepEqual(
    notificationPermissionState({ granted: false, canAskAgain: true, status: 'undetermined' }),
    { allowed: false, canAskAgain: true, status: 'requestable' }
  );
  assert.deepEqual(
    notificationPermissionState({ granted: false, canAskAgain: false, status: 'denied', ios: { status: 1 } }),
    { allowed: false, canAskAgain: false, status: 'blocked' }
  );
});

test('strict payload parser rejects arbitrary URLs, versions, extra fields, and malformed IDs', () => {
  assert.deepEqual(
    parseNativeNotificationData({ schemaVersion: 1, kind: 'notification', notificationId: NOTIFICATION_ID }),
    { schemaVersion: 1, kind: 'notification', notificationId: NOTIFICATION_ID }
  );
  assert.equal(parseNativeNotificationData({ schemaVersion: 2, kind: 'notification', notificationId: NOTIFICATION_ID }), null);
  assert.equal(parseNativeNotificationData({ schemaVersion: 1, kind: 'notification', notificationId: 'not-a-uuid' }), null);
  assert.equal(parseNativeNotificationData({ schemaVersion: 1, kind: 'notification', notificationId: NOTIFICATION_ID, url: 'https://evil.example' }), null);
  assert.equal(parseNativeNotificationData({ url: 'https://evil.example' }), null);
});

test('project ID parsing accepts only a configured UUID', () => {
  assert.equal(expoProjectIdFrom({ expoConfig: { extra: { eas: { projectId: DEVICE_ID } } } }), DEVICE_ID);
  assert.equal(expoProjectIdFrom({ easConfig: { projectId: 'not-a-uuid' } }), null);
});

test('stored registration is returned only to its owning member and never stores a token', async () => {
  const storage = memoryStorage(JSON.stringify({ memberId: MEMBER_ID, optedIn: true, deviceId: DEVICE_ID }));
  assert.deepEqual(await readPushRegistration(MEMBER_ID, storage), {
    memberId: MEMBER_ID,
    optedIn: true,
    deviceId: DEVICE_ID,
  });
  assert.equal(await readPushRegistration(OTHER_MEMBER_ID, storage), null);
  assert.equal(storage.value?.includes('ExpoPushToken'), false);
});

test('enable commits local state only after registration succeeds and rolls back storage failure', async () => {
  const storage = memoryStorage();
  await assert.rejects(
    commitPushRegistration({
      memberId: MEMBER_ID,
      register: async () => { throw new Error('server unavailable'); },
      rollback: async () => undefined,
      storage,
    }),
    /server unavailable/
  );
  assert.equal(storage.value, null);

  let rolledBack: string | null = null;
  const failingStorage: PushRegistrationStorage = {
    async getItemAsync() { return null; },
    async setItemAsync() { throw new Error('secure storage unavailable'); },
    async deleteItemAsync() {},
  };
  await assert.rejects(
    commitPushRegistration({
      memberId: MEMBER_ID,
      register: async () => ({ deviceId: DEVICE_ID }),
      rollback: async (deviceId) => { rolledBack = deviceId; },
      storage: failingStorage,
    }),
    /secure storage unavailable/
  );
  assert.equal(rolledBack, DEVICE_ID);
});

test('live and cold responses are consumed once', async () => {
  const opened: string[] = [];
  const consume = createNativeNotificationResponseConsumer('default', (id) => {
    opened.push(id);
  });
  const notificationResponse = response();
  assert.equal(consume(notificationResponse), true);
  assert.equal(consume(notificationResponse), false);
  assert.deepEqual(opened, [NOTIFICATION_ID]);
  assert.equal(consume(response({ actionIdentifier: 'dismiss' })), false);
});

test('fixture mode remains a no-op before native permission or token APIs', () => {
  const portalSource = readFileSync(join(ROOT, 'src/api/portal.ts'), 'utf8');
  const hookSource = readFileSync(join(ROOT, 'src/hooks/useExpoNotificationsIntegration.ts'), 'utf8');
  assert.match(portalSource, /if \(!USING_REMOTE_API\)[\s\S]*fixture-disabled/);
  assert.match(
    hookSource,
    /if \(!USING_REMOTE_API \|\| !memberId \|\| !enabled\) return;[\s\S]*await ensureMemberUpdatesChannel\(platform\)/
  );
});

test('silent refresh creates the Android channel before checking permission or requesting a token', () => {
  const hookSource = readFileSync(join(ROOT, 'src/hooks/useExpoNotificationsIntegration.ts'), 'utf8');
  assert.match(
    hookSource,
    /await ensureMemberUpdatesChannel\(platform\);[\s\S]*await getNotificationPermissionState\(\);[\s\S]*getCurrentExpoPushToken/
  );
});

test('channel setup does not dynamically enumerate the React Native namespace', () => {
  const notificationsSource = readFileSync(join(ROOT, 'src/lib/expo-notifications.ts'), 'utf8');
  assert.doesNotMatch(notificationsSource, /import\(['"]react-native['"]\)/);
  assert.match(notificationsSource, /if \(platform !== 'android'\) return;/);
});

test('the app requests permission only from the explicit enable flow', () => {
  const appSource = readFileSync(join(ROOT, 'App.tsx'), 'utf8');
  const hookSource = readFileSync(join(ROOT, 'src/hooks/useExpoNotificationsIntegration.ts'), 'utf8');
  assert.doesNotMatch(hookSource, /requestNotificationPermission/);
  assert.match(
    appSource,
    /const completeEnablePushNotifications[\s\S]*await ensureMemberUpdatesChannel\(platform\);[\s\S]*await requestNotificationPermission\(\);[\s\S]*getCurrentExpoPushToken\(\)[\s\S]*registerPushDevice/
  );
});

test('foreground presentation is suppressed while canonical refresh remains wired', () => {
  const appSource = readFileSync(join(ROOT, 'App.tsx'), 'utf8');
  assert.match(appSource, /Notifications\.setNotificationHandler\([\s\S]*shouldShowBanner: false[\s\S]*shouldShowList: false/);
  assert.match(appSource, /onCanonicalNotification: refreshCanonicalNotificationsFromPush/);
  assert.match(appSource, /await notificationsQuery\.refetch\(\)/);
});

test('push taps resolve canonical detail and sign-out unregisters before clearing auth', () => {
  const appSource = readFileSync(join(ROOT, 'App.tsx'), 'utf8');
  assert.match(
    appSource,
    /getNotificationDetail\(notificationId\)[\s\S]*openNotificationRef\.current\(notification\)/
  );
  assert.match(
    appSource,
    /const performSignOut[\s\S]*await removeCurrentPushRegistration\(\);[\s\S]*const result = await signOut\(\)/
  );
});

test('push settings screen stays presentational and exposes blocked recovery', () => {
  const screenSource = readFileSync(join(ROOT, 'src/screens/PushNotificationsScreen.tsx'), 'utf8');
  assert.doesNotMatch(screenSource, /expo-notifications|registerPushDevice|SecureStore/);
  assert.match(screenSource, /state === 'blocked'[\s\S]*Open device settings/);
  assert.match(screenSource, /accessibilityRole="alert"[\s\S]*Try again/);
});
