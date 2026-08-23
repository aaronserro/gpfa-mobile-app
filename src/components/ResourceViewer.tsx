import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { LibraryResource } from '../api/types';
import { ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';

export default function ResourceViewer({
  resource,
  accessToken,
  onClose,
}: {
  resource: LibraryResource;
  accessToken: string | null;
  onClose: () => void;
}) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const source = useMemo(
    () => ({
      uri: resource.href ?? '',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }),
    [accessToken, resource.href]
  );

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title={resource.title} onBack={onClose} backLabel="Back to resources" />
      <View style={[styles.viewer, { backgroundColor: t.surfacePaper }]}>
        {!!resource.href && !error && (
          <WebView
            style={styles.web}
            containerStyle={styles.web}
            source={source}
            originWhitelist={['http://*', 'https://*']}
            startInLoadingState
            setSupportMultipleWindows={false}
            onLoadStart={() => {
              setLoading(true);
              setError(null);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={(event) => {
              setLoading(false);
              setError(event.nativeEvent.description || 'The resource could not be loaded.');
            }}
          />
        )}

        {loading && !error && (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.surfacePaper }]}>
            <ActivityIndicator color={t.brandGreen} />
          </View>
        )}

        {(!resource.href || error) && (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: t.inkStrong }]}>Could not open resource</Text>
            <Text style={[styles.errorBody, { color: t.inkMuted }]}>
              {error ?? 'This resource does not include a link yet.'}
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
              ]}
            >
              <Text style={styles.closeButtonText}>Back to resources</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  viewer: {
    flex: 1,
  },
  web: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontFamily: sans(600),
    fontSize: 16,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  closeButtonText: {
    color: '#fff',
    fontFamily: sans(600),
    fontSize: 13,
  },
});
