import React, { useCallback, useState } from 'react';
import { AudioOutlined, DownOutlined } from '@ant-design/icons';

export interface VoiceOption {
  id: string;
  label: string;
  description: string;
}

export interface VoiceSelectorProps {
  voices?: VoiceOption[];
  value?: string;
  onChange?: (voiceId: string) => void;
}

const DEFAULT_VOICES: VoiceOption[] = [
  { id: 'mandarin', label: '普通话', description: '标准普通话' },
  { id: 'nanjinghua', label: '南京话', description: '南京方言' },
  { id: 'sichuanhua', label: '四川话', description: '四川方言' },
];

const STORAGE_KEY = 'voice_selector';

function loadVoice(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'mandarin';
  } catch {
    return 'mandarin';
  }
}

function saveVoice(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices = DEFAULT_VOICES,
  value,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(loadVoice);
  const [open, setOpen] = useState(false);
  const selected = value ?? localValue;

  const handleChange = useCallback((id: string) => {
    setLocalValue(id);
    saveVoice(id);
    onChange?.(id);
    setOpen(false);
  }, [onChange]);

  const current = voices.find((v) => v.id === selected) || voices[0];

  return (
    <div data-testid="voice-selector" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-testid="voice-selector-btn"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border-light)',
          backgroundColor: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--text-primary)',
        }}
      >
        <AudioOutlined style={{ fontSize: 14, color: 'var(--color-primary)' }} />
        <span>{current.label}</span>
        <DownOutlined style={{ fontSize: 10, color: 'var(--text-tertiary)' }} />
      </button>

      {open && (
        <div
          data-testid="voice-selector-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 140,
            backgroundColor: '#fff',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-light)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {voices.map((v) => (
            <div
              key={v.id}
              data-testid={`voice-option-${v.id}`}
              onClick={() => handleChange(v.id)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                backgroundColor: v.id === selected ? '#F0F4FF' : 'transparent',
                color: v.id === selected ? 'var(--color-primary)' : 'var(--text-primary)',
                fontWeight: v.id === selected ? 600 : 400,
              }}
            >
              {v.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceSelector;
