import type { PodcastTranscriptSegment } from '../../api/types';

/** Last segment whose start is not later than the current player position. */
export function activeTranscriptSegmentIndex(
  segments: PodcastTranscriptSegment[],
  currentTime: number
): number {
  if (!Number.isFinite(currentTime) || currentTime < 0 || segments.length === 0) return -1;
  let low = 0;
  let high = segments.length - 1;
  let result = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (segments[middle].start <= currentTime) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

export function centeredTranscriptOffset(
  transcriptTop: number,
  segmentTop: number,
  segmentHeight: number,
  viewportHeight: number
): number {
  if (![transcriptTop, segmentTop, segmentHeight, viewportHeight].every(Number.isFinite)) return 0;
  return Math.max(0, transcriptTop + segmentTop - (viewportHeight - segmentHeight) / 2);
}
