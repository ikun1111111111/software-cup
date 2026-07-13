import { primeWebAudioPlayback } from '../utils/webAudioUnlock';

describe('primeWebAudioPlayback', () => {
  test('plays one silent clip from a user gesture and reuses the unlocked state', async () => {
    const pause = jest.fn();
    const play = jest.fn().mockResolvedValue(undefined);
    const createAudio = jest.fn(() => ({
      volume: 1,
      currentTime: 0,
      play,
      pause,
    }));

    await expect(primeWebAudioPlayback(createAudio)).resolves.toBe(true);
    await expect(primeWebAudioPlayback(createAudio)).resolves.toBe(true);

    expect(createAudio).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);
  });
});
