import type {
  ConversationInboxItem,
  ConversationInboxRpcItem,
  ConversationMessage,
  ConversationThread,
  ListConversationMessagesRpcResult,
  MessageRow,
} from "./types"

export const mapMessageRow = (row: MessageRow): ConversationMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  body: row.body,
  createdAt: row.created_at,
})

export const mapConversationInboxRpcItem = (
  row: ConversationInboxRpcItem
): ConversationInboxItem => ({
  conversationId: row.conversation_id,
  relationshipId: row.relationship_id,
  coachId: row.coach_id,
  clientId: row.client_id,
  counterpartId: row.counterpart_id,
  counterpartName: row.counterpart_name?.trim() || "User",
  lastMessageBody: row.last_message_body,
  lastMessageAt: row.last_message_at,
  lastMessageSenderId: row.last_message_sender_id,
  unread: Boolean(row.unread),
  unreadCount: Math.max(0, Number(row.unread_count) || (row.unread ? 1 : 0)),
  readOnly: Boolean(row.read_only),
  relationshipStatus: row.relationship_status?.trim() || "unknown",
})

export const mapConversationThreadRpc = (
  payload: ListConversationMessagesRpcResult
): ConversationThread | null => {
  if (
    !payload.success ||
    !payload.conversation_id ||
    !payload.relationship_id ||
    !payload.coach_id ||
    !payload.client_id
  ) {
    return null
  }

  return {
    conversationId: payload.conversation_id,
    relationshipId: payload.relationship_id,
    coachId: payload.coach_id,
    clientId: payload.client_id,
    readOnly: Boolean(payload.read_only),
    relationshipStatus: payload.relationship_status?.trim() || "unknown",
    messages: (payload.messages ?? []).map(mapMessageRow),
  }
}
