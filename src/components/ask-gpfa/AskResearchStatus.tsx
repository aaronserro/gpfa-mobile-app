import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AskDisplayMessage } from '../../api/types';
import { CaretDown, CheckCircle } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans } from '../../ds/tokens';

const PHASE_LABELS = {
  thinking: 'Checking scope',
  searching: 'Searching member knowledge',
  reviewing: 'Reviewing sources',
  answering: 'Drafting answer',
} as const;

export default function AskResearchStatus({
  stream,
}: {
  stream: NonNullable<AskDisplayMessage['stream']>;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(stream.status === 'generating');
  const [elapsed, setElapsed] = useState(stream.durationSeconds ?? 0);
  const live = stream.status === 'generating' || stream.status === 'saving';

  useEffect(() => {
    if (!live) {
      setElapsed(stream.durationSeconds ?? 0);
      return;
    }
    const tick = () => setElapsed(Math.max(1, Math.round((Date.now() - stream.startedAt) / 1000)));
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [live, stream.durationSeconds, stream.startedAt]);

  useEffect(() => {
    if (stream.status === 'generating') setOpen(true);
    if (stream.status === 'complete') setOpen(false);
  }, [stream.status]);

  const statusLabel =
    stream.status === 'complete'
      ? 'Research completed'
      : stream.status === 'stopped'
        ? 'Research stopped'
        : stream.status === 'failed'
          ? 'Research interrupted'
          : stream.status === 'saving'
            ? 'Saving answer…'
            : PHASE_LABELS[stream.phase];

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => !live && setOpen((value) => !value)}
        disabled={live}
        accessibilityRole={live ? undefined : 'button'}
        accessibilityState={live ? undefined : { expanded: open }}
        accessibilityLiveRegion="polite"
        style={styles.statusRow}
      >
        {live ? (
          <ActivityIndicator size="small" color={t.brandGreen} />
        ) : (
          <CheckCircle size={16} color={stream.status === 'complete' ? t.brandGreen : t.inkMuted} />
        )}
        <Text style={[styles.statusText, { color: t.inkMuted }]}>{statusLabel}</Text>
        {elapsed > 0 && <Text style={[styles.elapsed, { color: t.inkFaint }]}>{elapsed}s</Text>}
        {!live && <CaretDown size={14} color={t.inkFaint} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />}
      </Pressable>

      {(live || open) && stream.trace.length > 0 && (
        <View style={[styles.trace, { borderLeftColor: t.ruleHairline }]}>
          {stream.trace.map((row) => (
            <View key={row.id} style={styles.traceRow}>
              {row.status === 'pending' && live ? (
                <ActivityIndicator size="small" color={t.brandGreen} />
              ) : (
                <CheckCircle size={14} color={t.brandGreen} />
              )}
              <Text style={[styles.traceText, { color: t.inkMuted }]}>{row.summary}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 8 },
  statusRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusText: { flex: 1, fontFamily: sans(500), fontSize: 11.5 },
  elapsed: { fontFamily: mono(500), fontSize: 10 },
  trace: { marginLeft: 7, paddingLeft: 13, borderLeftWidth: 1, gap: 6 },
  traceRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', gap: 7 },
  traceText: { flex: 1, fontFamily: sans(400), fontSize: 11.5, lineHeight: 17 },
});
