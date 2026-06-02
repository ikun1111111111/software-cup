import React, { useCallback, useState } from 'react';
import { DeleteOutlined, SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';

export interface FAQ {
  id?: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
}

export interface FAQEditorProps {
  faq?: FAQ;
  onSave?: (faq: FAQ) => void;
  onDelete?: (id: string) => void;
  onCancel?: () => void;
}

const CATEGORIES = ['通用', '景点', '交通', '餐饮', '住宿', '购物'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E8E5DF',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#1A1614',
  backgroundColor: '#FFFFFF',
  transition: 'border-color 200ms',
  outline: 'none',
  fontFamily: 'inherit',
};

const FAQEditor: React.FC<FAQEditorProps> = ({
  faq,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [keywords, setKeywords] = useState<string[]>(faq?.keywords || []);
  const [category, setCategory] = useState(faq?.category || '通用');
  const [newKeyword, setNewKeyword] = useState('');

  const handleSave = useCallback(() => {
    if (!question.trim()) return;

    onSave?.({
      id: faq?.id,
      question: question.trim(),
      answer: answer.trim(),
      keywords,
      category,
    });
  }, [question, answer, keywords, category, faq?.id, onSave]);

  const handleDelete = useCallback(() => {
    if (faq?.id) {
      onDelete?.(faq.id);
    }
  }, [faq?.id, onDelete]);

  const addKeyword = useCallback(() => {
    const keyword = newKeyword.trim();
    if (keyword && !keywords.includes(keyword)) {
      setKeywords([...keywords, keyword]);
      setNewKeyword('');
    }
  }, [newKeyword, keywords]);

  const removeKeyword = useCallback((keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  }, [keywords]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addKeyword();
    }
  }, [addKeyword]);

  return (
    <div data-testid="faq-editor" style={{
      padding: '20px',
      border: '1px solid #E8E5DF',
      borderRadius: '14px',
      backgroundColor: '#FFFFFF',
      boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
    }}>
      <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 600, color: '#1A1614' }}>
        {faq?.id ? '编辑FAQ' : '新建FAQ'}
      </h3>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>问题</label>
        <input
          data-testid="question-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入问题"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>答案</label>
        <textarea
          data-testid="answer-input"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="输入答案"
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>分类</label>
        <select
          data-testid="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>关键词</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            data-testid="keyword-input"
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加关键词"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            data-testid="add-keyword-btn"
            onClick={addKeyword}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1A5FB4',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <PlusOutlined /> 添加
          </button>
        </div>
        <div data-testid="keywords-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {keywords.map((keyword) => (
            <span
              key={keyword}
              data-testid={`keyword-${keyword}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                backgroundColor: '#E8F0FE',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#1A5FB4',
                fontWeight: 500,
              }}
            >
              {keyword}
              <span
                onClick={() => removeKeyword(keyword)}
                style={{
                  marginLeft: '6px',
                  cursor: 'pointer',
                  color: '#A8A198',
                  fontSize: '14px',
                }}
              >
                ×
              </span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {faq?.id && onDelete && (
          <button
            data-testid="delete-btn"
            onClick={handleDelete}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FDECEA',
              color: '#DC4444',
              border: '1px solid rgba(220, 68, 68, 0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <DeleteOutlined /> 删除
          </button>
        )}
        {onCancel && (
          <button
            data-testid="cancel-btn"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F5F3EF',
              border: '1px solid #E8E5DF',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: '#5C554C',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CloseOutlined /> 取消
          </button>
        )}
        <button
          data-testid="save-btn"
          onClick={handleSave}
          disabled={!question.trim()}
          style={{
            padding: '8px 18px',
            backgroundColor: question.trim() ? '#1A5FB4' : '#D4D0C8',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: question.trim() ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 200ms',
          }}
        >
          <SaveOutlined /> 保存
        </button>
      </div>
    </div>
  );
};

export default FAQEditor;
