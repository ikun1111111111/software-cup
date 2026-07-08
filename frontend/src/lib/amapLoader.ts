/**
 * 高德地图 JS API loader — 单例，避免重复加载脚本。
 * 必须先在 window 上设置 _AMapSecurityConfig 再注入 script，否则会报 INVALID_USER_SCODE。
 */
declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
    AMap?: any;
  }
}

const AMAP_VERSION = '2.0';
const AMAP_PLUGINS = ['AMap.Scale', 'AMap.ToolBar', 'AMap.Walking', 'AMap.PlaceSearch'];

let loadPromise: Promise<any> | null = null;

export function loadAMap(): Promise<any> {
  if (loadPromise) return loadPromise;
  if (window.AMap) return Promise.resolve(window.AMap);

  const key = import.meta.env.VITE_AMAP_KEY;
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
  if (!key) {
    return Promise.reject(new Error('VITE_AMAP_KEY is not set'));
  }

  if (securityCode) {
    window._AMapSecurityConfig = { securityJsCode: securityCode };
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const plugins = AMAP_PLUGINS.join(',');
    script.src = `https://webapi.amap.com/maps?v=${AMAP_VERSION}&key=${key}&plugin=${plugins}`;
    script.async = true;
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        loadPromise = null;
        reject(new Error('AMap loaded but window.AMap is undefined'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load AMap JS API script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
