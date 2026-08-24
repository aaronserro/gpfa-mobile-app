import { fetch as expoFetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ForumAttachment } from '../api/types';

export async function openForumAttachment(
  attachment: ForumAttachment,
  accessToken: string | null
): Promise<void> {
  if (!attachment.href) throw new Error('This attachment does not include a download link.');
  if (!accessToken) throw new Error('Sign in again to open this attachment.');

  const response = await expoFetch(attachment.href, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'This attachment is no longer available.' : 'The attachment could not be downloaded.');
  }

  const file = new File(Paths.cache, `${attachment.id}-${safeFilename(attachment.name)}`);
  file.create({ overwrite: true, intermediates: true });
  file.write(await response.bytes());

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Opening downloaded files is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: `Open ${attachment.name}`,
    mimeType: attachment.contentType,
  });
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-160) || 'attachment';
}
