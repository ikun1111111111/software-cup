import React, { useCallback, useEffect, useState } from 'react';
import { DatabaseOutlined, QuestionCircleOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons';
import DocumentUpload from '../../components/admin/DocumentUpload';
import ChunkPreview from '../../components/admin/ChunkPreview';
import FAQEditor from '../../components/admin/FAQEditor';
import type { FAQ } from '../../components/admin/FAQEditor';

interface Document {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'error';
  chunkCount: number;
  uploadTime: string;
}

const MOCK_DOCUMENTS: Document[] = [
  { id: '1', name: '灵山景区介绍.pdf', status: 'ready', chunkCount: 15, uploadTime: '2024-01-15 10:30' },
  { id: '2', name: '交通指南.docx', status: 'ready', chunkCount: 8, uploadTime: '2024-01-16 14:20' },
  { id: '3', name: '美食推荐.pdf', status: 'processing', chunkCount: 0, uploadTime: '2024-01-17 09:15' },
];

const MOCK_FAQS: FAQ[] = [
  { id: '1', question: '灵山大佛有多高？', answer: '灵山大佛高88米，是世界上最高的青铜佛像之一。', keywords: ['灵山大佛', '高度'], category: '景点' },
  { id: '2', question: '景区开放时间是什么？', answer: '景区全年开放，每天7:00-17:30。', keywords: ['开放时间'], category: '通用' },
];

const STATUS_MAP = {
  ready: { label: '就绪', bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  processing: { label: '处理中', bg: 'var(--color-warning-bg)', color: 'var(--color-accent)' },
  error: { label: '错误', bg: 'var(--color-error-bg)', color: 'var(--color-error)' },
};

const KnowledgePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'faq'>('documents');
  const [documents] = useState<Document[]>(MOCK_DOCUMENTS);
  const [faqs, setFaqs] = useState<FAQ[]>(MOCK_FAQS);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFAQEditor, setShowFAQEditor] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false);
  }, []);

  const handleDocSelect = useCallback((doc: Document) => {
    setSelectedDoc(doc);
  }, []);

  const handleTabChange = useCallback((key: 'documents' | 'faq') => {
    setActiveTab(key);
  }, []);

  const handleFAQSave = useCallback((faq: FAQ) => {
    if (faq.id) {
      setFaqs(faqs.map((f) => (f.id === faq.id ? faq : f)));
    } else {
      setFaqs([...faqs, { ...faq, id: String(Date.now()) }]);
    }
    setShowFAQEditor(false);
    setEditingFAQ(null);
  }, [faqs]);

  const handleFAQDelete = useCallback((id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
    setShowFAQEditor(false);
    setEditingFAQ(null);
  }, [faqs]);

  return (
    <div data-testid="knowledge-page" style={{
      padding: isMobile ? '16px' : '28px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <h1 style={{
        margin: '0 0 24px 0',
        fontSize: isMobile ? '18px' : '22px',
        fontWeight: 700,
        color: 'var(--text-primary)',
      }}>
        知识库管理
      </h1>

      {/* Tab Bar */}
      <div data-testid="tab-bar" className="scroll-tags" style={{
        marginBottom: '20px',
        backgroundColor: 'var(--gray-100)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: 'fit-content',
        overflowX: 'auto',
      }}>
        {[
          { key: 'documents' as const, label: '文档管理', icon: <DatabaseOutlined /> },
          { key: 'faq' as const, label: 'FAQ管理', icon: <QuestionCircleOutlined /> },
        ].map((tab) => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => handleTabChange(tab.key)}
            style={{
              padding: '8px 20px',
              backgroundColor: activeTab === tab.key ? 'var(--surface-card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 200ms',
              boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'documents' && (
        <div data-testid="documents-panel">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '16px',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              文档列表
            </span>
            <button
              data-testid="upload-btn"
              onClick={() => setShowUpload(!showUpload)}
              style={{
                padding: '8px 18px',
                backgroundColor: showUpload ? 'var(--gray-100)' : 'var(--color-primary)',
                color: showUpload ? 'var(--text-secondary)' : '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 200ms',
              }}
            >
              {showUpload ? '关闭上传' : <><UploadOutlined /> 上传文档</>}
            </button>
          </div>

          {showUpload && (
            <div data-testid="upload-area" style={{ marginBottom: '20px' }}>
              <DocumentUpload onSuccess={handleUploadSuccess} />
            </div>
          )}

          <div data-testid="doc-list">
            {documents.map((doc) => {
              const status = STATUS_MAP[doc.status];
              return (
                <div
                  key={doc.id}
                  data-testid={`doc-${doc.id}`}
                  onClick={() => handleDocSelect(doc)}
                  className="card-hover"
                  style={{
                    padding: '14px 16px',
                    border: selectedDoc?.id === doc.id
                      ? '1.5px solid var(--color-primary)'
                      : '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    backgroundColor: selectedDoc?.id === doc.id
                      ? 'var(--color-primary-bg)'
                      : 'var(--surface-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}>
                      {doc.name}
                    </span>
                    <span className="badge" style={{
                      backgroundColor: status.bg,
                      color: status.color,
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginTop: '6px',
                  }}>
                    分块数: {doc.chunkCount} | 上传时间: {doc.uploadTime}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDoc && (
            <div data-testid="chunk-preview-area" style={{ marginTop: '20px' }}>
              <h3 style={{
                margin: '0 0 14px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                分块预览 - {selectedDoc.name}
              </h3>
              <ChunkPreview docId={selectedDoc.id} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'faq' && (
        <div data-testid="faq-panel">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '16px',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              FAQ列表 ({faqs.length})
            </span>
            <button
              data-testid="add-faq-btn"
              onClick={() => { setShowFAQEditor(true); setEditingFAQ(null); }}
              style={{
                padding: '8px 18px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 200ms',
              }}
            >
              <PlusOutlined /> 新建FAQ
            </button>
          </div>

          {showFAQEditor && (
            <div data-testid="faq-editor-area" style={{ marginBottom: '20px' }}>
              <FAQEditor
                faq={editingFAQ || undefined}
                onSave={handleFAQSave}
                onDelete={editingFAQ ? handleFAQDelete : undefined}
                onCancel={() => { setShowFAQEditor(false); setEditingFAQ(null); }}
              />
            </div>
          )}

          <div data-testid="faq-list">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                data-testid={`faq-${faq.id}`}
                onClick={() => { setEditingFAQ(faq); setShowFAQEditor(true); }}
                className="card-hover"
                style={{
                  padding: '14px 16px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--surface-card)',
                }}
              >
                <div style={{
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}>
                  {faq.question}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}>
                  {faq.answer}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  marginTop: '8px',
                  display: 'flex',
                  gap: '12px',
                }}>
                  <span>分类: {faq.category}</span>
                  <span>关键词: {faq.keywords.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgePage;
