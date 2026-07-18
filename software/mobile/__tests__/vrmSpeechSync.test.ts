jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(),
  },
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'cache://',
}));

jest.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: jest.fn(),
  VRMUtils: {
    removeUnnecessaryVertices: jest.fn(),
    combineSkeletons: jest.fn(),
    rotateVRM0: jest.fn(),
  },
}));

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    load: jest.fn(),
  })),
}));

import { VRMManager } from '../components/vrm/VRMManager';

describe('VRM speech sync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    VRMManager.reset();
  });

  afterEach(() => {
    VRMManager.reset();
    jest.useRealTimers();
  });

  test('does not auto-clear speech before playback completion', () => {
    VRMManager.speak('这段讲解应该等真实语音结束后再消失', 'neutral', 500);

    jest.advanceTimersByTime(600);

    expect(VRMManager.getState().isSpeaking).toBe(true);
    expect(VRMManager.getState().subtitle).toBe('这段讲解应该等真实语音结束后再消失');

    VRMManager.stopSpeaking();

    expect(VRMManager.getState().isSpeaking).toBe(false);
    expect(VRMManager.getState().subtitle).toBe('');
  });

  test('queues the next subtitle until the current speech stops', () => {
    const speakEvents: string[] = [];
    const onSpeak = ({ text }: { text: string }) => speakEvents.push(text);
    VRMManager.on('speak', onSpeak);

    VRMManager.speak('第一段语音', 'neutral', 1000);
    VRMManager.speak('第二段语音', 'happy', 1000);

    expect(speakEvents).toEqual(['第一段语音']);
    expect(VRMManager.getState().subtitle).toBe('第一段语音');

    VRMManager.stopSpeaking();

    expect(speakEvents).toEqual(['第一段语音', '第二段语音']);
    expect(VRMManager.getState().isSpeaking).toBe(true);
    expect(VRMManager.getState().subtitle).toBe('第二段语音');

    VRMManager.off('speak', onSpeak);
  });

  test('replaces active and queued speech for page entry greetings', () => {
    const speakEvents: string[] = [];
    const onSpeak = ({ text }: { text: string }) => speakEvents.push(text);
    VRMManager.on('speak', onSpeak);

    VRMManager.speak('login page text', 'neutral', 1000);
    VRMManager.speak('queued login text', 'sad', 1000);
    VRMManager.replaceSpeech('home page text', 'happy', 1000);

    expect(speakEvents).toEqual(['login page text', 'home page text']);
    expect(VRMManager.getState().isSpeaking).toBe(true);
    expect(VRMManager.getState().subtitle).toBe('home page text');
    expect(VRMManager.getState().currentEmotion).toBe('happy');

    VRMManager.stopSpeaking();

    expect(VRMManager.getState().isSpeaking).toBe(false);
    expect(VRMManager.getState().subtitle).toBe('');
    expect(speakEvents).toEqual(['login page text', 'home page text']);

    VRMManager.off('speak', onSpeak);
  });

  test('drops active and queued speech when leaving a page', () => {
    const speakEvents: string[] = [];
    const onSpeak = ({ text }: { text: string }) => speakEvents.push(text);
    VRMManager.on('speak', onSpeak);

    VRMManager.speak('login page text', 'neutral', 1000);
    VRMManager.speak('queued login text', 'sad', 1000);
    VRMManager.stopSpeaking({ playQueued: false });

    expect(VRMManager.getState().isSpeaking).toBe(false);
    expect(VRMManager.getState().subtitle).toBe('');

    VRMManager.stopSpeaking();

    expect(speakEvents).toEqual(['login page text']);

    VRMManager.off('speak', onSpeak);
  });

  test('scopes audible playback sync to the driver that owns the speech', () => {
    const listener = jest.fn();
    VRMManager.on('resync', listener);

    VRMManager.speak('同步测试', 'neutral', 1200, 'explain', 1800, 'driver-a');
    VRMManager.resyncTimeline(1180, 'driver-a');

    expect(listener).toHaveBeenCalledWith({ durationMs: 1180, targetId: 'driver-a' });
    VRMManager.off('resync', listener);
    VRMManager.stopSpeaking({ playQueued: false });
  });

  test('keeps speech scoped to one driver when the active driver unmounts', () => {
    const playedBy: string[] = [];
    const makeListener = (speakerId: string) => (
      { targetId }: { targetId?: string },
    ) => {
      if (targetId && targetId !== speakerId) return;
      playedBy.push(speakerId);
    };
    const listenerA = makeListener('driver-a');
    const listenerB = makeListener('driver-b');

    VRMManager.on('speak', listenerA);
    VRMManager.on('speak', listenerB);
    VRMManager.registerSpeaker('driver-a');
    VRMManager.registerSpeaker('driver-b');
    VRMManager.unregisterSpeaker('driver-b');

    VRMManager.speak('driver fallback test', 'neutral', 1200);

    expect(playedBy).toEqual(['driver-a']);

    VRMManager.off('speak', listenerA);
    VRMManager.off('speak', listenerB);
    VRMManager.unregisterSpeaker('driver-a');
    VRMManager.stopSpeaking({ playQueued: false });
  });

  test('rejects late speech targeted at an inactive page driver', () => {
    const listener = jest.fn();
    VRMManager.on('speak', listener);
    VRMManager.registerSpeaker('driver-a');
    VRMManager.registerSpeaker('driver-b');

    VRMManager.speak('stale page speech', 'neutral', 1200, undefined, undefined, 'driver-a');

    expect(listener).not.toHaveBeenCalled();
    expect(VRMManager.getState().isSpeaking).toBe(false);

    VRMManager.off('speak', listener);
    VRMManager.unregisterSpeaker('driver-b');
    VRMManager.unregisterSpeaker('driver-a');
  });
});

describe('VRM TTS generation window', () => {
  test('allows backend voice generation to exceed the previous 3.5 second cutoff', () => {
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    expect(source).toContain('const TTS_TIMEOUT_MS = 12000;');
  });
});
