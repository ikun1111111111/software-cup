import {
  getInitialChatBubbleDisplayLength,
  shouldAnimateChatBubbleText,
} from '../utils/chatBubbleDisplay';

describe('chat bubble display timing', () => {
  test('shows complete assistant answers immediately once they are sent', () => {
    expect(getInitialChatBubbleDisplayLength({
      role: 'assistant',
      contentLength: 24,
      status: 'sent',
      isStreaming: false,
    })).toBe(24);

    expect(shouldAnimateChatBubbleText({
      role: 'assistant',
      status: 'sent',
      isStreaming: false,
    })).toBe(false);
  });

  test('animates only an actively streaming assistant message', () => {
    expect(getInitialChatBubbleDisplayLength({
      role: 'assistant',
      contentLength: 24,
      status: 'sending',
      isStreaming: true,
    })).toBe(0);

    expect(shouldAnimateChatBubbleText({
      role: 'assistant',
      status: 'sending',
      isStreaming: true,
    })).toBe(true);
  });
});
