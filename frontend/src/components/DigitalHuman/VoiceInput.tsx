import React, { useCallback, useRef, useState } from 'react';
import { AudioOutlined, PauseOutlined } from '@ant-design/icons';
import { useVoiceRecord } from '../../hooks/useVoiceRecord';

export interface VoiceInputProps {
  onSend: (audioBlob: Blob) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onSend }) => {
  const { startRecording, stopRecording, getAudioBlob, isRecording, error } = useVoiceRecord();
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleStart = useCallback(async () => {
    setIsPressed(true);
    isLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRecording();
    }, 300);
  }, [startRecording]);

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
      }
    }

    isLongPressRef.current = false;
  }, [isRecording, stopRecording, getAudioBlob, onSend]);

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
    <div data-testid="voice-input" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
      {isRecording && (
        <div data-testid="recording-indicator" style={{
          color: 'var(--color-error)',
          fontSize: '11px',
          marginTop: '4px',
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
          marginTop: '4px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
