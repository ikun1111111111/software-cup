jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('../assets/models/avatar.vrm', () => 'avatar-module', { virtual: true });
jest.mock('../assets/models/8024308560058477433.vrm', () => 'spring-module', { virtual: true });
jest.mock('../assets/models/4353238926149796085.vrm', () => 'lantern-module', { virtual: true });
jest.mock('../assets/models/5186055420774500970.vrm', () => 'qingming-module', { virtual: true });
jest.mock('../assets/models/4104272907947728185.vrm', () => 'dragon-module', { virtual: true });
jest.mock('../assets/models/5784779633385764689.vrm', () => 'midautumn-module', { virtual: true });
jest.mock('../assets/models/8511002460770470367.vrm', () => 'national-module', { virtual: true });

const mockDownloadAsync = jest.fn(async () => undefined);
const mockAssetFromModule = jest.fn(() => ({
  uri: 'asset://avatar-module',
  localUri: 'asset://avatar-module',
  downloadAsync: mockDownloadAsync,
}));

jest.mock('expo-asset', () => ({
  Asset: { fromModule: mockAssetFromModule },
}));

const mockDeleteAsync = jest.fn(async () => undefined);
const mockCopyAsync = jest.fn(async () => undefined);

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'cache://',
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: mockCopyAsync,
  deleteAsync: mockDeleteAsync,
}));

jest.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: jest.fn(),
  VRMUtils: {
    removeUnnecessaryVertices: jest.fn(),
    combineSkeletons: jest.fn(),
    rotateVRM0: jest.fn(),
  },
}));

const mockLoad = jest.fn();

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    load: mockLoad,
  })),
}));

import { VRMManager } from '../components/vrm/VRMManager';

describe('VRMManager native cache recovery', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VRMManager.dispose();
    mockLoad.mockReset();
    mockDeleteAsync.mockClear();
    mockCopyAsync.mockClear();
    mockAssetFromModule.mockClear();
    mockDownloadAsync.mockClear();
  });

  afterEach(() => {
    VRMManager.dispose();
    warnSpy.mockRestore();
  });

  test('deletes a corrupt cached model and reloads the bundled asset', async () => {
    const vrm = {
      scene: { parent: null, traverse: jest.fn() },
      update: jest.fn(),
    } as any;

    mockLoad
      .mockImplementationOnce((_uri, _onLoad, _onProgress, onError) => {
        onError(new Error('corrupt cached VRM'));
      })
      .mockImplementationOnce((_uri, onLoad) => {
        onLoad({ userData: { vrm }, scene: vrm.scene });
      });

    await expect(VRMManager.getOrLoad('avatar.vrm')).resolves.toBe(vrm);

    expect(mockLoad.mock.calls[0][0]).toBe('cache://vrm_cache/avatar.vrm');
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'cache://vrm_cache/avatar.vrm',
      { idempotent: true },
    );
    expect(mockAssetFromModule).toHaveBeenCalledWith('avatar-module');
    expect(mockDownloadAsync).toHaveBeenCalled();
    expect(mockLoad.mock.calls[1][0]).toBe('asset://avatar-module');
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'asset://avatar-module',
      to: 'cache://vrm_cache/avatar.vrm',
    });
  });
});
