import React, { useCallback, useState } from 'react';
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';

export interface WelcomeEditorProps {
  welcome?: string;
  onChange?: (text: string) => void;
  onPreview?: (text: string) => void;
  onSave?: (text: string) => void;
}

const MAX_LENGTH = 500;

const WelcomeEditor: React.FC<WelcomeEditorProps> = ({
  welcome: propWelcome,
  onChange,
  onPreview,
  onSave,
}) => {
  const [text, setText] = useState(propWelcome || '');
  const [previewing, setPreviewing] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= MAX_LENGTH) {
      setText(newText);
      onChange?.(newText);
    }
  }, [onChange]);

  const handlePreview = useCallback(() => {
    if (!text.trim()) return;
    setPreviewing(true);
    onPreview?.(text);

    // 模拟预览结束
    setTimeout(() => {
      setPreviewing(false);
    }, 3000);
  }, [text, onPreview]);

  const handleSave = useCallback(() => {
    if (!text.trim()) return;
    onSave?.(text);
  }, [text, onSave]);

  return (
    <div data-testid="welcome-editor" style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 600, color: '#1A1614' }}>欢迎语编辑</h3>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>
          欢迎语文本
        </label>
        <textarea
          data-testid="welcome-input"
          value={text}
          onChange={handleChange}
          placeholder="输入欢迎语..."
          rows={6}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #E8E5DF',
            borderRadius: '10px',
            resize: 'vertical',
            fontSize: '14px',
            color: '#1A1614',
            backgroundColor: '#FFFFFF',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.6,
          }}
        />
        <div data-testid="char-count" style={{ textAlign: 'right', fontSize: '12px', color: '#A8A198', marginTop: '4px' }}>
          {text.length}/{MAX_LENGTH}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          data-testid="preview-btn"
          onClick={handlePreview}
          disabled={!text.trim() || previewing}
          style={{
            padding: '8px 16px',
            backgroundColor: text.trim() && !previewing ? '#E6F7ED' : '#F5F3EF',
            color: text.trim() && !previewing ? '#2D8B57' : '#D4D0C8',
            border: 'none',
            borderRadius: '8px',
            cursor: text.trim() && !previewing ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <PlayCircleOutlined />
          {previewing ? '预览中...' : '预览'}
        </button>
        <button
          data-testid="save-btn"
          onClick={handleSave}
          disabled={!text.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: text.trim() ? '#1A5FB4' : '#D4D0C8',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <SaveOutlined />
          保存
        </button>
      </div>
    </div>
  );
};

export default WelcomeEditor;
