import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { USING_REMOTE_API } from '../api/config';
import { registerPushDevice, unregisterPushDevice } from '../api/portal';
import {
  createNativeNotificationResponseConsumer,
  ensureMemberUpdatesChannel,
  getCurrentExpoPushToken,
  getNotificationPermissionState,
  parseNativeNotificationData,
  requireExpoProjectId,
  type NativeNotificationResponse,
} from '../lib/expo-notifications';
import {
  commitPushRegistration,
  readPushRegistration,
  type StoredPushRegistration,
} from '../lib/push-registration-storage';

interface ExpoNotificationsIntegrationOptions {
  memberId: string | null;
  enabled: boolean;
  onCanonicalNotification: (notificationId: string) => void | Promise<void>;
  onNotificationResponse: (notificationId: string) => void | Promise<void>;
  onPermissionRevoked: () => void | Promise<void>;
  onRegistrationError?: (error: Error) => void;
  refreshKey?: number;
}

function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Push registration failed.');
}

/**
 * Keeps an already-consented installation current. It never asks permission;
 * the user-triggered enable flow remains owned by the settings screen.
 */
export function useExpoNotificationsIntegration({
  memberId,
  enabled,
  onCanonicalNotification,
  onNotificationResponse,
  onPermissionRevoked,
  onRegistrationError,
  refreshKey = 0,
}: ExpoNotificationsIntegrationOptions): void {
  useEffect(() => {
    if (!USING_REMOTE_API || !memberId || !enabled) return;
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const platform = Platform.OS;

    let active = true;
    let registration: StoredPushRegistration | null = null;

    const reportError = (cause: unknown) => {
      if (active) onRegistrationError?.(asError(cause));
    };

    const refreshRegistration = async (
      devicePushToken?: Notifications.DevicePushToken
    ): Promise<StoredPushRegistration | null> => {
      registration ??= await readPushRegistration(memberId);
      if (!registration || !active) return null;

      await ensureMemberUpdatesChannel(platform);
      const permission = await getNotificationPermissionState();
      if (!permission.allowed) {
        if (active) await onPermissionRevoked();
        return null;
      }

      const [expoPushToken, projectId] = await Promise.all([
        getCurrentExpoPushToken(devicePushToken),
        requireExpoProjectId(),
      ]);
      const currentDeviceId = registration.deviceId;
      registration = await commitPushRegistration({
        memberId,
        register: () => registerPushDevice({
          deviceId: currentDeviceId,
          expoPushToken,
          projectId,
          platform,
        }),
        rollback: unregisterPushDevice,
      });
      return registration;
    };

    const consumeResponse = createNativeNotificationResponseConsumer(
      Notifications.DEFAULT_ACTION_IDENTIFIER,
      onNotificationResponse
    );

    const tokenSubscription = Notifications.addPushTokenListener((devicePushToken) => {
      void refreshRegistration(devicePushToken).catch(reportError);
    });
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = parseNativeNotificationData(notification.request.content.data);
      if (data) void Promise.resolve(onCanonicalNotification(data.notificationId)).catch(reportError);
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (consumeResponse(response as NativeNotificationResponse)) {
        void Notifications.clearLastNotificationResponseAsync().catch(reportError);
      }
    });

    void refreshRegistration().catch(reportError);
    void Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!active || !response) return;
        consumeResponse(response as NativeNotificationResponse);
        await Notifications.clearLastNotificationResponseAsync();
      })
      .catch(reportError);

    return () => {
      active = false;
      tokenSubscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [
    enabled,
    memberId,
    onCanonicalNotification,
    onNotificationResponse,
    onPermissionRevoked,
    onRegistrationError,
    refreshKey,
  ]);
}
