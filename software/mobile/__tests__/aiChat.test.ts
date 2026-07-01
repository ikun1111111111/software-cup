import {
  buildDigitalHumanChatPayload,
  buildDigitalHumanChatStreamUrl,
} from '../utils/aiChat';

describe('aiChat', () => {
  test('builds the chat stream URL from the configured API base URL', () => {
    expect(buildDigitalHumanChatStreamUrl('http://192.168.1.23:8000/api/')).toBe(
      'http://192.168.1.23:8000/api/chat/stream',
    );
  });

  test('maps mobile chat context to the backend chat request shape', () => {
    const payload = buildDigitalHumanChatPayload({
      sessionId: 'session-1',
      question: '  灵山大佛多高？  ',
      history: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好，我是小灵。' },
        { role: 'system', content: 'ignore me' },
        { role: 'user', content: '   ' },
      ],
      spotId: 'ling-shan-da-fo',
      spotName: '灵山大佛',
      routeId: 'classic',
      sourcePage: 'chat',
    });

    expect(payload).toEqual({
      session_id: 'session-1',
      question: '灵山大佛多高？',
      stream: true,
      history: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好，我是小灵。' },
      ],
      spot_id: 'ling-shan-da-fo',
      spot_name: '灵山大佛',
      route_id: 'classic',
      source_page: 'chat',
    });
  });
});
