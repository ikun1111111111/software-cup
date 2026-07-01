import type { PageContext } from '../components/vrm/VRMTypes';

describe('VRM page context contract', () => {
  test('includes the Xiaoling profile surface', () => {
    const context: PageContext = 'profile';
    expect(context).toBe('profile');
  });
});
