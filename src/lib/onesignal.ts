import Constants, { ExecutionEnvironment } from 'expo-constants';

type OneSignalModule = typeof import('react-native-onesignal');

const APP_ID = 'd03e3f1e-173c-48a3-aaa0-6228a23acce8';

let initialized = false;
let nativeModule: OneSignalModule | null | undefined;

function getNativeModule(): OneSignalModule | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (nativeModule !== undefined) return nativeModule;

  try {
    nativeModule = require('react-native-onesignal') as OneSignalModule;
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

export const oneSignal = {
  initialize(): void {
    if (initialized) return;
    const sdk = getNativeModule();
    if (!sdk) return;
    initialized = true;

    sdk.OneSignal.Debug.setLogLevel(__DEV__ ? sdk.LogLevel.Warn : sdk.LogLevel.None);
    sdk.OneSignal.initialize(APP_ID);
  },

  observePushSubscription(listener: (subscriptionId: string | null | undefined) => void): () => void {
    const sdk = getNativeModule();
    if (!sdk) return () => undefined;

    const handleChange = (event: { current: { id?: string } }) => {
      listener(event.current.id);
    };

    sdk.OneSignal.User.pushSubscription.addEventListener('change', handleChange);

    // Registration may finish before the observer attaches, so check both paths.
    void sdk.OneSignal.User.pushSubscription.getIdAsync().then(listener).catch(() => undefined);

    return () => {
      sdk.OneSignal.User.pushSubscription.removeEventListener('change', handleChange);
    };
  },

  requestPushPermission(): Promise<boolean> {
    return getNativeModule()?.OneSignal.Notifications.requestPermission(true) ?? Promise.resolve(false);
  },

  login(externalId: string): void {
    getNativeModule()?.OneSignal.login(externalId);
  },

  logout(): void {
    getNativeModule()?.OneSignal.logout();
  },

  addEmail(email: string): void {
    getNativeModule()?.OneSignal.User.addEmail(email);
  },

  removeEmail(email: string): void {
    getNativeModule()?.OneSignal.User.removeEmail(email);
  },

  addSms(phoneNumber: string): void {
    getNativeModule()?.OneSignal.User.addSms(phoneNumber);
  },

  removeSms(phoneNumber: string): void {
    getNativeModule()?.OneSignal.User.removeSms(phoneNumber);
  },

  addTags(tags: Record<string, string>): void {
    getNativeModule()?.OneSignal.User.addTags(tags);
  },

  removeTags(keys: string[]): void {
    getNativeModule()?.OneSignal.User.removeTags(keys);
  },
};