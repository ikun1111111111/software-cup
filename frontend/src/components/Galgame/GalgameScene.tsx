import React from 'react';
import DigitalHuman from '../DigitalHuman/DigitalHuman';
import ChatInkBackground from '../Chat/ChatInkBackground';
import type { Emotion } from '../DigitalHuman/EmotionController';
import type { PhonemeTimestamp } from '../../api/tts';

const EMOTION_AMBIENCE: Record<string, string> = {
  smile: 'linear-gradient(135deg, rgba(200,168,81,0.3) 0%, rgba(247,245,240,0) 60%)',
  think: 'linear-gradient(135deg, rgba(106,156,137,0.2) 0%, rgba(200,220,240,0.1) 60%)',
  sorry: 'linear-gradient(135deg, rgba(160,160,170,0.2) 0%, rgba(237,233,226,0.1) 60%)',
  surprise: 'linear-gradient(135deg, rgba(212,165,165,0.25) 0%, rgba(247,245,240,0) 60%)',
  neutral: 'transparent',
};

interface GalgameSceneProps {
  emotion?: Emotion;
  cssFilter?: string;
  isSpeaking?: boolean;
  audioChunks?: string[];
  phonemes?: PhonemeTimestamp[] | null;
  characterName?: string;
  characterStatus?: string;
  onReady?: () => void;
  isMobile?: boolean;
  /** Horizontal offset for character positioning (e.g. '18%' shifts left from center). */
  characterLeft?: string;
  /** Bottom offset for character positioning. */
  characterBottom?: string;
  /** Live2D head angle in degrees. */
  headAngleX?: number;
  /** Scale multiplier for the Live2D character. */
  characterScale?: number;
  /** Hide background layers (for history travel mode where era background replaces modern bg). */
  hideBackground?: boolean;
  /** Scene visual variant. */
  variant?: 'modern' | 'minimal' | 'zen';
  onAudioEnded?: () => void;
  onError?: (message: string) => void;
}

