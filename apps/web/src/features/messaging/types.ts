export type ConversationMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}

export type ConversationInboxItem = {
  conversationId: string
  relationshipId: string
  coachId: string
  clientId: string
  counterpartId: string
  counterpartName: string
  lastMessageBody: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  unread: boolean
  unreadCount: number
  readOnly: boolean
  relationshipStatus: string
}

export type ConversationThread = {
  conversationId: string
  relationshipId: string
  coachId: string
  clientId: string
  readOnly: boolean
  relationshipStatus: string
  messages: ConversationMessage[]
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

export type ConversationInboxRpcItem = {
  conversation_id: string
  relationship_id: string
  coach_id: string
  client_id: string
  counterpart_id: string
  counterpart_name: string
  last_message_body: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
  unread: boolean
  unread_count?: number
  read_only?: boolean
  relationship_status?: string
}

export type ListConversationInboxRpcResult = {
  success: boolean
  error?: string
  items?: ConversationInboxRpcItem[]
}

export type ListConversationMessagesRpcResult = {
  success: boolean
  error?: string
  conversation_id?: string
  relationship_id?: string
  coach_id?: string
  client_id?: string
  read_only?: boolean
  relationship_status?: string
  messages?: MessageRow[]
}

export type SendMessageRpcResult = {
  success: boolean
  error?: string
  message_id?: string
  conversation_id?: string
}

export type MarkConversationReadRpcResult = {
  success: boolean
  error?: string
}
