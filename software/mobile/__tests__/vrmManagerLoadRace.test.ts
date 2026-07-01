jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../assets/models/avatar.vrm', () => 'avatar-module', { virtual: true });
jest.mock('../assets/models/8024308560058477433.vrm', () => 'spring-module', { virtual: true });
jest.mock('../assets/models/4353238926149796085.vrm', () => 'lantern-module', { virtual: true });
jest.mock('../assets/models/5186055420774500970.vrm', () => 'qingming-module', { virtual: true });
jest.mock('../assets/models/4104272907947728185.vrm', () => 'dragon-module', { virtual: true });
jest.mock('../assets/models/5784779633385764689.vrm', () => 'midautumn-module', { virtual: true });
jest.mock('../assets/models/8511002460770470367.vrm', () => 'national-module', { virtual: true });

const mockAssetFromModule = jest.fn((moduleId: string) => ({
  uri: `asset://${moduleId}`,
  localUri: `asset://${moduleId}`,
  downloadAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: mockAssetFromModule,
  },
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'cache://',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
}));

jest.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: jest.fn(),
  VRMUtils: {
    removeUnnecessaryVertices: jest.fn(),
    combineSkeletons: jest.fn(),
    rotateVRM0: jest.fn(),
  },
}));

type PendingLoad = {
  uri: string;
  resolve: (gltf: any) => void;
  reject: (error: Error) => void;
};

const mockPendingLoads: PendingLoad[] = [];

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    load: jest.fn((uri: string, onLoad: (gltf: any) => void, _onProgress: unknown, onError: (error: Error) => void) => {
      mockPendingLoads.push({ uri, resolve: onLoad, reject: onError });
    }),
  })),
}));

import { StaleVRMLoadError, VRMManager } from '../components/vrm/VRMManager';

function createFakeVRM(name: string) {
  return {
    name,
    scene: {
      parent: null,
      traverse: jest.fn(),
    },
    update: jest.fn(),
  } as any;
}

async function flushPromises(times = 8) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

describe('VRMManager load race handling', () => {
  beforeEach(() => {
    mockPendingLoads.length = 0;
    mockAssetFromModule.mockClear();
    VRMManager.dispose();
  });

  afterEach(() => {
    VRMManager.dispose();
  });

  test('does not let a superseded load overwrite the current model', async () => {
    const firstLoad = VRMManager.preload('8024308560058477433.vrm');
    await flushPromises();
    expect(mockPendingLoads).toHaveLength(1);

    const secondLoad = VRMManager.getOrLoad('avatar.vrm');
    await flushPromises();
    expect(mockPendingLoads).toHaveLength(2);

    const currentVRM = createFakeVRM('avatar');
    mockPendingLoads[1].resolve({
      userData: { vrm: currentVRM },
      scene: currentVRM.scene,
    });

    await expect(secondLoad).resolves.toBe(currentVRM);
    expect(VRMManager.getVRM()).toBe(currentVRM);

    const staleVRM = createFakeVRM('spring');
    mockPendingLoads[0].resolve({
      userData: { vrm: staleVRM },
      scene: staleVRM.scene,
    });

    await expect(firstLoad).rejects.toBeInstanceOf(StaleVRMLoadError);
    expect(VRMManager.getVRM()).toBe(currentVRM);
    expect(staleVRM.scene.traverse).toHaveBeenCalled();
  });
});
