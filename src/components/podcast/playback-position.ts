/** Choose a transcript timestamp over saved progress and keep it within known media bounds. */
export function podcastStartPosition(
  savedPosition: number,
  requestedPosition: number | undefined,
  durationSeconds: number
): number {
  const preferred = Number.isFinite(requestedPosition)
    ? Math.max(0, requestedPosition ?? 0)
    : Math.max(0, savedPosition);
  const bounded = durationSeconds > 0 ? Math.min(preferred, durationSeconds) : preferred;
  return durationSeconds > 0 && bounded >= durationSeconds - 1 ? 0 : bounded;
}
