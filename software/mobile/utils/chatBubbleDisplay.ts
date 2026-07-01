type ChatBubbleRole = 'user' | 'assistant';
type ChatBubbleStatus = 'sending' | 'sent' | 'error' | undefined;

interface ChatBubbleDisplayInput {
  role: ChatBubbleRole;
  status?: ChatBubbleStatus;
  isStreaming: boolean;
}

interface InitialDisplayLengthInput extends ChatBubbleDisplayInput {
  contentLength: number;
}

export function shouldAnimateChatBubbleText({
  role,
  status,
  isStreaming,
}: ChatBubbleDisplayInput): boolean {
  return role === 'assistant' && status === 'sending' && isStreaming;
}

export function getInitialChatBubbleDisplayLength({
  role,
  status,
  isStreaming,
  contentLength,
}: InitialDisplayLengthInput): number {
  if (shouldAnimateChatBubbleText({ role, status, isStreaming })) {
    return 0;
  }
  return contentLength;
}
