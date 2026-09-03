import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { oneSignal } from '../lib/onesignal';

function isServerAssignedSubscriptionId(subscriptionId: string | null | undefined): boolean {
  return Boolean(subscriptionId && !subscriptionId.startsWith('local-'));
}

export function useOneSignalIntegration(): void {
  const dialogShown = useRef(false);
  const removeObserver = useRef<(() => void) | null>(null);

  useEffect(() => {
    oneSignal.initialize();

    removeObserver.current = oneSignal.observePushSubscription((subscriptionId) => {
      if (dialogShown.current || !isServerAssignedSubscriptionId(subscriptionId)) return;
      dialogShown.current = true;

      Alert.alert(
        'Your OneSignal SDK integration is complete!',
        'You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.',
        [
          {
            text: 'Got it',
            onPress: () => {
              void oneSignal.requestPushPermission();
            },
          },
        ],
        { cancelable: false }
      );
    });

    return () => {
      removeObserver.current?.();
      removeObserver.current = null;
    };
  }, []);
}