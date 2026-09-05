import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import RenderHTML, {
  type CustomBlockRenderer,
  type CustomMixedRenderer,
} from 'react-native-render-html';

import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans } from '../../ds/tokens';
import {
  BLOCKED_RESOURCE_HTML_TAGS,
  MAX_RESOURCE_HTML_BYTES,
  resolveResourceHtmlUrl,
  resourceHtmlImageHeaders,
  resourceHtmlResponseTypeIsSupported,
  shouldIgnoreResourceHtmlNode,
} from '../../lib/resource-html';

const RESOURCE_HTML_TIMEOUT_MS = 15_000;
const DOCUMENT_PADDING = 20;
const SYSTEM_FONTS = [
  sans(400),
  sans(500),
  sans(600),
  sans(700),
  mono(400),
  mono(500),
  mono(600),
];

const HtmlResourceContext = createContext({
  accessToken: null as string | null,
  baseUrl: '',
  contentWidth: 0,
  trustedOrigins: [] as string[],
});

function boundedAspectRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 16 / 9;
  return Math.min(4, Math.max(0.25, value));
}

const InertAnchorRenderer: CustomMixedRenderer = ({
  TDefaultRenderer,
  InternalRenderer: _InternalRenderer,
  onPress: _onPress,
  ...props
}) => <TDefaultRenderer {...props} onPress={undefined} />;

