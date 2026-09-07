const PUSH_REGISTRATION_KEY = 'gpfa.pushRegistration';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StoredPushRegistration {
  memberId: string;
  optedIn: true;
  deviceId: string;
}

export interface PushRegistrationStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

async function nativeStorage(): Promise<PushRegistrationStorage> {
  return import('expo-secure-store');
}

export function parseStoredPushRegistration(value: string | null): StoredPushRegistration | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).sort().join('|') !== 'deviceId|memberId|optedIn') return null;
    if (
      record.optedIn !== true ||
      typeof record.memberId !== 'string' ||
      !UUID_PATTERN.test(record.memberId) ||
      typeof record.deviceId !== 'string' ||
      !UUID_PATTERN.test(record.deviceId)
    ) {
      return null;
    }
    return {
      memberId: record.memberId,
      optedIn: true,
      deviceId: record.deviceId,
    };
  } catch {
    return null;
  }
}

export async function readPushRegistration(
  memberId: string,
  storage?: PushRegistrationStorage
): Promise<StoredPushRegistration | null> {
  const provider = storage ?? await nativeStorage();
  const record = parseStoredPushRegistration(await provider.getItemAsync(PUSH_REGISTRATION_KEY));
  return record?.memberId === memberId ? record : null;
}

export async function savePushRegistration(
  record: StoredPushRegistration,
  storage?: PushRegistrationStorage
): Promise<void> {
  if (!parseStoredPushRegistration(JSON.stringify(record))) {
    throw new Error('Invalid push registration state.');
  }
  const provider = storage ?? await nativeStorage();
  await provider.setItemAsync(PUSH_REGISTRATION_KEY, JSON.stringify(record));
}

export async function clearPushRegistration(storage?: PushRegistrationStorage): Promise<void> {
  const provider = storage ?? await nativeStorage();
  await provider.deleteItemAsync(PUSH_REGISTRATION_KEY);
}

/**
 * Persists opt-in only after the server accepts the device. If encrypted local
 * storage fails, the server registration is rolled back so consent fails closed.
 */
export async function commitPushRegistration(input: {
  memberId: string;
  register: () => Promise<{ deviceId: string }>;
  rollback: (deviceId: string) => Promise<void>;
  storage?: PushRegistrationStorage;
}): Promise<StoredPushRegistration> {
  const registered = await input.register();
  const record: StoredPushRegistration = {
    memberId: input.memberId,
    optedIn: true,
    deviceId: registered.deviceId,
  };

  try {
    await savePushRegistration(record, input.storage);
    return record;
  } catch (error) {
    await input.rollback(registered.deviceId).catch(() => undefined);
    throw error;
  }
}
