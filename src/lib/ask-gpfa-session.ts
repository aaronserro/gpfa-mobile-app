import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAskConversationId } from './ask-gpfa-core';

const STORAGE_PREFIX = 'gpfa.ask.active-conversation.v1';

export function askConversationStorageKey(memberId: string): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(memberId)}`;
}

export async function loadActiveAskConversation(memberId: string): Promise<string | null> {
  if (!memberId) return null;
  const value = await AsyncStorage.getItem(askConversationStorageKey(memberId));
  if (!isAskConversationId(value)) {
    if (value !== null) await AsyncStorage.removeItem(askConversationStorageKey(memberId));
    return null;
  }
  return value;
}

export async function saveActiveAskConversation(
  memberId: string,
  conversationId: string | null
): Promise<void> {
  if (!memberId) return;
  const key = askConversationStorageKey(memberId);
  if (conversationId === null) {
    await AsyncStorage.removeItem(key);
    return;
  }
  if (!isAskConversationId(conversationId)) throw new Error('Invalid Ask GPFA conversation id.');
  await AsyncStorage.setItem(key, conversationId);
}
