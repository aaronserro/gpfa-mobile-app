import { useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export function ResourceWebRenderer({
  uri,
  headers,
  onLoading,
  onError,
}: {
  uri: string;
  headers?: Record<string, string>;
  onLoading: (loading: boolean) => void;
  onError: (message: string) => void;
}) {
  const sourceOrigin = useMemo(() => {
    try {
      return new URL(uri).origin;
    } catch {
      return '';
    }
  }, [uri]);

  return (
    <WebView
      style={styles.web}
      containerStyle={styles.web}
      source={{ uri, headers }}
      originWhitelist={__DEV__ ? ['http://*', 'https://*'] : ['https://*']}
      startInLoadingState
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === 'about:blank') return true;
        try {
          const target = new URL(request.url);
          if (target.origin === sourceOrigin) return true;
          if (target.protocol === 'https:' || (__DEV__ && target.protocol === 'http:')) {
            void Linking.openURL(target.toString());
          }
        } catch {
          // Reject malformed or non-web navigation targets.
        }
        return false;
      }}
      onLoadStart={() => onLoading(true)}
      onLoadEnd={() => onLoading(false)}
      onError={(event) => {
        onLoading(false);
        onError(event.nativeEvent.description || 'The resource could not be loaded.');
      }}
      onHttpError={(event) => {
        onLoading(false);
        onError(`The preview returned status ${event.nativeEvent.statusCode}.`);
      }}
    />
  );
}

const styles = StyleSheet.create({ web: { flex: 1 } });