import React, { useCallback, useEffect, useState } from 'react';
import { DatabaseOutlined, QuestionCircleOutlined, UploadOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import DocumentUpload from '../../components/admin/DocumentUpload';
import ChunkPreview from '../../components/admin/ChunkPreview';
import FAQEditor from '../../components/admin/FAQEditor';
import GlassCard from '../../components/admin/GlassCard';
import PageTransition from '../../components/admin/PageTransition';
import type { FAQ } from '../../components/admin/FAQEditor';
import {
  getDocs,
  getFAQs,
  createDoc,
  deleteDoc,
  reindexDoc,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  type UploadResult,
} from '../../api/knowledge';
import { message, Modal } from 'antd';

interface Document {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'error';
  chunkCount: number;
  uploadTime: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  ready: { label: '就绪', bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  processing: { label: '处理中', bg: 'var(--color-warning-bg)', color: 'var(--color-accent)' },
  error: { label: '错误', bg: 'var(--color-error-bg)', color: 'var(--color-error)' },
};

const backendStatusToLocal = (s: string): Document['status'] => {
  switch (s) {
    case 'indexed':
      return 'ready';
    case 'pending':
    case 'indexing':
      return 'processing';
    case 'failed':
      return 'error';
    default:
      return 'processing';
  }
};

const KnowledgePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'faq'>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFAQEditor, setShowFAQEditor] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const isMobile = false; // web-only

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await getDocs({ page: 1, pageSize: 100 });
      setDocuments(
        res.data.map((d) => ({
          id: d.id,
          name: d.name,
          status: backendStatusToLocal(d.status),
          chunkCount: d.chunkCount,
          uploadTime: d.createdAt,
        }))
      );
    } catch (err: any) {
      message.error('加载文档失败: ' + (err?.message || '未知错误'));
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const loadFAQs = useCallback(async () => {
    setLoadingFaqs(true);
    try {
      const res = await getFAQs({ page: 1, pageSize: 100 });
      setFaqs(res.data);
    } catch (err: any) {
      message.error('加载FAQ失败: ' + (err?.message || '未知错误'));
    } finally {
      setLoadingFaqs(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadFAQs();
  }, [loadDocuments, loadFAQs]);

  const handleUploadSuccess = useCallback(
    async (result: UploadResult) => {
      try {
        message.loading({ content: '正在创建文档索引...', key: 'upload_doc' });
        await createDoc({
          title: result.filename,
          file_type: result.file_type,
          file_path: result.file_path,
        });
        message.success({ content: '文档上传成功', key: 'upload_doc' });
        setShowUpload(false);
        loadDocuments();
      } catch (err: any) {
        message.error({ content: '创建文档失败: ' + (err?.message || '未知错误'), key: 'upload_doc' });
      }
    },
    [loadDocuments]
  );

  const handleUploadError = useCallback((error: string) => {
    message.error('上传失败: ' + error);
  }, []);

  const handleDocSelect = useCallback((doc: Document) => {
    setSelectedDoc(doc);
  }, []);

  const handleDocDelete = useCallback(
    async (doc: Document, e: React.MouseEvent) => {
      e.stopPropagation();
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除文档「${doc.name}」吗？此操作将同时删除该文档的所有分块和向量索引。`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        async onOk() {
          try {
            await deleteDoc(doc.id);
            message.success('文档已删除');
            setSelectedDoc((prev) => (prev?.id === doc.id ? null : prev));
            loadDocuments();
          } catch (err: any) {
            message.error('删除失败: ' + (err?.message || '未知错误'));
          }
        },
      });
    },
    [loadDocuments]
  );

  const handleDocReindex = useCallback(
    async (doc: Document, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        message.loading({ content: '正在重新索引...', key: 'reindex' });
        await reindexDoc(doc.id);
        message.success({ content: '重新索引完成', key: 'reindex' });
        loadDocuments();
      } catch (err: any) {
        message.error({ content: '重新索引失败: ' + (err?.message || '未知错误'), key: 'reindex' });
      }
    },
    [loadDocuments]
  );

  const handleTabChange = useCallback((key: 'documents' | 'faq') => {
    setActiveTab(key);
  }, []);

  const handleFAQSave = useCallback(
    async (faq: FAQ) => {
      try {
        if (faq.id) {
          await updateFAQ(faq.id, {
            question: faq.question,
            answer: faq.answer,
            keywords: faq.keywords,
            category: faq.category,
          });
          message.success('FAQ已更新');
        } else {
          await createFAQ({
            question: faq.question,
            answer: faq.answer,
            keywords: faq.keywords,
            category: faq.category,
          });
          message.success('FAQ已创建');
        }
        setShowFAQEditor(false);
        setEditingFAQ(null);
        loadFAQs();
      } catch (err: any) {
        message.error('保存失败: ' + (err?.message || '未知错误'));
      }
    },
    [loadFAQs]
  );

  const handleFAQDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFAQ(id);
        message.success('FAQ已删除');
        setShowFAQEditor(false);
        setEditingFAQ(null);
        loadFAQs();
      } catch (err: any) {
        message.error('删除失败: ' + (err?.message || '未知错误'));
      }
    },
    [loadFAQs]
  );

  return (
    <div data-testid="knowledge-page" style={{
      padding: isMobile ? '16px' : '28px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <PageTransition>
        <h1 className="font-serif" style={{
          margin: '0 0 24px 0',
          fontSize: isMobile ? '20px' : '26px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '0.5px',
        }}>
          知识库管理
        </h1>

        <div data-testid="tab-bar" className="scroll-tags" style={{
          marginBottom: '20px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          width: 'fit-content',
          overflowX: 'auto',
          backdropFilter: 'blur(12px)',
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
                backgroundColor: activeTab === tab.key ? 'var(--surface-solid)' : 'transparent',
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
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
          <GlassCard>
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
                  文档列表 {loadingDocs && <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 400 }}>(加载中...)</span>}
                </span>
                <button
                  data-testid="upload-btn"
                  onClick={() => setShowUpload(!showUpload)}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: showUpload ? 'var(--surface)' : 'var(--accent)',
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
                  <DocumentUpload onSuccess={handleUploadSuccess} onError={handleUploadError} />
                </div>
              )}

              <div data-testid="doc-list">
                {documents.length === 0 && !loadingDocs && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    暂无文档，请点击右上角上传
                  </div>
                )}
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
                          ? '1.5px solid var(--accent)'
                          : '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        backgroundColor: selectedDoc?.id === doc.id
                          ? 'var(--surface)'
                          : 'var(--surface-solid)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          wordBreak: 'break-all',
                          flex: 1,
                        }}>
                          {doc.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                          <span className="badge" style={{
                            backgroundColor: status.bg,
                            color: status.color,
                          }}>
                            {status.label}
                          </span>
                          <button
                            onClick={(e) => handleDocReindex(doc, e)}
                            title="重新索引"
                            style={{
                              padding: '4px 8px',
                              background: 'transparent',
                              border: '1px solid var(--surface-border)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: 'var(--text-tertiary)',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ReloadOutlined />
                          </button>
                          <button
                            onClick={(e) => handleDocDelete(doc, e)}
                            title="删除"
                            style={{
                              padding: '4px 8px',
                              background: 'transparent',
                              border: '1px solid var(--color-error-bg)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: 'var(--color-error)',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
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
          </GlassCard>
        )}

        {activeTab === 'faq' && (
          <GlassCard>
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
                  FAQ列表 ({faqs.length}) {loadingFaqs && <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 400 }}>(加载中...)</span>}
                </span>
                <button
                  data-testid="add-faq-btn"
                  onClick={() => { setShowFAQEditor(true); setEditingFAQ(null); }}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: 'var(--accent)',
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
                {faqs.length === 0 && !loadingFaqs && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    暂无FAQ，请点击右上角新建
                  </div>
                )}
                {faqs.map((faq) => (
                  <div
                    key={faq.id}
                    data-testid={`faq-${faq.id}`}
                    onClick={() => { setEditingFAQ(faq); setShowFAQEditor(true); }}
                    className="card-hover"
                    style={{
                      padding: '14px 16px',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--surface-solid)',
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
          </GlassCard>
        )}
      </PageTransition>
    </div>
  );
};

export default KnowledgePage;
