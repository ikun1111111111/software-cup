import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SpotSwitchPage from '../pages/tourist/SpotSwitchPage';
import { KIOSK_SPOTS } from '../config/kioskSpots';

describe('SpotSwitchPage', () => {
  it('renders all scenic spot cards with links to kiosk chat routes', () => {
    render(
      <MemoryRouter>
        <SpotSwitchPage />
      </MemoryRouter>
    );

    const scenicSpots = KIOSK_SPOTS.filter((spot) => spot.id !== 'default');

    expect(screen.getByTestId('spot-switch-page')).toBeInTheDocument();
    expect(screen.getByText('点位节点切换台')).toBeInTheDocument();
    expect(screen.getByText('ADMIN NODE SWITCHER')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^spot-switch-card-/)).toHaveLength(scenicSpots.length);

    scenicSpots.forEach((spot) => {
      const card = screen.getByTestId(`spot-switch-card-${spot.id}`);
      expect(card).toHaveAttribute('href', `/chat?spot=${spot.id}`);
      expect(card).toHaveTextContent(spot.name);
      expect(card).toHaveTextContent(spot.guideVisual.facts[0]);
    });
  });
});
