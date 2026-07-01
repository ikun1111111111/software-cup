import { getTourArrivalTransition, getTourCompletionTransition } from '../utils/tourProgress';

const routeSpots = [
  { id: 'spot-a', name: '梵宫' },
  { id: 'spot-b', name: '九龙灌浴' },
  { id: 'spot-c', name: '五印坛城' },
  { id: 'spot-d', name: '菩提大道' },
];

describe('tour progress transition', () => {
  test('moves current target to the next route spot after completing the active spot', () => {
    const transition = getTourCompletionTransition(
      routeSpots,
      { total: 3, completed: 0 },
      routeSpots[0],
    );

    expect(transition.progress).toEqual({ total: 3, completed: 1, current: 2 });
    expect(transition.currentSpot).toEqual(routeSpots[1]);
    expect(transition.nextSpot).toEqual(routeSpots[2]);
    expect(transition.isTourComplete).toBe(false);
  });

  test('marks the tour complete after the last route spot', () => {
    const transition = getTourCompletionTransition(
      routeSpots.slice(0, 3),
      { total: 3, completed: 2 },
      routeSpots[2],
    );

    expect(transition.progress).toEqual({ total: 3, completed: 3, current: 3 });
    expect(transition.currentSpot).toBeNull();
    expect(transition.nextSpot).toBeNull();
    expect(transition.isTourComplete).toBe(true);
  });

  test('falls back to previous completed count when the spot is outside the route', () => {
    const transition = getTourCompletionTransition(
      routeSpots.slice(0, 3),
      { total: 3, completed: 1 },
      { id: 'free-roam-spot' },
    );

    expect(transition.progress).toEqual({ total: 3, completed: 2, current: 3 });
    expect(transition.currentSpot).toEqual(routeSpots[2]);
    expect(transition.nextSpot).toBeNull();
    expect(transition.isTourComplete).toBe(false);
  });

  test('marks the arrived fourth route spot as the active current spot', () => {
    const transition = getTourArrivalTransition(
      routeSpots,
      { total: routeSpots.length, completed: 2, current: 3 },
      routeSpots[3],
    );

    expect(transition.progress).toEqual({ total: 4, completed: 3, current: 4 });
    expect(transition.currentSpot).toEqual(routeSpots[3]);
    expect(transition.nextSpot).toBeNull();
  });
});
