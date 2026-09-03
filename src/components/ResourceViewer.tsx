import { useCallback, useEffect, useMemo, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Print from 'expo-print';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LibraryResource } from '../api/types';
import { API_BASE_URL, GPFA_WEB_ORIGIN } from '../api/config';
import { resourceDownloadHeaders, resourcePreviewKind } from '../api/resource-download-policy';
import { DownloadSimple } from '../ds/icons';
import { ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';
import { ResourceImageRenderer } from './resource-viewer/ResourceImageRenderer';
import { ResourcePdfRenderer } from './resource-viewer/ResourcePdfRenderer';
import { ResourceTextRenderer } from './resource-viewer/ResourceTextRenderer';
import { ResourceWebRenderer } from './resource-viewer/ResourceWebRenderer';

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
  const [printing, setPrinting] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
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
  const previewKind = file ? resourcePreviewKind(file) : 'external';
  const pdfUnavailableInExpoGo =
    previewKind === 'pdf' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSaveError(null);
    setPdfPath(null);
  }, [resource.id]);

  const rendererError = useCallback((message: string) => {
    setLoading(false);
    setError(message);
  }, []);

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

  const print = async () => {
    if (!pdfPath) return;
    setPrinting(true);
    setSaveError(null);
    try {
      const uri = pdfPath.startsWith('file://') ? pdfPath : `file://${pdfPath}`;
      await Print.printAsync({ uri });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The PDF could not be printed.');
    } finally {
      setPrinting(false);
    }
  };

  const canRender = !!file && previewKind !== 'external' && !pdfUnavailableInExpoGo;

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title={resource.title} onBack={onClose} backLabel="Back to resources" />
      <View style={[styles.viewer, { backgroundColor: t.surfacePaper }]}>
        {canRender && !error && previewKind === 'pdf' ? (
          <ResourcePdfRenderer
            uri={source.uri}
            headers={source.headers}
            onError={rendererError}
            onLocalFile={setPdfPath}
          />
        ) : null}
        {canRender && !error && previewKind === 'image' ? (
          <ResourceImageRenderer
            uri={source.uri}
            headers={source.headers}
            title={resource.title}
            onError={rendererError}
          />
        ) : null}
        {canRender && !error && previewKind === 'text' ? (
          <ResourceTextRenderer uri={source.uri} headers={source.headers} onError={rendererError} />
        ) : null}
        {canRender && !error && previewKind === 'web' ? (
          <ResourceWebRenderer
            uri={source.uri}
            headers={source.headers}
            onLoading={setLoading}
            onError={rendererError}
          />
        ) : null}

        {previewKind === 'web' && loading && !error && (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.surfacePaper }]}>
            <ActivityIndicator color={t.brandGreen} />
          </View>
        )}

        {(!canRender || error) && (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: t.inkStrong }]}>Preview unavailable</Text>
            <Text style={[styles.errorBody, { color: t.inkMuted }]}>
              {error ?? (pdfUnavailableInExpoGo
                ? 'PDF preview requires a development build. Save the file to open it with another app.'
                : 'This file type cannot be previewed in the app. Save it to open it with another app.')}
            </Text>
          </View>
        )}
      </View>
      {file ? (
        <View style={[styles.actionBar, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save resource to device"
            onPress={() => void save()}
            disabled={saving}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: pressed ? t.surfaceAnchorSoft : t.surfaceAnchor },
              saving && styles.disabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={t.inkInverse} />
            ) : (
              <DownloadSimple size={16} color={t.inkInverse} />
            )}
            <Text style={[styles.actionButtonText, { color: t.inkInverse }]}>
              {saving ? 'Preparing…' : 'Save to device'}
            </Text>
          </Pressable>
          {previewKind === 'pdf' && !pdfUnavailableInExpoGo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Print PDF"
              onPress={() => void print()}
              disabled={!pdfPath || printing}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: t.ruleStrong, backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper },
                (!pdfPath || printing) && styles.disabled,
              ]}
            >
              {printing ? <ActivityIndicator size="small" color={t.brandGreen} /> : null}
              <Text style={[styles.secondaryButtonText, { color: t.inkStrong }]}>
                {printing ? 'Opening…' : 'Print'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {saveError ? (
        <Text style={[styles.saveError, { color: t.brandRed, backgroundColor: t.surfacePaper }]}>
          {saveError}
        </Text>
      ) : null}
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
  actionBar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.45 },
  actionButtonText: {
    fontFamily: sans(600),
    fontSize: 13,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  secondaryButtonText: { fontFamily: sans(600), fontSize: 13 },
  saveError: {
    fontFamily: sans(400),
    fontSize: 12,
    paddingBottom: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
});
