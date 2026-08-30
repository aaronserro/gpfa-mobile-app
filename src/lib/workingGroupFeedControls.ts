import type { WorkingGroupFeedControls } from '../api/types';

/** Matches the web working-group feed's initial view. */
export const DEFAULT_WORKING_GROUP_FEED_CONTROLS = {
  query: '',
  type: 'all',
  status: 'open',
  sort: 'newest',
} as const satisfies WorkingGroupFeedControls;

export function hasActiveWorkingGroupFeedControls(
  controls: WorkingGroupFeedControls
): boolean {
  return (
    controls.query !== DEFAULT_WORKING_GROUP_FEED_CONTROLS.query ||
    controls.type !== DEFAULT_WORKING_GROUP_FEED_CONTROLS.type ||
    controls.status !== DEFAULT_WORKING_GROUP_FEED_CONTROLS.status ||
    controls.sort !== DEFAULT_WORKING_GROUP_FEED_CONTROLS.sort
  );
}
