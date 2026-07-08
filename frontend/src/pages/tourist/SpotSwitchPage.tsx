import React from 'react';
import { Link } from 'react-router-dom';
import { CompassOutlined, RightOutlined } from '@ant-design/icons';
import { KIOSK_SPOTS } from '../../config/kioskSpots';

const scenicSpots = KIOSK_SPOTS.filter((spot) => spot.id !== 'default');

const SpotSwitchPage: React.FC = () => {
  return (
    <main className="spot-switch-page" data-testid="spot-switch-page">
      <header className="spot-switch-header">
        <div>
          <span className="spot-switch-header__eyebrow">ADMIN NODE SWITCHER</span>
          <h1>点位节点切换台</h1>
        </div>
        <div className="spot-switch-header__meta" aria-label="点位状态">
          <span>{scenicSpots.length} 个节点</span>
          <span>P1 内容增强</span>
          <span>/spots</span>
        </div>
      </header>

      <section className="spot-switch-grid" aria-label="点位节点列表">
        {scenicSpots.map((spot, index) => (
          <Link
            key={spot.id}
            className="spot-node-card"
            to={`/chat?spot=${spot.id}`}
            data-testid={`spot-switch-card-${spot.id}`}
            style={
              {
                '--spot-accent': spot.accent,
                '--spot-accent-soft': spot.accentSoft,
                '--spot-delay': `${index * 18}ms`,
              } as React.CSSProperties
            }
          >
            <div className="spot-node-card__thumb">
              <img src={spot.backgroundImage} alt={spot.name} loading="lazy" />
              <em>{String(index + 1).padStart(2, '0')}</em>
            </div>

            <div className="spot-node-card__main">
              <div className="spot-node-card__title-row">
                <strong>{spot.name}</strong>
                <span>ONLINE</span>
              </div>
              <p>{spot.subtitle}</p>
              <code>/chat?spot={spot.id}</code>
              <div className="spot-node-card__facts">
                {spot.guideVisual.facts.slice(0, 2).map((fact) => (
                  <small key={fact}>{fact}</small>
                ))}
              </div>
            </div>

            <div className="spot-node-card__action" aria-hidden="true">
              <CompassOutlined />
              <RightOutlined />
            </div>
          </Link>
        ))}
      </section>

      <style>{`
        .spot-switch-page {
          --console-bg: #081019;
          --console-panel: rgba(14, 25, 36, 0.78);
          --console-line: rgba(177, 207, 218, 0.13);
          --console-text: #eef7f5;
          --console-muted: rgba(238, 247, 245, 0.56);
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 100vh;
          overflow: auto;
          padding: clamp(24px, 3vw, 42px);
          color: var(--console-text);
          background:
            radial-gradient(circle at 14% 0%, rgba(93, 167, 180, 0.20), transparent 30%),
            radial-gradient(circle at 86% 10%, rgba(216, 168, 78, 0.15), transparent 28%),
            linear-gradient(135deg, #07101a 0%, #101b25 46%, #091019 100%);
          isolation: isolate;
        }

        .spot-switch-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: linear-gradient(180deg, #000, transparent 82%);
        }

        .spot-switch-header {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: clamp(18px, 2vw, 28px);
          padding: 14px 16px;
          border: 1px solid var(--console-line);
          border-radius: 24px;
          background: rgba(8, 16, 25, 0.72);
          backdrop-filter: blur(18px) saturate(130%);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.07);
        }

        .spot-switch-header__eyebrow {
          display: block;
          color: rgba(147, 218, 218, 0.78);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.22em;
        }

        .spot-switch-header h1 {
          margin: 4px 0 0;
          color: var(--console-text);
          font-size: clamp(24px, 2.2vw, 38px);
          letter-spacing: 0.06em;
          line-height: 1.1;
        }

        .spot-switch-header__meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .spot-switch-header__meta span {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(147, 218, 218, 0.16);
          padding: 0 11px;
          color: rgba(238, 247, 245, 0.68);
          background: rgba(255, 255, 255, 0.045);
          font-size: 12px;
          font-weight: 800;
        }

        .spot-switch-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(12px, 1.15vw, 18px);
          align-content: start;
        }

        .spot-node-card {
          position: relative;
          min-height: 188px;
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 14px;
          padding: 12px;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid color-mix(in srgb, var(--spot-accent) 26%, var(--console-line));
          color: var(--console-text);
          text-decoration: none;
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--spot-accent) 10%, transparent), transparent 42%),
            var(--console-panel);
          box-shadow: 0 16px 38px rgba(0, 0, 0, 0.21), inset 0 1px 0 rgba(255,255,255,0.06);
          animation: spotNodeIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--spot-delay);
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms ease, background 180ms ease;
        }

        .spot-node-card::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent);
          transform: translateX(-120%);
          transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .spot-node-card:hover {
          color: var(--console-text);
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--spot-accent) 58%, rgba(147, 218, 218, 0.18));
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--spot-accent) 17%, transparent), transparent 44%),
            rgba(18, 31, 44, 0.88);
        }

        .spot-node-card:hover::after {
          transform: translateX(120%);
        }

        .spot-node-card__thumb {
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          border-radius: 18px;
          background: rgba(255,255,255,0.05);
        }

        .spot-node-card__thumb img {
          width: 100%;
          height: 100%;
          min-height: 164px;
          object-fit: cover;
          display: block;
          filter: saturate(0.86) contrast(1.04) brightness(0.82);
          transform: scale(1.02);
          transition: transform 240ms ease, filter 240ms ease;
        }

        .spot-node-card:hover .spot-node-card__thumb img {
          transform: scale(1.08);
          filter: saturate(0.98) contrast(1.05) brightness(0.92);
        }

        .spot-node-card__thumb::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 34%, rgba(0,0,0,0.58));
        }

        .spot-node-card__thumb em {
          position: absolute;
          left: 9px;
          bottom: 9px;
          z-index: 2;
          min-width: 36px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #071019;
          background: color-mix(in srgb, var(--spot-accent) 84%, #fff);
          font-size: 12px;
          font-style: normal;
          font-weight: 950;
        }

        .spot-node-card__main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          padding: 2px 0;
        }

        .spot-node-card__title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .spot-node-card__title-row strong {
          min-width: 0;
          color: #f7fffb;
          font-size: clamp(18px, 1.28vw, 23px);
          line-height: 1.18;
          letter-spacing: 0.04em;
        }

        .spot-node-card__title-row span {
          flex: 0 0 auto;
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border-radius: 999px;
          background: rgba(90, 211, 163, 0.10);
          color: #8ff0c8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .spot-node-card__title-row span::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #66e6ad;
          box-shadow: 0 0 12px #66e6ad;
        }

        .spot-node-card p {
          margin: 8px 0 0;
          color: var(--console-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .spot-node-card code {
          width: fit-content;
          max-width: 100%;
          margin-top: 10px;
          padding: 5px 8px;
          overflow: hidden;
          border-radius: 9px;
          background: rgba(0, 0, 0, 0.24);
          color: color-mix(in srgb, var(--spot-accent) 74%, #d7f5ef);
          font-size: 11px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .spot-node-card__facts {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: auto;
          padding-top: 12px;
        }

        .spot-node-card__facts small {
          min-height: 24px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--spot-accent) 22%, rgba(255,255,255,0.10));
          padding: 0 8px;
          color: rgba(238, 247, 245, 0.72);
          background: color-mix(in srgb, var(--spot-accent) 10%, rgba(255,255,255,0.035));
          font-size: 11px;
          font-weight: 800;
        }

        .spot-node-card__action {
          position: absolute;
          right: 12px;
          bottom: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: color-mix(in srgb, var(--spot-accent) 78%, #eaf8f4);
          opacity: 0.78;
          transition: transform 180ms ease, opacity 180ms ease;
        }

        .spot-node-card:hover .spot-node-card__action {
          opacity: 1;
          transform: translateX(2px);
        }

        @keyframes spotNodeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1480px) {
          .spot-switch-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1080px) {
          .spot-switch-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .spot-switch-page {
            padding: 18px;
          }

          .spot-switch-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .spot-switch-header__meta {
            justify-content: flex-start;
          }

          .spot-switch-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spot-node-card,
          .spot-node-card::after,
          .spot-node-card__thumb img,
          .spot-node-card__action {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </main>
  );
};

export default SpotSwitchPage;
