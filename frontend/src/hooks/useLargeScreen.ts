import { useEffect } from 'react';

/**
 * 大屏视口注入（当前保留为空实现）。
 * 不再强制 16:9 等比缩放，页面直接响应浏览器窗口大小。
 */
export function useLargeScreen() {
  useEffect(() => {
    // 清理之前可能残留的缩放变量
    document.documentElement.style.removeProperty('--viewport-scale');
    document.documentElement.style.removeProperty('--viewport-left');
    document.documentElement.style.removeProperty('--viewport-top');

    const reset = () => {
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };

    reset();
    window.addEventListener('resize', reset);
    return () => window.removeEventListener('resize', reset);
  }, []);
}

export default useLargeScreen;
