import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ApiError } from '../api/client';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';

/**
 * Renders the loading and error states around fetched data so screens stay
 * presentational. Against fixtures the promises resolve immediately and this
 * is effectively invisible; against a backend it is what the member sees while
 * a request is in flight or after it fails.
 */
export default function DataGate({
  loading,
  error,
  onRetry,
  style,
  children,
}: {
  loading: boolean;
  error?: Error;
  onRetry?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  const { t } = useTheme();

  if (loading) {
    return (
      <View style={[styles.center, style]}>
        <ActivityIndicator color={t.brandGreen} />
      </View>
    );
  }

  if (error) {
    const offline = error instanceof ApiError && error.isNetworkError;
    return (
      <View style={[styles.center, style]}>
        <Text style={[styles.title, { color: t.inkStrong }]}>
          {offline ? 'Can’t reach the server' : 'Something went wrong'}
        </Text>
        <Text style={[styles.message, { color: t.inkMuted }]}>{error.message}</Text>
        {!!onRetry && (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retry,
              { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
            ]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  title: {
    fontFamily: sans(600),
    fontSize: 15,
    textAlign: 'center',
  },
  message: {
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retry: {
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: sans(600),
    fontSize: 14,
    color: '#fff',
  },
});
