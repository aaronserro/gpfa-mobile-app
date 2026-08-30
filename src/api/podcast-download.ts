import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { API_BASE_URL, GPFA_WEB_ORIGIN } from './config';
import {
  podcastDownloadFilename,
  podcastDownloadHeaders,
  podcastDownloadMime,
  type PodcastDownloadKind,
} from './podcast-download-policy';

export interface PodcastDownloadInput {
  url: string;
  slug: string;
  kind: PodcastDownloadKind;
  accessToken: string | null;
}

/** Download to disposable app cache, then hand the file to the native save/share sheet. */
export async function sharePodcastDownload(input: PodcastDownloadInput): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is unavailable on this device.');
  }

  const directory = new Directory(
    Paths.cache,
    `gpfa-podcast-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  directory.create({ intermediates: true });
  const destination = new File(directory, podcastDownloadFilename(input.slug, input.kind));

  try {
    const headers = podcastDownloadHeaders(
      input.url,
      input.accessToken,
      [API_BASE_URL, GPFA_WEB_ORIGIN].filter(Boolean)
    );
    const file = await File.downloadFileAsync(input.url, destination, {
      headers,
      idempotent: true,
    });
    const media = podcastDownloadMime(input.kind);
    await Sharing.shareAsync(file.uri, {
      dialogTitle: input.kind === 'transcript' ? 'Save transcript' : 'Save episode audio',
      mimeType: media.mimeType,
      UTI: media.UTI,
    });
  } finally {
    // Android can leave a partial file after a failed stream; remove the whole isolated directory.
    if (directory.exists) directory.delete();
  }
}
