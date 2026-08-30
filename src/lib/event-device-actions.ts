import * as Calendar from 'expo-calendar';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { MobileEventPreview } from '../api/types';
import {
  buildEventIcs,
  eventIcsFilename,
  toNativeCalendarEvent,
} from './event-calendar';

export async function addEventToDeviceCalendar(event: MobileEventPreview): Promise<void> {
  if (!(await Calendar.isAvailableAsync())) {
    throw new Error('A device calendar is not available.');
  }

  // The OS editor lets the member choose a calendar and confirm the save. It
  // does not require broad read/write calendar permission on iOS or Android.
  await Calendar.createEventInCalendarAsync(toNativeCalendarEvent(event));
}

export async function shareEventIcs(event: MobileEventPreview): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }

  const file = new File(Paths.cache, eventIcsFilename(event.title, event.id));
  file.create({ overwrite: true, intermediates: true });
  file.write(buildEventIcs(event));

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Download calendar file',
    mimeType: 'text/calendar',
    UTI: 'com.apple.ical.ics',
  });
}
