import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import GalgameDialog from '../../components/Galgame/GalgameDialog';
import ActBackground from '../../components/Story/ActBackground';
import ScrollLoading from '../../components/Story/ScrollLoading';
import ActControlBar from '../../components/Story/ActControlBar';
import ActSeal from '../../components/Story/ActSeal';
import StorySpotGrid from '../../components/Story/StorySpotGrid';
import { getStory, type StoryAct } from '../../api/story';
import { listSpots, type Spot } from '../../api/spots';
import { useDigitalHuman } from '../../components/tourist/DigitalHumanProvider';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';

const NAV_HEIGHT = 56;
const pageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
};
const stageStyle: React.CSSProperties = {
  position: 'absolute',
  top: NAV_HEIGHT,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
};

interface StoryChoice {
  id: string;
  name: string;
  description: string;
}

type State =
  | { status: 'idle' }
  | { status: 'loading'; spotId: string }
  | { status: 'error'; spotId: string; message: string }
  | { status: 'playing'; spotId: string; acts: StoryAct[]; index: number; replayNonce: number };

type Action =
  | { type: 'SELECT'; spotId: string }
  | { type: 'LOADED'; acts: StoryAct[] }
  | { type: 'LOAD_FAILED'; message: string }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'REPLAY' }
  | { type: 'EXIT' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT':
      return { status: 'loading', spotId: action.spotId };
    case 'LOADED':
      if (state.status !== 'loading') return state;
      return { status: 'playing', spotId: state.spotId, acts: action.acts, index: 0, replayNonce: 0 };
    case 'LOAD_FAILED':
      if (state.status !== 'loading') return state;
      return { status: 'error', spotId: state.spotId, message: action.message };
    case 'NEXT':
      if (state.status !== 'playing') return state;
      if (state.index >= state.acts.length - 1) return state;
      return { ...state, index: state.index + 1, replayNonce: state.replayNonce + 1 };
    case 'PREV':
      if (state.status !== 'playing') return state;
      if (state.index <= 0) return state;
      return { ...state, index: state.index - 1, replayNonce: state.replayNonce + 1 };
    case 'REPLAY':
      if (state.status !== 'playing') return state;
      return { ...state, replayNonce: state.replayNonce + 1 };
    case 'EXIT':
      return { status: 'idle' };
    default:
      return state;
  }
}

