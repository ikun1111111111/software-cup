const MODEL_ASSET_MIME = 'model/gltf-binary';

function isVrmAssetRequest(url = '') {
  return /\.vrm(?:$|[&#])/i.test(url);
}

function withVrmAssetMime(middleware) {
  return (request, response, next) => {
    if (isVrmAssetRequest(request?.url) && typeof response?.setHeader === 'function') {
      const setHeader = response.setHeader.bind(response);
      response.setHeader = (name, value) => setHeader(
        name,
        String(name).toLowerCase() === 'content-type' ? MODEL_ASSET_MIME : value,
      );
    }

    return middleware(request, response, next);
  };
}

module.exports = {
  MODEL_ASSET_MIME,
  isVrmAssetRequest,
  withVrmAssetMime,
};
