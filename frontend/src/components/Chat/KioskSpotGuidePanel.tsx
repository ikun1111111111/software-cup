import React from 'react';
import type { KioskGuideVisual } from '../../config/kioskSpots';

interface KioskSpotGuidePanelProps {
  visual: KioskGuideVisual;
  spotName: string;
  activeIndex?: number;
  isSpeaking?: boolean;
}

const KioskSpotGuidePanel: React.FC<KioskSpotGuidePanelProps> = ({
  visual,
  spotName,
  activeIndex = 0,
  isSpeaking = false,
}) => {
  const activeCardIndex = visual.cards.length > 0 ? activeIndex % visual.cards.length : 0;
  const activeCard = visual.cards[activeCardIndex];

  return (
    <div className="kiosk-spot-guide-panel" data-testid="kiosk-spot-guide-panel">
      <section className="kiosk-spot-guide-panel__hero">
        <img className="kiosk-spot-guide-panel__hero-image" src={visual.heroImage} alt={visual.title} />
        <div className="kiosk-spot-guide-panel__hero-shade" />
        <div className="kiosk-spot-guide-panel__status">
          <span className={isSpeaking ? 'is-speaking' : ''} />
          {isSpeaking ? '小景讲解中' : '图文导览'}
        </div>
        <div className="kiosk-spot-guide-panel__heroText">
          <span>{spotName}</span>
          <strong>{visual.title}</strong>
          <small>{visual.subtitle}</small>
        </div>
        {activeCard && (
          <div className="kiosk-spot-guide-panel__hero-focus">
            <span>
              当前章节 {activeCardIndex + 1}/{visual.cards.length}
            </span>
            <strong>{activeCard.title}</strong>
            <small>{activeCard.eyebrow}</small>
          </div>
        )}
      </section>

      <div className="kiosk-spot-guide-panel__body">
        <section className="kiosk-spot-guide-panel__overview">
          <div className="kiosk-spot-guide-panel__intro">
            <span>导览速读</span>
            <p>{visual.overview}</p>
            {visual.facts.length > 0 && (
              <div className="kiosk-spot-guide-panel__facts" aria-label={`${spotName}速记信息`}>
                {visual.facts.map((fact) => (
                  <em key={fact}>{fact}</em>
                ))}
              </div>
            )}
          </div>
          <div className="kiosk-spot-guide-panel__metrics">
            {visual.metrics.map((metric) => (
              <article key={`${metric.label}-${metric.value}`} data-testid="kiosk-guide-metric">
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="kiosk-spot-guide-panel__cards" aria-label={`${spotName}讲解章节`}>
          {visual.cards.map((card, index) => (
            <article
              key={card.title}
              className={index === activeCardIndex ? 'is-active' : ''}
              data-testid="kiosk-guide-card"
            >
              <div className="kiosk-spot-guide-panel__card-image">
                <img src={card.image} alt={card.title} loading="lazy" />
                <em>{String(index + 1).padStart(2, '0')}</em>
              </div>
              <div className="kiosk-spot-guide-panel__card-copy">
                <span>{card.eyebrow}</span>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="kiosk-spot-guide-panel__lower">
          <div className="kiosk-spot-guide-panel__storyline">
            <div className="kiosk-spot-guide-panel__section-title">
              <span>讲解节奏</span>
              <strong>小景这样带你看</strong>
            </div>
            <div className="kiosk-spot-guide-panel__storyline-list">
              {visual.storyline.map((item, index) => (
                <article key={item.title} className={index === activeCardIndex ? 'is-active' : ''}>
                  <em>{item.tag}</em>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="kiosk-spot-guide-panel__tips">
            <div className="kiosk-spot-guide-panel__section-title">
              <span>{isSpeaking ? '正在讲解' : '游览提示'}</span>
              <strong>现场怎么走</strong>
            </div>
            <ol>
              {visual.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <style>{`
        .kiosk-spot-guide-panel {
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(220px, 0.42fr) minmax(0, 1fr);
          gap: clamp(12px, 1.1vw, 18px);
          color: #2a2520;
          overflow: hidden;
        }

        .kiosk-spot-guide-panel__hero {
          position: relative;
          min-height: 0;
          overflow: hidden;
          border-radius: clamp(24px, 2vw, 34px);
          border: 1px solid rgba(96,76,42,0.14);
          background: rgba(255,250,238,0.42);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.46), 0 18px 42px rgba(92,70,38,0.12);
          isolation: isolate;
        }

        .kiosk-spot-guide-panel__hero-image {
          width: 100%;
          height: 100%;
          min-height: inherit;
          display: block;
          object-fit: cover;
          filter: saturate(0.96) contrast(0.98);
          transform: scale(1.018);
        }

        .kiosk-spot-guide-panel__hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(32,24,17,0.70), rgba(32,24,17,0.22) 50%, rgba(255,250,238,0.08)),
            radial-gradient(circle at 14% 18%, rgba(216,168,78,0.30), transparent 38%),
            linear-gradient(180deg, transparent 48%, rgba(35,24,15,0.36));
          pointer-events: none;
        }

        .kiosk-spot-guide-panel__status {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255,250,238,0.78);
          border: 1px solid rgba(255,255,255,0.46);
          color: rgba(42,37,32,0.68);
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(42,37,32,0.12);
        }

        .kiosk-spot-guide-panel__status span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--spot-accent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--spot-accent) 16%, transparent);
        }

        .kiosk-spot-guide-panel__status span.is-speaking {
          animation: kioskGuidePulse 1.4s ease-in-out infinite;
        }

        .kiosk-spot-guide-panel__heroText {
          position: absolute;
          z-index: 2;
          left: clamp(18px, 1.6vw, 30px);
          bottom: clamp(18px, 1.5vw, 30px);
          max-width: min(430px, 68%);
          color: #fffaf0;
          text-shadow: 0 2px 16px rgba(0,0,0,0.34);
        }

        .kiosk-spot-guide-panel__heroText span,
        .kiosk-spot-guide-panel__section-title span,
        .kiosk-spot-guide-panel__intro span,
        .kiosk-spot-guide-panel__card-copy span {
          display: block;
          color: color-mix(in srgb, var(--spot-accent) 76%, #f6d788);
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.18em;
        }

        .kiosk-spot-guide-panel__heroText strong {
          display: block;
          margin-top: 4px;
          font-family: var(--font-calligraphy), 'STKaiti', 'KaiTi', serif;
          font-size: clamp(31px, 2.55vw, 50px);
          letter-spacing: 0.1em;
          line-height: 1.08;
        }

        .kiosk-spot-guide-panel__heroText small {
          display: block;
          margin-top: 8px;
          color: rgba(255,250,240,0.88);
          font-size: clamp(13px, 1vw, 16px);
          line-height: 1.58;
        }

        .kiosk-spot-guide-panel__hero-focus {
          position: absolute;
          right: clamp(16px, 1.4vw, 24px);
          bottom: clamp(16px, 1.4vw, 24px);
          z-index: 2;
          width: min(270px, 34%);
          padding: 13px 15px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.48);
          background: rgba(255,250,238,0.78);
          box-shadow: 0 14px 28px rgba(42,37,32,0.16);
        }

        .kiosk-spot-guide-panel__hero-focus span,
        .kiosk-spot-guide-panel__hero-focus small {
          display: block;
          color: color-mix(in srgb, var(--spot-accent) 74%, #6b4c25);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .kiosk-spot-guide-panel__hero-focus strong {
          display: block;
          margin: 4px 0 2px;
          color: #2a2520;
          font-size: clamp(17px, 1.2vw, 22px);
          letter-spacing: 0.04em;
        }

        .kiosk-spot-guide-panel__body {
          min-height: 0;
          overflow: auto;
          display: grid;
          align-content: start;
          gap: clamp(12px, 1.1vw, 18px);
          padding-right: 4px;
        }

        .kiosk-spot-guide-panel__body::-webkit-scrollbar {
          width: 6px;
        }

        .kiosk-spot-guide-panel__body::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(120,92,48,0.24);
        }

        .kiosk-spot-guide-panel__overview {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .kiosk-spot-guide-panel__intro,
        .kiosk-spot-guide-panel__metrics article,
        .kiosk-spot-guide-panel__cards article,
        .kiosk-spot-guide-panel__storyline,
        .kiosk-spot-guide-panel__tips {
          border: 1px solid rgba(96,76,42,0.11);
          background:
            linear-gradient(135deg, rgba(255,250,238,0.72), rgba(239,224,195,0.46)),
            url('/image/history/paper-texture-seamless.jpg');
          background-size: auto, 360px 360px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.56), 0 10px 26px rgba(92,70,38,0.07);
        }

        .kiosk-spot-guide-panel__intro {
          padding: clamp(14px, 1.2vw, 18px);
          border-radius: 22px;
        }

        .kiosk-spot-guide-panel__intro p {
          margin: 8px 0 0;
          color: rgba(42,37,32,0.72);
          font-size: clamp(14px, 0.98vw, 16px);
          line-height: 1.72;
        }

        .kiosk-spot-guide-panel__facts {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .kiosk-spot-guide-panel__facts em {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--spot-accent) 24%, rgba(96,76,42,0.16));
          background:
            radial-gradient(circle at 18% 10%, rgba(255,255,255,0.72), transparent 58%),
            color-mix(in srgb, var(--spot-accent) 12%, rgba(255,250,238,0.76));
          color: color-mix(in srgb, var(--spot-accent) 74%, #4c301c);
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
          letter-spacing: 0.04em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.58);
        }

        .kiosk-spot-guide-panel__metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .kiosk-spot-guide-panel__metrics article {
          min-height: 88px;
          padding: 12px;
          border-radius: 20px;
          display: grid;
          align-content: start;
          gap: 4px;
          overflow: hidden;
        }

        .kiosk-spot-guide-panel__metrics article strong {
          color: color-mix(in srgb, var(--spot-accent) 72%, #4c301c);
          font-family: var(--font-calligraphy), 'STKaiti', 'KaiTi', serif;
          font-size: clamp(22px, 1.65vw, 32px);
          line-height: 1;
          white-space: nowrap;
        }

        .kiosk-spot-guide-panel__metrics article span {
          color: #2a2520;
          font-size: 13px;
          font-weight: 900;
        }

        .kiosk-spot-guide-panel__metrics article small {
          color: rgba(42,37,32,0.58);
          font-size: 12px;
          line-height: 1.45;
        }

        .kiosk-spot-guide-panel__cards {
          display: grid;
          gap: 12px;
        }

        .kiosk-spot-guide-panel__cards article {
          display: grid;
          grid-template-columns: clamp(112px, 9vw, 156px) minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
          padding: 10px;
          border-radius: 24px;
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms ease, background 220ms ease;
        }

        .kiosk-spot-guide-panel__cards article.is-active {
          transform: translateX(-4px);
          border-color: color-mix(in srgb, var(--spot-accent) 48%, rgba(96,76,42,0.16));
          background:
            linear-gradient(135deg, var(--spot-accent-soft), rgba(255,250,238,0.82)),
            url('/image/history/paper-texture-seamless.jpg');
        }

        .kiosk-spot-guide-panel__card-image {
          position: relative;
          min-height: 118px;
          overflow: hidden;
          border-radius: 18px;
          background: rgba(42,37,32,0.08);
        }

        .kiosk-spot-guide-panel__card-image img {
          width: 100%;
          height: 100%;
          min-height: inherit;
          object-fit: cover;
          filter: saturate(0.96) contrast(0.98);
          transform: scale(1.01);
        }

        .kiosk-spot-guide-panel__card-image em {
          position: absolute;
          left: 9px;
          bottom: 9px;
          min-width: 34px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255,250,238,0.86);
          color: color-mix(in srgb, var(--spot-accent) 72%, #4c301c);
          font-style: normal;
          font-weight: 900;
          box-shadow: 0 6px 14px rgba(42,37,32,0.12);
        }

        .kiosk-spot-guide-panel__card-copy {
          min-width: 0;
          align-self: center;
          padding-right: 6px;
        }

        .kiosk-spot-guide-panel__card-copy strong,
        .kiosk-spot-guide-panel__section-title strong {
          display: block;
          margin-top: 3px;
          color: #2a2520;
          font-size: clamp(18px, 1.28vw, 23px);
          letter-spacing: 0.05em;
        }

        .kiosk-spot-guide-panel__card-copy p {
          margin: 7px 0 0;
          color: rgba(42,37,32,0.68);
          font-size: clamp(13px, 0.95vw, 15px);
          line-height: 1.64;
        }

        .kiosk-spot-guide-panel__lower {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(230px, 0.58fr);
          gap: 12px;
        }

        .kiosk-spot-guide-panel__storyline,
        .kiosk-spot-guide-panel__tips {
          padding: clamp(14px, 1.15vw, 18px);
          border-radius: 24px;
        }

        .kiosk-spot-guide-panel__storyline-list {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }

        .kiosk-spot-guide-panel__storyline-list article {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 9px 0;
          border-top: 1px dashed rgba(96,76,42,0.14);
        }

        .kiosk-spot-guide-panel__storyline-list article:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .kiosk-spot-guide-panel__storyline-list article em {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(42,37,32,0.08);
          color: rgba(42,37,32,0.52);
          font-style: normal;
          font-weight: 900;
        }

        .kiosk-spot-guide-panel__storyline-list article.is-active em {
          background: var(--spot-accent);
          color: #fffaf0;
          box-shadow: 0 0 0 5px color-mix(in srgb, var(--spot-accent) 15%, transparent);
        }

        .kiosk-spot-guide-panel__storyline-list article strong {
          display: block;
          color: #2a2520;
          font-size: 15px;
        }

        .kiosk-spot-guide-panel__storyline-list article p {
          margin: 4px 0 0;
          color: rgba(42,37,32,0.62);
          line-height: 1.56;
          font-size: 13px;
        }

        .kiosk-spot-guide-panel__tips ol {
          margin: 12px 0 0;
          padding: 0;
          display: grid;
          gap: 9px;
          list-style: none;
          color: rgba(42,37,32,0.70);
          line-height: 1.55;
          font-size: clamp(13px, 0.95vw, 15px);
        }

        .kiosk-spot-guide-panel__tips li {
          position: relative;
          padding-left: 19px;
        }

        .kiosk-spot-guide-panel__tips li::before {
          content: '';
          position: absolute;
          left: 2px;
          top: 0.68em;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--spot-accent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--spot-accent) 14%, transparent);
        }

        @keyframes kioskGuidePulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.45); opacity: 1; }
        }

        @media (max-width: 1380px) {
          .kiosk-spot-guide-panel {
            grid-template-rows: minmax(200px, 0.36fr) minmax(0, 1fr);
          }

          .kiosk-spot-guide-panel__overview,
          .kiosk-spot-guide-panel__lower {
            grid-template-columns: 1fr;
          }

          .kiosk-spot-guide-panel__metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .kiosk-spot-guide-panel__status span.is-speaking,
          .kiosk-spot-guide-panel__cards article {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default KioskSpotGuidePanel;
