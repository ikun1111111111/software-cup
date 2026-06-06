import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioOutlined, PauseOutlined, SettingOutlined } from '@ant-design/icons';
import { useVoiceRecord } from '../../hooks/useVoiceRecord';

const STORAGE_KEY = 'voice_preferences';

interface VoicePreferences {
  speed: number;
}

function loadPreferences(): VoicePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { speed: 1.0 };
}

function savePreferences(prefs: VoicePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export interface VoiceInputProps {
  onSend: (audioBlob: Blob) => void;
  /** Called when ASR produces a partial transcript. */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** Called when user starts speaking (for interrupt). */
  onInterrupt?: () => void;
  /** Playback speed for TTS (0.5–2.0). */
  speed?: number;
  /** Called when speed changes. */
  onSpeedChange?: (speed: number) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onSend,
  onTranscript,
  onInterrupt,
  speed: speedProp,
  onSpeedChange,
}) => {
  const { startRecording, stopRecording, getAudioBlob, isRecording, error } = useVoiceRecord();
  const [isPressed, setIsPressed] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(() => loadPreferences().speed);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const speed = speedProp ?? localSpeed;

  // Persist speed preference
  useEffect(() => {
    savePreferences({ speed });
  }, [speed]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setLocalSpeed(newSpeed);
    onSpeedChange?.(newSpeed);
  }, [onSpeedChange]);

  const handleStart = useCallback(async () => {
    setIsPressed(true);
    isLongPressRef.current = false;
    setTranscript('');

    // Fire interrupt when user starts speaking
    onInterrupt?.();

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRecording();
    }, 300);
  }, [startRecording, onInterrupt]);

  const handleEnd = useCallback(() => {
    setIsPressed(false);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressRef.current && isRecording) {
      stopRecording();
      const audioBlob = getAudioBlob();
      if (audioBlob) {
        onSend(audioBlob);
        onTranscript?.(transcript, true);
      }
    }

    isLongPressRef.current = false;
  }, [isRecording, stopRecording, getAudioBlob, onSend, onTranscript, transcript]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart();
  }, [handleStart]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleStart();
  }, [handleStart]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  return (
    <div data-testid="voice-input" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Settings toggle */}
        <button
          data-testid="voice-settings-btn"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="语音设置"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            backgroundColor: showSettings ? '#F0F4FF' : 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          <SettingOutlined />
        </button>

        {/* Main voice button */}
        <button
          data-testid="voice-button"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={isRecording ? 'animate-pulse-ring' : undefined}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isRecording
              ? 'var(--color-error)'
              : isPressed
                ? 'var(--color-primary-light)'
                : 'var(--color-primary)',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 200ms',
            flexShrink: 0,
          }}
        >
          {isRecording ? <PauseOutlined /> : <AudioOutlined />}
        </button>
      </div>

      {/* Speed slider (shown when settings open) */}
      {showSettings && (
        <div data-testid="speed-control" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          backgroundColor: '#F8F6F2',
          borderRadius: 8,
          fontSize: 11,
        }}>
          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>语速</span>
          <input
            data-testid="speed-slider"
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            style={{ width: 80, accentColor: 'var(--color-primary)' }}
          />
          <span data-testid="speed-value" style={{ color: 'var(--color-primary)', fontWeight: 600, minWidth: 28 }}>
            {speed.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Real-time transcript display */}
      {isRecording && transcript && (
        <div data-testid="transcript-display" style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          maxWidth: 200,
          textAlign: 'center',
          padding: '2px 8px',
          backgroundColor: '#F0F4FF',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {transcript}
        </div>
      )}

      {isRecording && (
        <div data-testid="recording-indicator" style={{
          color: 'var(--color-error)',
          fontSize: '11px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          录音中...
        </div>
      )}
      {error && (
        <div data-testid="voice-error" style={{
          color: 'var(--color-error)',
          fontSize: '11px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
