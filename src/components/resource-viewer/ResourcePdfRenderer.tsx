import { useEffect, useMemo, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../ds/ThemeProvider';
import { sans } from '../../ds/tokens';

type PdfComponent = typeof import('react-native-pdf')['default'];

let nativePdf: PdfComponent | null | undefined;

function getNativePdf(): PdfComponent | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (nativePdf !== undefined) return nativePdf;

  try {
    nativePdf = require('react-native-pdf').default as PdfComponent;
  } catch {
    nativePdf = null;
  }
  return nativePdf;
}

export function ResourcePdfRenderer({
  uri,
  headers,
  onError,
  onLocalFile,
}: {
  uri: string;
  headers?: Record<string, string>;
  onError: (message: string) => void;
  onLocalFile: (path: string) => void;
}) {
  const { t } = useTheme();
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const Pdf = useMemo(getNativePdf, []);

  useEffect(() => {
    if (!Pdf) {
      onError('PDF preview requires a development build. Save the file to open it with another app.');
    }
  }, [Pdf, onError]);

  const openLink = (value: string) => {
    try {
      const target = new URL(value, uri);
      if (target.protocol === 'https:' || (__DEV__ && target.protocol === 'http:')) {
        void Linking.openURL(target.toString());
      }
    } catch {
      // Invalid document links are deliberately ignored.
    }
  };

  if (!Pdf) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: t.surfacePaper }]}>
        <ActivityIndicator color={t.brandGreen} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePaper }]}>
      <Pdf
        key={uri}
        source={{ uri, headers, cache: false }}
        style={[styles.fill, { backgroundColor: t.surfacePaper }]}
        progressContainerStyle={{ backgroundColor: t.surfacePaper }}
        trustAllCerts={false}
        enableDoubleTapZoom
        enableAnnotationRendering
        fitPolicy={0}
        spacing={12}
        renderActivityIndicator={() => <ActivityIndicator color={t.brandGreen} />}
        onLoadComplete={(pages, path) => {
          setPageCount(pages);
          if (path) onLocalFile(path);
        }}
        onPageChanged={(nextPage, pages) => {
          setPage(nextPage);
          setPageCount(pages);
        }}
        onPressLink={openLink}
        onError={(cause) =>
          onError(cause instanceof Error ? cause.message : 'The PDF could not be loaded.')
        }
      />
      {pageCount > 0 ? (
        <View style={[styles.pageBadge, { backgroundColor: t.surfaceAnchor }]}>
          <Text style={[styles.pageText, { color: t.inkInverse }]}>
            {page} / {pageCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  pageBadge: {
    alignSelf: 'center',
    borderRadius: 999,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
  },
  pageText: {
    fontFamily: sans(600),
    fontSize: 12,
  },
});