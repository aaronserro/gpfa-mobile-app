import * as SecureStore from 'expo-secure-store';

/**
 * Auth token storage, backed by the iOS Keychain / Android Keystore.
 *
 * Deliberately not AsyncStorage: that store is unencrypted and readable on a
 * rooted or jailbroken device, which is the wrong place for credentials.
 */
const ACCESS_TOKEN = 'gpfa.accessToken';
const REFRESH_TOKEN = 'gpfa.refreshToken';

/** SecureStore is unavailable on web, so every call is best-effort. */
async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // A device without a secure enclave still runs; the member re-authenticates.
  }
}

export const getAccessToken = () => read(ACCESS_TOKEN);
export const getRefreshToken = () => read(REFRESH_TOKEN);

export async function saveTokens(access: string, refresh?: string): Promise<void> {
  await write(ACCESS_TOKEN, access);
  if (refresh !== undefined) await write(REFRESH_TOKEN, refresh);
}

export async function clearTokens(): Promise<void> {
  await write(ACCESS_TOKEN, null);
  await write(REFRESH_TOKEN, null);
}
