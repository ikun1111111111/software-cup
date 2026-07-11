import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../components/tourist/DigitalHumanProvider', () => ({
  DigitalHumanProvider: ({
    children,
    pose,
    sceneVariant,
    hideSceneBackground,
    mobileLayout,
  }: {
    children: React.ReactNode;
    pose?: string;
    sceneVariant?: string;
    hideSceneBackground?: boolean;
    mobileLayout?: boolean;
  }) => (
    <div
      data-testid="digital-human-provider"
      data-pose={pose}
      data-scene-variant={sceneVariant || ''}
      data-hide-scene-background={String(hideSceneBackground)}
      data-mobile-layout={String(mobileLayout)}
    >
      {children}
    </div>
  ),
}));

vi.mock('../pages/tourist/MobileEntryPage', () => ({
  default: () => <main data-testid="mobile-entry-page" />,
}));

describe('App mobile entry', () => {
  it('keeps the digital human mounted on the mobile home page', async () => {
    render(
      <MemoryRouter initialEntries={['/mobile']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('mobile-entry-page')).toBeInTheDocument();

    const provider = screen.getByTestId('digital-human-provider');
    expect(provider).toHaveAttribute('data-pose', 'mobile-entry');
    expect(provider).toHaveAttribute('data-scene-variant', 'minimal');
    expect(provider).toHaveAttribute('data-hide-scene-background', 'true');
    expect(provider).toHaveAttribute('data-mobile-layout', 'true');
  });
});