const NativeHtmlImageRenderer: CustomBlockRenderer = ({ tnode }) => {
  const { t } = useTheme();
  const { accessToken, baseUrl, contentWidth, trustedOrigins } = useContext(HtmlResourceContext);
  const sourceUrl = resolveResourceHtmlUrl(tnode.attributes.src ?? '', baseUrl);
  const declaredWidth = Number(tnode.attributes.width);
  const declaredHeight = Number(tnode.attributes.height);
  const [aspectRatio, setAspectRatio] = useState(() =>
    boundedAspectRatio(declaredWidth / declaredHeight)
  );
  const [failed, setFailed] = useState(false);
  const headers = useMemo(
    () => sourceUrl
      ? resourceHtmlImageHeaders(sourceUrl, baseUrl, accessToken, trustedOrigins)
      : undefined,
    [accessToken, baseUrl, sourceUrl, trustedOrigins]
  );
  const authenticated = !!headers?.Authorization;
  const alt = tnode.attributes.alt?.trim() || 'Image';

  if (!sourceUrl || contentWidth <= 0) return null;

  if (failed) {
    return (
      <View
        accessibilityLabel={`${alt} unavailable`}
        style={[styles.imageFallback, { backgroundColor: t.surfaceSoft, borderColor: t.ruleHairline }]}
      >
        <Text style={[styles.imageFallbackText, { color: t.inkMuted }]}>{alt}</Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={alt}
      source={{ uri: sourceUrl, headers }}
      contentFit="contain"
      cachePolicy={authenticated ? 'memory' : 'memory-disk'}
      transition={160}
      style={{
        width: contentWidth,
        aspectRatio,
        backgroundColor: t.surfaceSoft,
        marginBottom: 14,
        marginTop: 4,
      }}
      onLoad={(event) => {
        const { width, height } = event.source;
        if (width > 0 && height > 0) setAspectRatio(boundedAspectRatio(width / height));
      }}
      onError={() => setFailed(true)}
    />
  );
};

const HTML_RENDERERS = {
  a: InertAnchorRenderer,
  img: NativeHtmlImageRenderer,
};

export function ResourceHtmlRenderer({
  uri,
  headers,
  accessToken,
  trustedOrigins,
  onLoading,
  onError,
}: {
  uri: string;
  headers?: Record<string, string>;
  accessToken: string | null;
  trustedOrigins: string[];
  onLoading: (loading: boolean) => void;
  onError: (message: string) => void;
}) {
  const { t } = useTheme();
  const [content, setContent] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const contentWidth = Math.max(0, containerWidth - DOCUMENT_PADDING * 2);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    setContent(null);
    onLoading(true);

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, RESOURCE_HTML_TIMEOUT_MS);

    void (async () => {
      try {
        const response = await fetch(uri, { headers, signal: controller.signal });
        if (!response.ok) throw new Error(`The preview returned status ${response.status}.`);
        if (!resourceHtmlResponseTypeIsSupported(response.headers.get('content-type'))) {
          throw new Error('The resource did not return a supported HTML document.');
        }
        const declaredSize = Number(response.headers.get('content-length'));
        if (Number.isFinite(declaredSize) && declaredSize > MAX_RESOURCE_HTML_BYTES) {
          throw new Error('This HTML document is too large to preview safely.');
        }
        const html = await response.text();
        if (html.length > MAX_RESOURCE_HTML_BYTES) {
          throw new Error('This HTML document is too large to preview safely.');
        }
        if (!html.trim()) throw new Error('This HTML document is empty.');
        if (active) setContent(html);
      } catch (cause) {
        if (!active) return;
        if (timedOut) {
          onError('The HTML preview took too long to load.');
        } else if (!controller.signal.aborted) {
          onError(cause instanceof Error ? cause.message : 'The HTML document could not be loaded.');
        }
      } finally {
        clearTimeout(timeout);
        if (active) onLoading(false);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [headers, onError, onLoading, uri]);

  const tagsStyles = useMemo(
    () => ({
      body: {
        color: t.inkBody,
        fontFamily: sans(400),
        fontSize: 15,
        lineHeight: 23,
      },
      h1: { color: t.inkStrong, fontFamily: sans(700), fontSize: 25, lineHeight: 31, marginBottom: 14 },
      h2: { color: t.inkStrong, fontFamily: sans(700), fontSize: 21, lineHeight: 27, marginBottom: 12, marginTop: 18 },
      h3: { color: t.inkStrong, fontFamily: sans(600), fontSize: 18, lineHeight: 24, marginBottom: 10, marginTop: 16 },
      h4: { color: t.inkStrong, fontFamily: sans(600), fontSize: 16, lineHeight: 22, marginBottom: 8, marginTop: 14 },
      h5: { color: t.inkStrong, fontFamily: sans(600), fontSize: 14, lineHeight: 20, marginBottom: 8, marginTop: 12 },
      h6: { color: t.inkMuted, fontFamily: sans(600), fontSize: 13, lineHeight: 19, marginBottom: 8, marginTop: 12 },
      p: { marginBottom: 12, marginTop: 0 },
      a: { color: t.brandBlue, textDecorationLine: 'underline' as const },
      strong: { color: t.inkStrong, fontFamily: sans(600) },
      b: { color: t.inkStrong, fontFamily: sans(600) },
      em: { fontStyle: 'italic' as const },
      i: { fontStyle: 'italic' as const },
      blockquote: {
        backgroundColor: t.surfaceSoft,
        borderLeftColor: t.brandGreen,
        borderLeftWidth: 3,
        color: t.inkBody,
        marginBottom: 14,
        marginLeft: 0,
        paddingHorizontal: 14,
        paddingVertical: 10,
      },
      code: { backgroundColor: t.surfaceSoft, color: t.inkStrong, fontFamily: mono(400), fontSize: 12.5 },
      pre: {
        backgroundColor: t.surfaceSoft,
        color: t.inkStrong,
        fontFamily: mono(400),
        fontSize: 12.5,
        lineHeight: 19,
        marginBottom: 14,
        padding: 12,
      },
      ul: { marginBottom: 12, marginTop: 0 },
      ol: { marginBottom: 12, marginTop: 0 },
      li: { marginBottom: 5 },
      table: { borderColor: t.ruleHairline, borderWidth: 1, marginBottom: 14 },
      th: { backgroundColor: t.surfaceSoft, color: t.inkStrong, fontFamily: sans(600), padding: 8 },
      td: { borderColor: t.ruleHairline, borderWidth: 1, padding: 8 },
      hr: { backgroundColor: t.ruleHairline, height: StyleSheet.hairlineWidth, marginBottom: 16, marginTop: 16 },
    }),
    [t]
  );

  const ignoreDomNode = useCallback(
    (node: { type?: string; name?: string; attribs?: Record<string, string> }) =>
      shouldIgnoreResourceHtmlNode(node, uri),
    [uri]
  );

  const embeddedContext = useMemo(
    () => ({ accessToken, baseUrl: uri, contentWidth, trustedOrigins }),
    [accessToken, contentWidth, trustedOrigins, uri]
  );

  return (
    <View
      style={[styles.fill, { backgroundColor: t.surfacePaper }]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {content && contentWidth > 0 ? (
        <HtmlResourceContext.Provider value={embeddedContext}>
          <ScrollView
            style={{ backgroundColor: t.surfacePaper }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <RenderHTML
              source={{ html: content, baseUrl: uri }}
              contentWidth={contentWidth}
              systemFonts={SYSTEM_FONTS}
              renderers={HTML_RENDERERS}
              ignoredDomTags={[...BLOCKED_RESOURCE_HTML_TAGS]}
              ignoreDomNode={ignoreDomNode}
              enableCSSInlineProcessing={false}
              defaultTextProps={{ selectable: true }}
              tagsStyles={tagsStyles}
            />
          </ScrollView>
        </HtmlResourceContext.Provider>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: DOCUMENT_PADDING },
  imageFallback: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 96,
    padding: 16,
    width: '100%',
  },
  imageFallbackText: { fontFamily: sans(400), fontSize: 12, textAlign: 'center' },
});
