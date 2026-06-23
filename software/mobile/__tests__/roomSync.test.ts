import {
  applyRoomSyncMessage,
  initialRoomSyncState,
  mergeRoomSnapshot,
} from '../utils/roomSync';

describe('room sync state', () => {
  test('hydrates active route from room snapshot', () => {
    const state = mergeRoomSnapshot({
      room_id: '123456',
      creator: '队长',
      created_at: 1,
      itinerary: [],
      members: [{ name: '队长' }],
      active_route: {
        route_id: 'route-a',
        name: '经典路线',
        spot_order: ['spot-a', 'spot-b'],
        spot_names: [
          { id: 'spot-a', name: '第一站' },
          { id: 'spot-b', name: '第二站' },
        ],
        duration: '2小时',
        route_type: 'history',
      },
    });

    expect(state.activeRoute?.spot_order).toEqual(['spot-a', 'spot-b']);
    expect(state.members).toHaveLength(1);
  });

  test('applies route_updated websocket message without changing route order', () => {
    const state = applyRoomSyncMessage(initialRoomSyncState, {
      type: 'route_updated',
      active_route: {
        route_id: 'route-b',
        name: '亲子路线',
        spot_order: ['first', 'second', 'third'],
        spot_names: [
          { id: 'first', name: '第一站' },
          { id: 'second', name: '第二站' },
          { id: 'third', name: '第三站' },
        ],
        duration: '3小时',
        route_type: 'family',
      },
    });

    expect(state.activeRoute?.route_id).toBe('route-b');
    expect(state.activeRoute?.spot_order).toEqual(['first', 'second', 'third']);
  });
});
