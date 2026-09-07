import type * as ExpoNotifications from 'expo-notifications';

export const MEMBER_UPDATES_CHANNEL = 'member-updates';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IOS_AUTHORIZED = 2;
const IOS_PROVISIONAL = 3;
const IOS_EPHEMERAL = 4;
const RESPONSE_MEMORY_LIMIT = 32;

export interface NotificationPermissionSnapshot {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  ios?: { status: number } | null;
}

export interface NotificationPermissionState {
  allowed: boolean;
  canAskAgain: boolean;
  status: 'allowed' | 'requestable' | 'blocked';
}

export interface NativeNotificationData {
  schemaVersion: 1;
  kind: 'notification';
  notificationId: string;
}

export interface NativeNotificationResponse {
  actionIdentifier: string;
  notification: {
    request: {
      identifier: string;
      content: { data: unknown };
    };
  };
}

interface ExpoConstantsShape {
  expoConfig?: { extra?: { eas?: { projectId?: unknown } } } | null;
  easConfig?: { projectId?: unknown } | null;
}

/** Android 13 does not show its permission prompt until a channel exists. */
export async function ensureMemberUpdatesChannel(): Promise<void> {
  const [{ Platform }, Notifications] = await Promise.all([
    import('react-native'),
    import('expo-notifications'),
  ]);
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(MEMBER_UPDATES_CHANNEL, {
    name: 'Member updates',
    description: 'Updates from GPFA membership and working groups',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

/** Interprets SDK 54's more granular iOS authorization status. */
export function notificationPermissionState(
  permission: NotificationPermissionSnapshot
): NotificationPermissionState {
  const iosStatus = permission.ios?.status;
  const allowed = iosStatus === undefined
    ? permission.granted
    : iosStatus === IOS_AUTHORIZED || iosStatus === IOS_PROVISIONAL || iosStatus === IOS_EPHEMERAL;

  return {
    allowed,
    canAskAgain: permission.canAskAgain,
    status: allowed ? 'allowed' : permission.canAskAgain ? 'requestable' : 'blocked',
  };
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const Notifications = await import('expo-notifications');
  return notificationPermissionState(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const Notifications = await import('expo-notifications');
  return notificationPermissionState(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    })
  );
}

export function expoProjectIdFrom(constants: ExpoConstantsShape): string | null {
  const projectId = constants.expoConfig?.extra?.eas?.projectId ?? constants.easConfig?.projectId;
  return typeof projectId === 'string' && UUID_PATTERN.test(projectId) ? projectId : null;
}

export async function requireExpoProjectId(): Promise<string> {
  const Constants = (await import('expo-constants')).default;
  const projectId = expoProjectIdFrom(Constants);
  if (!projectId) throw new Error('Expo project ID is unavailable.');
  return projectId;
}

export async function getCurrentExpoPushToken(
  devicePushToken?: ExpoNotifications.DevicePushToken
): Promise<string> {
  const Notifications = await import('expo-notifications');
  const projectId = await requireExpoProjectId();
  return (
    await Notifications.getExpoPushTokenAsync({
      projectId,
      ...(devicePushToken ? { devicePushToken } : {}),
    })
  ).data;
}

export async function unregisterCurrentExpoPushToken(): Promise<void> {
  const Notifications = await import('expo-notifications');
  await Notifications.unregisterForNotificationsAsync();
}

/** Push data is an ID-only hint; arbitrary URLs and extra fields are rejected. */
export function parseNativeNotificationData(value: unknown): NativeNotificationData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join('|') !== 'kind|notificationId|schemaVersion') return null;
  if (record.schemaVersion !== 1 || record.kind !== 'notification') return null;
  if (typeof record.notificationId !== 'string' || !UUID_PATTERN.test(record.notificationId)) {
    return null;
  }
  return {
    schemaVersion: 1,
    kind: 'notification',
    notificationId: record.notificationId,
  };
}

export function nativeNotificationResponseKey(response: NativeNotificationResponse): string {
  return [
    response.actionIdentifier,
    response.notification.request.identifier,
    parseNativeNotificationData(response.notification.request.content.data)?.notificationId ?? '',
  ].join(':');
}

/** Deduplicates the same native response delivered through live and cold-start paths. */
export function createNativeNotificationResponseConsumer(
  defaultActionIdentifier: string,
  onNotificationId: (notificationId: string) => void | Promise<void>
): (response: NativeNotificationResponse) => boolean {
  const consumed: string[] = [];

  return (response) => {
    if (response.actionIdentifier !== defaultActionIdentifier) return false;
    const data = parseNativeNotificationData(response.notification.request.content.data);
    if (!data) return false;

    const key = nativeNotificationResponseKey(response);
    if (consumed.includes(key)) return false;
    consumed.push(key);
    if (consumed.length > RESPONSE_MEMORY_LIMIT) consumed.shift();
    void Promise.resolve(onNotificationId(data.notificationId)).catch(() => undefined);
    return true;
  };
}
