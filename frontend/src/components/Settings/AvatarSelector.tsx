import React, { useCallback, useState } from 'react';
import { UserOutlined, DownOutlined } from '@ant-design/icons';

export interface AvatarSkin {
  id: string;
  label: string;
  preview?: string;
}

export interface AvatarSelectorProps {
  skins?: AvatarSkin[];
  value?: string;
  onChange?: (skinId: string) => void;
}

const DEFAULT_SKINS: AvatarSkin[] = [
  { id: 'classic', label: '古风' },
  { id: 'modern', label: '现代' },
  { id: 'cartoon', label: '卡通' },
];

const STORAGE_KEY = 'avatar_skin';

function loadSkin(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'classic';
  } catch {
    return 'classic';
  }
}

function saveSkin(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  skins = DEFAULT_SKINS,
  value,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(loadSkin);
  const [open, setOpen] = useState(false);
  const selected = value ?? localValue;

  const handleChange = useCallback((id: string) => {
    setLocalValue(id);
    saveSkin(id);
    onChange?.(id);
    setOpen(false);
  }, [onChange]);

  const current = skins.find((s) => s.id === selected) || skins[0];

  return (
    <div data-testid="avatar-selector" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-testid="avatar-selector-btn"
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
        <UserOutlined style={{ fontSize: 14, color: 'var(--color-primary)' }} />
        <span>{current.label}</span>
        <DownOutlined style={{ fontSize: 10, color: 'var(--text-tertiary)' }} />
      </button>

      {open && (
        <div
          data-testid="avatar-selector-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 120,
            backgroundColor: '#fff',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-light)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {skins.map((s) => (
            <div
              key={s.id}
              data-testid={`avatar-option-${s.id}`}
              onClick={() => handleChange(s.id)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                backgroundColor: s.id === selected ? '#F0F4FF' : 'transparent',
                color: s.id === selected ? 'var(--color-primary)' : 'var(--text-primary)',
                fontWeight: s.id === selected ? 600 : 400,
              }}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvatarSelector;
