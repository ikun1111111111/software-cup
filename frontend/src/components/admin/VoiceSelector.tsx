import React, { useCallback, useState } from 'react';
import { SoundOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { message } from 'antd';

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  previewUrl: string;
}

export interface VoiceSelectorProps {
  voices?: Voice[];
  selected?: string;
  onChange?: (voiceId: string) => void;
  onPreview?: (voiceId: string) => void;
  previewVoice?: (voiceId: string) => Promise<string>;
}

const MOCK_VOICES: Voice[] = [
  { id: 'voice-1', name: '甜美女声', language: '中文', gender: '女', previewUrl: '' },
  { id: 'voice-2', name: '沉稳男声', language: '中文', gender: '男', previewUrl: '' },
  { id: 'voice-3', name: '活泼女声', language: '中文', gender: '女', previewUrl: '' },
  { id: 'voice-4', name: '磁性男声', language: '英文', gender: '男', previewUrl: '' },
];

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices: propVoices,
  selected,
  onChange,
  onPreview,
  previewVoice,
}) => {
  const voices = propVoices || MOCK_VOICES;
  const [playing, setPlaying] = useState<string | null>(null);

  const handleVoiceSelect = useCallback((voiceId: string) => {
    onChange?.(voiceId);
  }, [onChange]);

  const handlePreview = useCallback(async (voiceId: string) => {
    setPlaying(voiceId);
    onPreview?.(voiceId);

    if (previewVoice) {
      try {
        const url = await previewVoice(voiceId);
        const audio = new Audio(url);
        audio.onended = () => {
          setPlaying(null);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setPlaying(null);
          URL.revokeObjectURL(url);
          message.error('音频播放失败');
        };
        await audio.play();
      } catch (err: any) {
        setPlaying(null);
        message.error('试听失败: ' + (err?.message || '未知错误'));
      }
    } else {
      setTimeout(() => {
        setPlaying(null);
      }, 2000);
    }
  }, [onPreview, previewVoice]);

  const renderVoiceItem = useCallback((voice: Voice) => {
    const isSelected = selected === voice.id;
    const isPlaying = playing === voice.id;

    return (
      <div
        key={voice.id}
        data-testid={`voice-${voice.id}`}
        onClick={() => handleVoiceSelect(voice.id)}
        style={{
          padding: '14px 16px',
          border: isSelected ? '1.5px solid #1A5FB4' : '1px solid #E8E5DF',
          borderRadius: '10px',
          marginBottom: '8px',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#E8F0FE' : '#FFFFFF',
          transition: 'all 200ms',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SoundOutlined style={{ color: isSelected ? '#1A5FB4' : '#A8A198' }} />
            <div>
              <span style={{ fontWeight: 600, color: '#1A1614', fontSize: '14px' }}>{voice.name}</span>
              <span style={{ marginLeft: '10px', fontSize: '12px', color: '#A8A198' }}>
                {voice.language} | {voice.gender}
              </span>
            </div>
          </div>
          <button
            data-testid={`preview-${voice.id}`}
            onClick={(e) => {
              e.stopPropagation();
              handlePreview(voice.id);
            }}
            disabled={isPlaying}
            style={{
              padding: '5px 14px',
              backgroundColor: isPlaying ? '#D4D0C8' : '#E6F7ED',
              color: isPlaying ? '#fff' : '#2D8B57',
              border: 'none',
              borderRadius: '20px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <PlayCircleOutlined />
            {isPlaying ? '播放中...' : '试听'}
          </button>
        </div>
      </div>
    );
  }, [selected, playing, handleVoiceSelect, handlePreview]);

  return (
    <div data-testid="voice-selector" style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 600, color: '#1A1614' }}>声音选择</h3>
      <div data-testid="voice-list">
        {voices.map(renderVoiceItem)}
      </div>
    </div>
  );
};

export default VoiceSelector;
