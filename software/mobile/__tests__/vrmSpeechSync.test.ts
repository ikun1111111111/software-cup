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
});
