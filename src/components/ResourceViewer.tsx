import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { LibraryResource } from '../api/types';
import { API_BASE_URL, GPFA_WEB_ORIGIN } from '../api/config';
import { resourceDownloadHeaders } from '../api/resource-download-policy';
import { DownloadSimple } from '../ds/icons';
import { ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';

export default function ResourceViewer({
  resource,
  accessToken,
  onSave,
  onClose,
}: {
  resource: LibraryResource;
  accessToken: string | null;
  onSave: (resource: LibraryResource) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const file = resource.artifact.kind === 'file' ? resource.artifact : null;

  const source = useMemo(
    () => ({
      uri: file?.href ?? '',
      headers: file
        ? resourceDownloadHeaders(
            file.href,
            accessToken,
            [API_BASE_URL, GPFA_WEB_ORIGIN].filter(Boolean)
          )
        : undefined,
    }),
    [accessToken, file]
  );

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(resource);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The file could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const canPreview = !!file?.previewable;

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title={resource.title} onBack={onClose} backLabel="Back to resources" />
      <View style={[styles.viewer, { backgroundColor: t.surfacePaper }]}>
        {canPreview && !error && (
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
            onHttpError={(event) => {
              setLoading(false);
              setError(`The preview returned status ${event.nativeEvent.statusCode}.`);
            }}
          />
        )}

        {canPreview && loading && !error && (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.surfacePaper }]}>
            <ActivityIndicator color={t.brandGreen} />
          </View>
        )}

        {(!canPreview || error) && (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: t.inkStrong }]}>Preview unavailable</Text>
            <Text style={[styles.errorBody, { color: t.inkMuted }]}>
              {error ?? 'This file type cannot be previewed in the app. Save it to open it with another app.'}
            </Text>
            <Pressable
              onPress={() => void save()}
              disabled={saving || !file}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
                (saving || !file) && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <DownloadSimple size={16} color="#fff" />
              )}
              <Text style={styles.closeButtonText}>{saving ? 'Preparing…' : 'Save to device'}</Text>
            </Pressable>
            {saveError ? <Text style={[styles.errorBody, { color: t.brandRed }]}>{saveError}</Text> : null}
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
    flexDirection: 'row',
    gap: 8,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.45 },
  closeButtonText: {
    color: '#fff',
    fontFamily: sans(600),
    fontSize: 13,
  },
});