const GalgameScene: React.FC<GalgameSceneProps> = ({
  emotion = 'neutral',
  cssFilter,
  isSpeaking = false,
  audioChunks,
  phonemes,
  characterName = '小景',
  characterStatus = '在线',
  onReady,
  isMobile = false,
  characterLeft = '50%',
  characterBottom,
  headAngleX,
  characterScale = 1,
  hideBackground = false,
  variant = 'modern',
  onAudioEnded,
  onError,
}) => {
  const bgOpacity = hideBackground ? 0 : 1;
  const isMinimal = variant === 'minimal';
  const isZen = variant === 'zen';
  const effectiveScale = isZen ? characterScale * 0.92 : characterScale;
  const dhWidth = isMobile ? 260 : Math.round(480 * effectiveScale);
  const dhHeight = isMobile ? 340 : Math.round(620 * effectiveScale);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      {!isMinimal && !isZen && (
        <>
          {/* 天空/纸色背景 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 0%, #F8F4EA 0%, #F0E8D8 55%, #E8E0D0 100%)',
              zIndex: 0,
              opacity: bgOpacity,
            }}
          />

          {/* 远景山峦 */}
          <div
            className="mountain-far"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/image/bg-mountain-far.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              opacity: bgOpacity * 0.55,
              zIndex: 1,
              filter: 'blur(0.5px)',
            }}
          />

          {/* 云雾层（宽图循环飘动） */}
          <div
            className="cloud-drift"
            style={{
              position: 'absolute',
              top: '22%',
              left: 0,
              width: '100%',
              height: '34%',
              backgroundImage: "url('/image/bg-cloud-layer-wide.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'left center',
              backgroundRepeat: 'repeat-x',
              opacity: bgOpacity * 0.38,
              zIndex: 2,
              filter: 'blur(1.5px)',
            }}
          />

          {/* 中景山体 */}
          <div
            className="mountain-mid"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/image/bg-mountain-mid.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              opacity: bgOpacity * 0.75,
              zIndex: 3,
            }}
          />

          {/* 水波倒影 */}
          <div
            className="water-ripple"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '20%',
              backgroundImage: "url('/image/bg-water-ripple.png')",
              backgroundSize: '100% 100%',
              backgroundPosition: 'center bottom',
              backgroundRepeat: 'repeat-x',
              opacity: bgOpacity * 0.42,
              zIndex: 4,
              mixBlendMode: 'normal',
            }}
          />

          {/* 水面反光遮罩 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '26%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(74,155,142,0.12) 30%, rgba(247,245,240,0.45) 70%, rgba(247,245,240,0.65) 100%)',
              zIndex: 5,
              opacity: bgOpacity,
              pointerEvents: 'none',
            }}
          />

          {/* 左侧近景柳枝莲荷 */}
          <div
            style={{
              position: 'absolute',
              bottom: '-6%',
              left: 0,
              width: '34%',
              height: '58%',
              backgroundImage: "url('/image/bg-foreground-left.png')",
              backgroundSize: 'contain',
              backgroundPosition: 'left bottom',
              backgroundRepeat: 'no-repeat',
              opacity: bgOpacity * 0.72,
              zIndex: 6,
            }}
          />

          {/* 右侧近景青铜香炉 */}
          <div
            style={{
              position: 'absolute',
              bottom: '-10%',
              right: '-4%',
              width: '22%',
              height: '28%',
              backgroundImage: "url('/image/bg-foreground-right.png')",
              backgroundSize: 'contain',
              backgroundPosition: 'right bottom',
              backgroundRepeat: 'no-repeat',
              opacity: bgOpacity * 0.58,
              zIndex: 6,
            }}
          />

          {/* 全局宣纸纹理 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: hideBackground ? 0 : 0.03,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
              pointerEvents: 'none',
              zIndex: 7,
            }}
          />

          {/* 顶部柔光 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255,248,230,0.45) 0%, transparent 50%)',
              zIndex: 8,
              opacity: bgOpacity,
              pointerEvents: 'none',
            }}
          />

          {/* 全局暗角 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 55%, rgba(42,37,32,0.12) 100%)',
              pointerEvents: 'none',
              zIndex: 8,
              opacity: bgOpacity,
            }}
          />

          {/* 底部暗角 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '32%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(42,37,32,0.04) 40%, rgba(42,37,32,0.16) 100%)',
              pointerEvents: 'none',
              zIndex: 8,
              opacity: bgOpacity,
            }}
          />
        </>
      )}

      {isZen && (
        <>
          {!hideBackground && <ChatInkBackground />}

          {/* 禅意纸色背景 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 30%, #FDFBF7 0%, #F7F5F0 60%, #EDE9E2 100%)',
              zIndex: 0,
              opacity: bgOpacity,
            }}
          />

          {/* 宣纸纹理 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: hideBackground ? 0 : 0.04,
              backgroundImage: 'var(--texture-paper)',
              backgroundSize: '100px 100px',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* 情绪氛围色温层 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: EMOTION_AMBIENCE[emotion || 'neutral'],
              opacity: hideBackground ? 0 : 0.15,
              transition: 'background 1.2s ease',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* 淡墨远山轮廓 */}
          <div
            className="zen-mountain"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/image/bg-mountain-clean.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              backgroundRepeat: 'no-repeat',
              opacity: hideBackground ? 0 : 0.22,
              filter: 'blur(1px) saturate(0.8)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* 底部薄雾 */}
          <div
            className="zen-mist"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '22%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(247,245,240,0.4) 40%, rgba(237,233,226,0.72) 100%)',
              pointerEvents: 'none',
              zIndex: 2,
              opacity: hideBackground ? 0 : 0.6,
            }}
          />
        </>
      )}

      {/* 角色容器 */}
      <div
        className="animate-character-enter"
        style={{
          position: 'absolute',
          bottom: characterBottom ?? (isMobile ? '14%' : '10%'),
          left: characterLeft,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 9,
          transition: 'left 600ms cubic-bezier(0.22, 1, 0.36, 1), bottom 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease',
          opacity: 1,
        }}
      >
        {/* 人物边缘柔光 —— 让数字人从背景中浮现 */}
        <div
          style={{
            position: 'absolute',
            inset: '-8%',
            background: 'radial-gradient(ellipse at 50% 55%, rgba(245,230,163,0.22) 0%, rgba(255,255,255,0.1) 35%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: -1,
            animation: 'characterGlow 4s ease-in-out infinite alternate',
          }}
        />
        <div
          style={{
            filter: 'drop-shadow(0 24px 48px rgba(42, 37, 32, 0.18))',
          }}
        >
          <DigitalHuman
            emotion={emotion}
            cssFilter={cssFilter}
            isSpeaking={isSpeaking}
            audioChunks={audioChunks}
            phonemes={phonemes}
            width={dhWidth}
            height={dhHeight}
            onReady={onReady}
            transparentBg
            headAngleX={headAngleX}
            onAudioEnded={onAudioEnded}
            onError={onError}
          />
        </div>
      </div>

      {!isZen && (
        <div
          style={{
            position: 'absolute',
            bottom: isMobile ? '10%' : '6%',
            left: characterLeft,
            transform: 'translateX(-50%)',
            width: isMobile ? 180 : 300,
            height: isMobile ? 32 : 44,
            pointerEvents: 'none',
            zIndex: 9,
            opacity: hideBackground ? 0 : 1,
            transition: 'opacity 400ms ease, left 600ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: isSpeaking
                ? 'radial-gradient(ellipse at center, rgba(200,75,49,0.2) 0%, rgba(200,75,49,0.06) 40%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(26,95,180,0.15) 0%, rgba(26,95,180,0.05) 40%, transparent 70%)',
              animation: isSpeaking
                ? 'holoSpeak 1.5s ease-in-out infinite'
                : 'holoPulse 3s ease-in-out infinite',
              transition: 'background 500ms ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              left: '15%',
              right: '15%',
              height: 2,
              borderRadius: 1,
              background: isSpeaking
                ? 'linear-gradient(90deg, transparent, rgba(200,75,49,0.45), rgba(232,93,58,0.65), rgba(200,75,49,0.45), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(26,95,180,0.35), rgba(53,132,228,0.55), rgba(26,95,180,0.35), transparent)',
              transition: 'background 500ms ease',
            }}
          />
          {isSpeaking && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '130%',
                height: '130%',
                borderRadius: '50%',
                border: '1px solid rgba(200,75,49,0.18)',
                animation: 'holoRipple 2s ease-out infinite',
              }}
            />
          )}
        </div>
      )}

      {!isZen && (
        <div
          className="animate-character-enter"
          style={{
            position: 'absolute',
            bottom: isMobile ? '6%' : '4%',
            left: isMobile ? '4%' : '5%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 16px',
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(12px) saturate(130%)',
            WebkitBackdropFilter: 'blur(12px) saturate(130%)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 4px 16px rgba(42, 37, 32, 0.08)',
            zIndex: 10,
            opacity: hideBackground ? 0 : 1,
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isSpeaking ? '#2D8B57' : '#A8A198',
              boxShadow: isSpeaking ? '0 0 10px rgba(45, 139, 87, 0.6)' : 'none',
              transition: 'all 400ms ease',
            }}
          />
          <span
            style={{
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600,
              color: '#2A2520',
              letterSpacing: '0.5px',
            }}
          >
            {characterName}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(42, 37, 32, 0.5)',
            }}
          >
            {isSpeaking ? '正在讲解...' : characterStatus}
          </span>
        </div>
      )}

      <style>{`
        @keyframes mountainDriftFar {
          0%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(-16px) scale(1.01); }
        }
        @keyframes mountainDriftMid {
          0%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(28px) scale(1.015); }
        }
        @keyframes cloudDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-320px); }
        }
        @keyframes waterShimmer {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.28; }
          50% { transform: scaleY(1.03) translateY(-2px); opacity: 0.42; }
        }
        .water-ripple {
          animation: waterShimmer 7s ease-in-out infinite;
        }
        @keyframes holoPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes holoSpeak {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes holoRipple {
          0% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.9); }
        }
        .animate-character-enter {
          animation: charEnter 600ms ease-out 200ms both;
        }
        @keyframes charEnter {
          from { opacity: 0; transform: translateX(-50%) translateY(30px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .mountain-far {
          animation: mountainDriftFar 50s ease-in-out infinite alternate;
        }
        .mountain-mid {
          animation: mountainDriftMid 38s ease-in-out infinite alternate;
        }
        .cloud-drift {
          animation: cloudDrift 32s linear infinite;
        }
        @keyframes characterGlow {
          0% { opacity: 0.7; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes zenMistDrift {
          0%, 100% { opacity: 0.35; transform: translateY(0); }
          50% { opacity: 0.55; transform: translateY(-8px); }
        }
        .zen-mist {
          animation: zenMistDrift 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default GalgameScene;
