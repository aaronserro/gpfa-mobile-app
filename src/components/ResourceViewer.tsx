import { useCallback, useEffect, useMemo, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LibraryResource } from '../api/types';
import { API_BASE_URL, GPFA_WEB_ORIGIN } from '../api/config';
import {
  resourceDownloadFilename,
  resourceDownloadHeaders,
  resourceExtractedTextPreviewUrl,
  resourceIsTrustedContentAsset,
  resourcePreviewKind,
} from '../api/resource-download-policy';
import { DownloadSimple } from '../ds/icons';
import { PageActions, PageHead } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';
import { ResourceHtmlRenderer } from './resource-viewer/ResourceHtmlRenderer';
import { ResourceImageRenderer } from './resource-viewer/ResourceImageRenderer';
import { ResourcePdfRenderer } from './resource-viewer/ResourcePdfRenderer';
import { ResourceTextRenderer } from './resource-viewer/ResourceTextRenderer';

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
  const [localPreview, setLocalPreview] = useState<{
    resourceId: string;
    uri: string;
  } | null>(null);
  const file = resource.artifact.kind === 'file' ? resource.artifact : null;
  const trustedOrigins = useMemo(
    () => [API_BASE_URL, GPFA_WEB_ORIGIN].filter(Boolean),
    []
  );

  const source = useMemo(
    () => ({
      uri: file?.href ?? '',
      headers: file
        ? resourceDownloadHeaders(
            file.href,
            accessToken,
            trustedOrigins
          )
        : undefined,
    }),
    [accessToken, file, trustedOrigins]
  );
  const previewKind = file ? resourcePreviewKind(file) : 'external';
  const pdfUnavailableInExpoGo =
    previewKind === 'pdf' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const extractedTextPreviewUri = file &&
    (previewKind === 'document' || pdfUnavailableInExpoGo) &&
    resourceIsTrustedContentAsset(file.href, trustedOrigins)
    ? resourceExtractedTextPreviewUrl(file.href)
    : null;
  const nativePreviewNeedsLocalFile =
    (previewKind === 'pdf' && !pdfUnavailableInExpoGo) ||
    (previewKind === 'image' && !!source.headers && Object.keys(source.headers).length > 0);
  const localPreviewUri = localPreview?.resourceId === resource.id ? localPreview.uri : null;

  const rendererError = useCallback((message: string) => {
    setLoading(false);
    setError(message);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSaveError(null);
    setPdfPath(null);
    setLocalPreview(null);
  }, [resource.id]);

  useEffect(() => {
    if (!file || !nativePreviewNeedsLocalFile) return;

    let active = true;
    const directory = new Directory(
      Paths.cache,
      `gpfa-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    const removeDirectory = () => {
      try {
        if (directory.exists) directory.delete();
      } catch {
        // Preview cache cleanup is best-effort; the OS can reclaim cache files.
      }
    };

    directory.create({ intermediates: true });
    const destination = new File(
      directory,
      resourceDownloadFilename(file.fileName, resource.id)
    );

    // Native PDF rendering can silently stall on remote URLs, even for public
    // files. Stage every PDF locally so preview and Print share one verified file.
    void File.downloadFileAsync(file.href, destination, {
      headers: source.headers,
      idempotent: true,
    })
      .then((downloaded) => {
        if (!active) {
          removeDirectory();
          return;
        }
        setLocalPreview({ resourceId: resource.id, uri: downloaded.uri });
        if (previewKind === 'pdf') setPdfPath(downloaded.uri);
        setLoading(false);
      })
      .catch((cause) => {
        if (!active) return;
        rendererError(
          cause instanceof Error ? cause.message : 'The file preview could not be prepared.'
        );
      });

    return () => {
      active = false;
      removeDirectory();
    };
  }, [file, nativePreviewNeedsLocalFile, previewKind, rendererError, resource.id, source.headers]);

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

  const previewSupported = !!file && previewKind !== 'external' &&
    (previewKind !== 'document' || !!extractedTextPreviewUri) &&
    (!pdfUnavailableInExpoGo || !!extractedTextPreviewUri);
  const previewReady = previewSupported && (!nativePreviewNeedsLocalFile || !!localPreviewUri);
  const rendererUri = localPreviewUri ?? source.uri;
  const rendererHeaders = localPreviewUri ? undefined : source.headers;

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      {/* Pinned, unlike every other screen: the body here is a PDF or HTML
          renderer that owns its own scrolling, so there is no offset of ours
          for a sticky bar to follow. */}
      <PageHead title={resource.title} onBack={onClose} backLabel="Back to resources" actions={<PageActions />} />
      <View style={[styles.viewer, { backgroundColor: t.surfacePaper }]}>
        {previewReady && !error && previewKind === 'pdf' && !pdfUnavailableInExpoGo ? (
          <ResourcePdfRenderer
            uri={rendererUri}
            headers={rendererHeaders}
            onError={rendererError}
            onLocalFile={setPdfPath}
          />
        ) : null}
        {previewReady && !error && previewKind === 'image' ? (
          <ResourceImageRenderer
            uri={rendererUri}
            headers={rendererHeaders}
            title={resource.title}
            onError={rendererError}
          />
        ) : null}
        {previewReady && !error && previewKind === 'text' ? (
          <ResourceTextRenderer uri={source.uri} headers={source.headers} onError={rendererError} />
        ) : null}
        {previewReady && !error && extractedTextPreviewUri &&
          (previewKind === 'document' || pdfUnavailableInExpoGo) ? (
          <ResourceTextRenderer uri={extractedTextPreviewUri} headers={source.headers} onError={rendererError} />
        ) : null}
        {previewReady && !error && previewKind === 'html' ? (
          <ResourceHtmlRenderer
            uri={source.uri}
            headers={source.headers}
            accessToken={accessToken}
            trustedOrigins={trustedOrigins}
            onLoading={setLoading}
            onError={rendererError}
          />
        ) : null}

        {previewKind === 'html' && loading && !error && (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.surfacePaper }]}>
            <ActivityIndicator color={t.brandGreen} />
          </View>
        )}

        {previewSupported && !previewReady && !error ? (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.surfacePaper }]}>
            <ActivityIndicator color={t.brandGreen} />
          </View>
        ) : null}

        {(!previewSupported || error) && (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: t.inkStrong }]}>Preview unavailable</Text>
            <Text style={[styles.errorBody, { color: t.inkMuted }]}>
              {error ?? (previewKind === 'document' || pdfUnavailableInExpoGo
                  ? 'A secure text preview is not available for this document. Save it to open it with another app.'
                : 'This file type cannot be previewed in the app. Save it to open it with another app.')}
            </Text>
          </View>
        )}
      </View>
      {file ? (
        <View style={[styles.actionBar, { backgroundColor: t.surfacePaper, borderTopColor: t.rule }]}>
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
    fontSize: 18,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: sans(400),
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
  },
  actionBar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 170,
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.45 },
  actionButtonText: {
    fontFamily: sans(600),
    fontSize: 14.5,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 18,
  },
  secondaryButtonText: { fontFamily: sans(600), fontSize: 14.5 },
  saveError: {
    fontFamily: sans(400),
    fontSize: 13,
    paddingBottom: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
});
