import { createVRMTransformKey } from '../components/vrm/vrmTransformCache';

describe('VRM transform cache', () => {
  test('separates floating and full-screen transforms for the same model', () => {
    expect(createVRMTransformKey('avatar.vrm', 'float')).not.toBe(
      createVRMTransformKey('avatar.vrm', 'full'),
    );
  });

  test('separates transforms for different model files', () => {
    expect(createVRMTransformKey('avatar.vrm', 'float')).not.toBe(
      createVRMTransformKey('8024308560058477433.vrm', 'float'),
    );
  });
});
