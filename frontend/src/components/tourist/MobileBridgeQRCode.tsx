import React, { useEffect, useMemo, useState } from 'react';
import { CheckOutlined, CloseOutlined, CopyOutlined, MobileOutlined, QrcodeOutlined } from '@ant-design/icons';
import { QRCode, message } from 'antd';

const QR_CODE_SIZE = 132;

const buildDefaultMobileUrl = () => {
  if (typeof window === 'undefined') return '/mobile?from=web-qr';
  const url = new URL('/mobile', window.location.origin);
  url.searchParams.set('from', 'web-qr');
  return url.toString();
};

const getMobileEntryUrl = () => {
  const configured = import.meta.env.VITE_MOBILE_ENTRY_URL?.trim();
  if (!configured) return buildDefaultMobileUrl();

  if (/^(https?:\/\/|exp:\/\/)/i.test(configured)) return configured;
  if (configured.startsWith('/')) {
    return new URL(configured, window.location.origin).toString();
  }
  return configured;
};

const shouldOpenBridgeByDefault = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1200px) and (min-height: 780px)').matches;
};

const canKeepBridgePanelOpen = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1080px) and (min-height: 740px)').matches;
};

const shortUrl = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
  } catch {
    return value;
  }
};

const MobileBridgeQRCode: React.FC = () => {
  const [open, setOpen] = useState(shouldOpenBridgeByDefault);
  const [copied, setCopied] = useState(false);
  const mobileUrl = useMemo(() => getMobileEntryUrl(), []);

  useEffect(() => {
    const handleResize = () => {
      if (!canKeepBridgePanelOpen()) {
        setOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      message.success('移动端链接已复制');
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      message.warning('复制失败，请手动复制链接');
    }
  };

  return (
    <aside className={`mobile-bridge ${open ? 'is-open' : ''}`} aria-label="移动端扫码入口">
      {!open && (
        <button className="mobile-bridge__trigger" type="button" onClick={() => setOpen(true)}>
          <QrcodeOutlined />
          <span>手机扫码</span>
        </button>
      )}

      {open && (
        <div className="mobile-bridge__panel">
          <button
            className="mobile-bridge__close"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="关闭移动端扫码入口"
            title="关闭"
          >
            <CloseOutlined />
          </button>

          <div className="mobile-bridge__heading">
            <span className="mobile-bridge__icon">
              <MobileOutlined />
            </span>
            <div>
              <strong>手机继续游览</strong>
              <small>扫码打开移动端导览</small>
            </div>
          </div>

          <div className="mobile-bridge__qr">
            <QRCode value={mobileUrl} size={QR_CODE_SIZE} bordered={false} bgColor="transparent" />
          </div>

          <button className="mobile-bridge__copy" type="button" onClick={handleCopy}>
            {copied ? <CheckOutlined /> : <CopyOutlined />}
            <span>{shortUrl(mobileUrl)}</span>
          </button>
        </div>
      )}

      <style>{`
        .mobile-bridge {
          position: fixed;
          top: max(104px, calc(env(safe-area-inset-top) + 16vh));
          left: max(20px, env(safe-area-inset-left));
          z-index: 1250;
          pointer-events: none;
          font-family: var(--font-sans), 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }

        .mobile-bridge button {
          font: inherit;
        }

        .mobile-bridge__trigger {
          pointer-events: auto;
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 13px;
          border: 1px solid rgba(96, 76, 42, 0.14);
          border-radius: 999px;
          color: #2a2520;
          background:
            linear-gradient(145deg, rgba(255, 250, 238, 0.88), rgba(239, 224, 195, 0.72)),
            rgba(255, 250, 238, 0.74);
          box-shadow: 0 16px 42px rgba(92, 70, 38, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(14px) saturate(116%);
          -webkit-backdrop-filter: blur(14px) saturate(116%);
          cursor: pointer;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .mobile-bridge__trigger:hover {
          transform: translateY(-2px);
          border-color: rgba(200, 75, 49, 0.28);
          box-shadow: 0 20px 52px rgba(92, 70, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.74);
        }

        .mobile-bridge__trigger span:last-child {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .mobile-bridge__panel {
          pointer-events: auto;
          width: 210px;
          padding: 13px;
          border: 1px solid rgba(96, 76, 42, 0.14);
          border-radius: 16px;
          color: #2a2520;
          background:
            linear-gradient(145deg, rgba(255, 250, 238, 0.94), rgba(245, 235, 213, 0.9)),
            url('/image/history/paper-aged.jpg');
          background-size: auto, cover;
          box-shadow: 0 18px 46px rgba(60, 45, 28, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(14px) saturate(110%);
          -webkit-backdrop-filter: blur(14px) saturate(110%);
          animation: mobileBridgeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mobile-bridge__close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(96, 76, 42, 0.1);
          border-radius: 50%;
          color: rgba(42, 37, 32, 0.58);
          background: rgba(255, 250, 238, 0.58);
          cursor: pointer;
        }

        .mobile-bridge__heading {
          display: grid;
          grid-template-columns: 32px 1fr;
          gap: 8px;
          align-items: center;
          padding-right: 24px;
        }

        .mobile-bridge__icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fffaf0;
          background: linear-gradient(145deg, #c84b31, #d8a84e);
          box-shadow: 0 10px 24px rgba(200, 75, 49, 0.22);
        }

        .mobile-bridge__heading strong {
          display: block;
          color: #241f1a;
          font-size: 14px;
          letter-spacing: 0.02em;
        }

        .mobile-bridge__heading small {
          display: block;
          margin-top: 1px;
          color: rgba(42, 37, 32, 0.56);
          font-size: 11px;
        }

        .mobile-bridge__qr {
          display: grid;
          place-items: center;
          margin: 11px auto 10px;
          padding: 9px;
          border-radius: 13px;
          background: rgba(255, 255, 250, 0.72);
          box-shadow: inset 0 0 0 1px rgba(96, 76, 42, 0.08);
        }

        .mobile-bridge__copy {
          width: 100%;
          min-height: 32px;
          display: grid;
          grid-template-columns: 16px minmax(0, 1fr);
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(96, 76, 42, 0.12);
          border-radius: 999px;
          color: rgba(42, 37, 32, 0.72);
          background: rgba(255, 250, 238, 0.62);
          cursor: pointer;
        }

        .mobile-bridge__copy span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
          font-size: 11px;
        }

        @keyframes mobileBridgeIn {
          from {
            opacity: 0;
            transform: translate3d(-10px, -6px, 0) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (max-width: 760px) {
          .mobile-bridge {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
};

export default MobileBridgeQRCode;
