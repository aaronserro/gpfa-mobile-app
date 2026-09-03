import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { useTheme } from '../../ds/ThemeProvider';

export function ResourceImageRenderer({
  uri,
  headers,
  title,
  onError,
}: {
  uri: string;
  headers?: Record<string, string>;
  title: string;
  onError: (message: string) => void;
}) {
  const { t } = useTheme();
  const authenticated = !!headers && Object.keys(headers).length > 0;

  return (
    <Image
      accessibilityLabel={title}
      source={{ uri, headers }}
      contentFit="contain"
      cachePolicy={authenticated ? 'memory' : 'memory-disk'}
      transition={160}
      style={[styles.image, { backgroundColor: t.surfacePaper }]}
      onError={(event) => onError(event.error || 'The image could not be loaded.')}
    />
  );
}

const styles = StyleSheet.create({
  image: { flex: 1, width: '100%' },
});