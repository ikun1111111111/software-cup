describe('Metro VRM MIME handling', () => {
  test('overrides Metro\'s false content type for VRM assets', () => {
    const { withVrmAssetMime } = require('../metroModelMime.js');
    const headers = new Map<string, unknown>();
    const response = {
      setHeader(name: string, value: unknown) {
        headers.set(name.toLowerCase(), value);
      },
    };
    const metroMiddleware = (_request: unknown, res: typeof response) => {
      res.setHeader('Content-Type', false);
    };

    withVrmAssetMime(metroMiddleware)(
      { url: '/assets/?unstable_path=.%2Fassets%2Fmodels/avatar.vrm' },
      response,
      () => undefined,
    );

    expect(headers.get('content-type')).toBe('model/gltf-binary');
  });
});
