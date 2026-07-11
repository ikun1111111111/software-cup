import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DigitalHumanProvider } from '../components/tourist/DigitalHumanProvider';

vi.mock('../hooks/useCostume', () => ({
  useCostume: () => ({ cssFilter: 'none' }),
}));

vi.mock('../hooks/useGuideSpeech', () => ({
  useGuideSpeech: () => ({
    isSpeaking: false,
    emotion: 'neutral',
    audioChunks: [],
    phonemes: null,
    speak: vi.fn(),
    speakBrowserFallback: vi.fn(),
    stop: vi.fn(),
    setEmotion: vi.fn(),
    startStream: vi.fn(),
    appendAudioChunk: vi.fn(),
    setPhonemes: vi.fn(),
    setSpeaking: vi.fn(),
  }),
}));

vi.mock('../components/Galgame/GalgameScene', () => ({
  default: ({
    characterLeft,
    characterBottom,
    isMobile,
    hideBackground,
  }: {
    characterLeft: string;
    characterBottom: string;
    isMobile: boolean;
    hideBackground: boolean;
  }) => (
    <div
      data-testid="galgame-scene"
      data-character-left={characterLeft}
      data-character-bottom={characterBottom}
      data-is-mobile={String(isMobile)}
      data-hide-background={String(hideBackground)}
    />
  ),
}));

describe('DigitalHumanProvider mobile layout', () => {
  it('places the mobile entry digital human inside the viewport hero area', async () => {
    render(
      <DigitalHumanProvider pose="mobile-entry" sceneVariant="minimal" hideSceneBackground mobileLayout>
        <main />
      </DigitalHumanProvider>,
    );

    const scene = await screen.findByTestId('galgame-scene');
    expect(scene).toHaveAttribute('data-character-left', '76%');
    expect(scene).toHaveAttribute('data-character-bottom', '55%');
    expect(scene).toHaveAttribute('data-is-mobile', 'true');
    expect(scene).toHaveAttribute('data-hide-background', 'true');
  });
});