const StoryPage: React.FC = () => {
  const { speak, stop, setEmotion } = useDigitalHuman();
  const [state, dispatch] = useReducer(reducer, { status: 'idle' } as State);
  const [storySpots, setStorySpots] = useState<StoryChoice[]>([]);
  const autoStartedSpotRef = useRef<string | null>(null);
  const storyRequestSeqRef = useRef(0);
  const requestedSpotId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('spot') ||
        new URLSearchParams(window.location.search).get('spotId')
      : null;

  useEffect(() => {
    let cancelled = false;
    listSpots().then((spots) => {
      if (cancelled) return;
      const choices = spots
        .filter((s) => s.story_acts && s.story_acts.length > 0)
        .map((s) => ({ id: s.id, name: s.name, description: s.overview || '' }));
      setStorySpots(choices);
    }).catch((err) => {
      console.error('Failed to load story spots', err);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback(
    async (spotId: string) => {
      const requestSeq = storyRequestSeqRef.current + 1;
      storyRequestSeqRef.current = requestSeq;
      dispatch({ type: 'SELECT', spotId });
      stop();
      try {
        const result = await getStory(spotId, { timeoutMs: 10000 });
        if (storyRequestSeqRef.current !== requestSeq) return;
        if (!result.acts || result.acts.length === 0) {
          dispatch({ type: 'LOAD_FAILED', message: '暂无该景点的故事内容' });
          return;
        }
        dispatch({ type: 'LOADED', acts: result.acts });
      } catch (err: any) {
        if (storyRequestSeqRef.current !== requestSeq) return;
        const isTimeout = err?.code === 'ECONNABORTED' || String(err?.message || '').includes('timeout');
        dispatch({
          type: 'LOAD_FAILED',
          message: isTimeout ? '故事加载超时，请检查后端服务后重试' : '故事加载失败，请稍后重试',
        });
      }
    },
    [stop],
  );

  useEffect(() => {
    if (!requestedSpotId || state.status !== 'idle') return;
    if (autoStartedSpotRef.current === requestedSpotId) return;
    autoStartedSpotRef.current = requestedSpotId;
    handleSelect(requestedSpotId);
  }, [handleSelect, requestedSpotId, state.status]);

  const currentAct = state.status === 'playing' ? state.acts[state.index] : null;
  const imageUrl =
    state.status === 'playing' && currentAct?.act_image
      ? `/image/${currentAct.act_image}`
      : undefined;

  useEffect(() => {
    if (state.status !== 'playing' || !currentAct) return;

    const act = currentAct;
    const isLast = state.index >= state.acts.length - 1;
    let cancelled = false;
    let advanceTimer: number | undefined;
    let safetyTimer: number | undefined;

    setEmotion(act.emotion);

    speak(act.narration, {
      emotion: act.emotion,
      onComplete: () => {
        if (cancelled || isLast) return;
        advanceTimer = window.setTimeout(() => dispatch({ type: 'NEXT' }), 1600);
      },
      onError: () => {
        if (cancelled || isLast) return;
        advanceTimer = window.setTimeout(() => dispatch({ type: 'NEXT' }), 2000);
      },
    });

    // TTS onComplete is primary; safety only fires if it never callbacks
    // (e.g. browser audio blocked). 300ms/char ~ 3.3 char/s covers slow narration.
    const safetyMs = Math.max(act.narration.length * 300, 12000) + 8000;
    safetyTimer = window.setTimeout(() => {
      if (!cancelled && !isLast) dispatch({ type: 'NEXT' });
    }, safetyMs);

    return () => {
      cancelled = true;
      if (advanceTimer) clearTimeout(advanceTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
      stop();
    };
  }, [
    state,
    currentAct,
    speak,
    stop,
    setEmotion,
  ]);

  useEffect(() => {
    return () => {
      stop();
      setEmotion('neutral');
    };
  }, [stop, setEmotion]);

  if (state.status === 'idle') {
    return (
      <div style={{ ...pageStyle, backgroundColor: '#DDD8CE' }}>
        <div style={stageStyle}>
        <div
          style={{
            position: 'absolute', top: '7%', left: '50%', transform: 'translateX(-50%)',
            zIndex: 3, textAlign: 'center', pointerEvents: 'none',
          }}
        >
          <img
            src="/image/story/title-decor.png"
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            style={{ width: 360, height: 'auto', marginBottom: 6, opacity: 0.92 }}
          />
          <h1 style={{
            fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
            fontSize: 52, color: '#2A2520', letterSpacing: '0.2em',
            marginBottom: 10, textShadow: '0 2px 20px rgba(255,255,255,0.6)',
          }}>
            剧场
          </h1>
          <p style={{
            fontFamily: "'Noto Serif SC', serif", fontSize: 18,
            color: '#5C554C', letterSpacing: '0.1em', marginBottom: 8,
          }}>
            选择一个景点，听小景讲述它的前世今生
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontFamily: "'Noto Serif SC', serif", fontSize: 13,
            color: '#7A7068', letterSpacing: '0.22em',
          }}>
            <span style={{ width: 28, height: 1, background: 'rgba(122,112,104,0.4)' }} />
            <span>点选一卷，开启分幕剧场</span>
            <span style={{ width: 28, height: 1, background: 'rgba(122,112,104,0.4)' }} />
          </div>
        </div>
        <StorySpotGrid spots={storySpots} onSelect={handleSelect} />
        </div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div style={{ ...pageStyle, backgroundColor: '#1a1610' }}>
        <div style={stageStyle}>
        <ActBackground emotion="think" actId="loading" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <ScrollLoading label="翻开故事卷轴" />
        </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={{ ...pageStyle, backgroundColor: '#2a2030' }}>
        <div style={stageStyle}>
        <ActBackground emotion="sorry" actId="error" />
        <div
          style={{
            position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, padding: '12px 22px', background: '#FDECEA',
            border: '1px solid rgba(220, 68, 68, 0.25)', borderRadius: 12,
            color: '#DC4444', fontSize: 14,
          }}
        >
          {state.message}
        </div>
        <GalgameDialog
          speakerName="小景"
          text="这一卷故事暂未启封，不妨先去别处走走。"
          isTypingEnabled={false}
          typingSpeed={28}
          choices={[
            { id: 'back', text: '返回景点选择', onClick: () => dispatch({ type: 'EXIT' }) },
          ]}
          showChoices={true}
          disabled={false}
          isMobile={false}
          choiceLayout="list"
          compact={false}
        />
        </div>
      </div>
    );
  }

  // playing
  const act = state.acts[state.index];
  return (
    <div style={{ ...pageStyle, backgroundColor: '#1a1610' }}>
      <div style={stageStyle}>
      <ActBackground emotion={act.emotion} actId={act.id} imageUrl={imageUrl} />
      <ActSeal emotion={act.emotion} actKey={`${state.index}-${act.id}-${state.replayNonce}`} />
      <ActControlBar
        acts={state.acts}
        currentIndex={state.index}
        onReplay={() => dispatch({ type: 'REPLAY' })}
        onPrev={() => dispatch({ type: 'PREV' })}
        onNext={() => dispatch({ type: 'NEXT' })}
        onExit={() => dispatch({ type: 'EXIT' })}
      />
      <GalgameDialog
        key={`${act.id}-${state.replayNonce}`}
        speakerName="小景"
        speakerStatus="speaking"
        text={act.narration}
        isTypingEnabled={true}
        typingSpeed={28}
        disabled={false}
        isMobile={false}
        variant="zen"
      />
      </div>
    </div>
  );
};

export default StoryPage;
