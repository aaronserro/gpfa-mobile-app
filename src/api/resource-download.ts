import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { LibraryResource } from './types';
import { API_BASE_URL, GPFA_WEB_ORIGIN } from './config';
import {
  resourceDownloadFilename,
  resourceDownloadHeaders,
  resourceDownloadMedia,
} from './resource-download-policy';

export async function shareResourceDownload(
  resource: LibraryResource,
  accessToken: string | null
): Promise<void> {
  if (resource.artifact.kind !== 'file') {
    throw new Error('This resource does not include a downloadable file.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Saving files is unavailable on this device.');
  }

  const directory = new Directory(
    Paths.cache,
    `gpfa-resource-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  directory.create({ intermediates: true });
  const destination = new File(
    directory,
    resourceDownloadFilename(resource.artifact.fileName, resource.id)
  );

  try {
    const file = await File.downloadFileAsync(resource.artifact.href, destination, {
      headers: resourceDownloadHeaders(
        resource.artifact.href,
        accessToken,
        [API_BASE_URL, GPFA_WEB_ORIGIN].filter(Boolean)
      ),
      idempotent: true,
    });
    const media = resourceDownloadMedia(resource.artifact.contentType);
    await Sharing.shareAsync(file.uri, {
      dialogTitle: `Save ${resource.title}`,
      mimeType: media.mimeType,
      UTI: media.UTI,
    });
  } finally {
    // Android may leave a partial stream behind; the isolated directory is disposable.
    if (directory.exists) directory.delete();
  }
}
