import * as SecureStore from 'expo-secure-store';
import { parseStoredSession } from './session-core';

/**
 * Auth token storage, backed by the iOS Keychain / Android Keystore.
 *
 * Deliberately not AsyncStorage: that store is unencrypted and readable on a
 * rooted or jailbroken device, which is the wrong place for credentials.
 */
const ACCESS_TOKEN = 'gpfa.accessToken';
const REFRESH_TOKEN = 'gpfa.refreshToken';
const SESSION = 'gpfa.authSession';

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  /** Supabase access-token expiry as Unix epoch seconds; null for migrated sessions. */
  expiresAt: number | null;
}

/** SecureStore is unavailable on web, so every call is best-effort. */
async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null): Promise<boolean> {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function getStoredSession(): Promise<StoredAuthSession | null> {
  const stored = await read(SESSION);
  if (stored) {
    const session = parseStoredSession(stored);
    if (session) return session;
    await clearTokens();
    return null;
  }

  // Existing installs stored the pair separately and did not retain expiry.
  const [accessToken, refreshToken] = await Promise.all([read(ACCESS_TOKEN), read(REFRESH_TOKEN)]);
  if (!accessToken && !refreshToken) return null;
  if (!accessToken || !refreshToken) {
    await clearTokens();
    return null;
  }

  const migrated = { accessToken, refreshToken, expiresAt: null };
  await saveSession(migrated);
  return migrated;
}

export async function saveSession(session: StoredAuthSession): Promise<void> {
  const saved = await write(SESSION, JSON.stringify(session));
  if (!saved) throw new Error('Secure credential storage is unavailable on this device.');
  await Promise.all([write(ACCESS_TOKEN, null), write(REFRESH_TOKEN, null)]);
}

export async function getAccessToken(): Promise<string | null> {
  return (await getStoredSession())?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await getStoredSession())?.refreshToken ?? null;
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number | null
): Promise<void> {
  await saveSession({ accessToken, refreshToken, expiresAt });
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    write(SESSION, null),
    write(ACCESS_TOKEN, null),
    write(REFRESH_TOKEN, null),
  ]);
}
