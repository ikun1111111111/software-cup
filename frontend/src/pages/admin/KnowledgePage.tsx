import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
  EnvironmentOutlined,
  BranchesOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { message, Modal } from 'antd';
import DocumentUpload from '../../components/admin/DocumentUpload';
import ChunkPreview from '../../components/admin/ChunkPreview';
import FAQEditor from '../../components/admin/FAQEditor';
import SealCard from '../../components/admin/SealCard';
import PaperPanel from '../../components/admin/PaperPanel';
import InscriptionList from '../../components/admin/InscriptionList';
import PageTransition from '../../components/admin/PageTransition';
import type { FAQ } from '../../components/admin/FAQEditor';
import {
  createDoc,
  createFAQ,
  deleteDoc,
  deleteFAQ,
  getDocs,
  getFAQs,
  reindexDoc,
  updateFAQ,
  type UploadResult,
} from '../../api/knowledge';
import {
  getMobileTourSummary,
  type MobileTourSummary,
} from '../../api/analytics';
import {
  createAdminRoute,
  createAdminSpot,
  deleteAdminRoute,
  deleteAdminSpot,
  getAdminInteractions,
  getAdminRoutes,
  getAdminSpots,
  importAdminFaq,
  updateAdminRoute,
  updateAdminSpot,
  uploadAdminImage,
  type InteractionItem,
  type ScenicSpotItem,
  type StoryAct,
  type TourRouteItem,
} from '../../api/admin';

interface Document {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'error';
  chunkCount: number;
  uploadTime: string;
}

type TabKey = 'documents' | 'spots' | 'routes' | 'faq' | 'interactions';

interface SpotDraft {
  id?: string;
  name: string;
  category: string;
  tags: string;
  overview: string;
  detail: string;
  qrCode: string;
  relatedSpots: string;
  thumbnail: string;
  detailImages: string;
  storyActs: StoryAct[];
  duration: string;
  qaJson: string;
  displayX: string;
  displayY: string;
}

interface RouteDraft {
  id?: string;
  name: string;
  routeType: string;
  duration: string;
  description: string;
  spotOrder: string;
  gradient: string;
  coverImage: string;
  color: string;
  brushImage: string;
  openingText: string;
  closingText: string;
}

const emptySpot: SpotDraft = { name: '', category: '核心景点', tags: '', overview: '', detail: '', qrCode: '', relatedSpots: '', thumbnail: '', detailImages: '', storyActs: [], duration: '', qaJson: '', displayX: '', displayY: '' };
const emptyRoute: RouteDraft = { name: '', routeType: 'classic', duration: '半日', description: '', spotOrder: '', gradient: '', coverImage: '', color: '', brushImage: '', openingText: '', closingText: '' };

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  ready: { label: '就绪', bg: 'rgba(74, 124, 111, 0.1)', color: 'var(--mountain-mid)' },
  processing: { label: '处理中', bg: 'rgba(201, 169, 110, 0.1)', color: 'var(--gold-leaf)' },
  error: { label: '错误', bg: 'rgba(200, 75, 49, 0.1)', color: 'var(--vermilion)' },
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.76)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-ink)',
};

const backendStatusToLocal = (status: string): Document['status'] => {
  if (status === 'indexed') return 'ready';
  if (status === 'failed') return 'error';
  return 'processing';
};

const splitList = (value: string): string[] =>
  value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: 12 }}>{label}</span>
    {children}
  </label>
);

const KnowledgePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [spots, setSpots] = useState<ScenicSpotItem[]>([]);
  const [routes, setRoutes] = useState<TourRouteItem[]>([]);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [mobileSummary, setMobileSummary] = useState<MobileTourSummary | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFAQEditor, setShowFAQEditor] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [spotDraft, setSpotDraft] = useState<SpotDraft>(emptySpot);
  const [routeDraft, setRouteDraft] = useState<RouteDraft>(emptyRoute);
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sessionQuery, setSessionQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const faqImportRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = useCallback(async () => {
    const res = await getDocs({ page: 1, pageSize: 100 });
    setDocuments(res.data.map((doc) => ({
      id: doc.id,
      name: doc.name,
      status: backendStatusToLocal(doc.status),
      chunkCount: doc.chunkCount,
      uploadTime: doc.createdAt,
    })));
  }, []);

  const loadFAQs = useCallback(async () => {
    const res = await getFAQs({ page: 1, pageSize: 100 });
    setFaqs(res.data);
  }, []);

  const loadSpots = useCallback(async () => {
    const res = await getAdminSpots({ q: query || undefined, page: 1, pageSize: 100 });
    setSpots(res.items);
  }, [query]);

  const loadRoutes = useCallback(async () => {
    const res = await getAdminRoutes({ q: query || undefined, page: 1, pageSize: 100 });
    setRoutes(res.items);
  }, [query]);

  const loadInteractions = useCallback(async () => {
    const res = await getAdminInteractions({
      q: query || undefined,
      sessionId: sessionQuery || undefined,
      page: 1,
      pageSize: 50,
    });
    setInteractions(res.items);
  }, [query, sessionQuery]);

  const loadMobileSummary = useCallback(async () => {
    const res = await getMobileTourSummary(7);
    setMobileSummary(res);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDocuments(), loadFAQs(), loadSpots(), loadRoutes(), loadInteractions(), loadMobileSummary()]);
    } catch (err: any) {
      message.error('加载知识库数据失败: ' + (err?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [loadDocuments, loadFAQs, loadInteractions, loadMobileSummary, loadRoutes, loadSpots]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const contentCoverageAdvice = mobileSummary?.totalEvents
    ? `移动端近 7 日产生 ${mobileSummary.totalEvents.toLocaleString()} 条导览事件，优先核对热门景点的讲解词、路线节点和 FAQ 是否完整。`
    : '移动端暂无稳定导览事件，当前优先根据 Web 大屏问答日志补齐知识库盲区。';

  const handleUploadSuccess = useCallback(async (result: UploadResult) => {
    try {
      await createDoc({ title: result.filename, file_type: result.file_type, file_path: result.file_path });
      message.success('文档上传成功');
      setShowUpload(false);
      loadDocuments();
    } catch (err: any) {
      message.error('创建文档失败: ' + (err?.message || '未知错误'));
    }
  }, [loadDocuments]);

  const confirmDelete = useCallback((title: string, content: string, action: () => Promise<void>) => {
    Modal.confirm({
      title,
      content,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        await action();
      },
    });
  }, []);

  const handleDocDelete = useCallback((doc: Document, event: React.MouseEvent) => {
    event.stopPropagation();
    confirmDelete('确认删除文档', `确定要删除「${doc.name}」吗？此操作将同时删除分块索引。`, async () => {
      await deleteDoc(doc.id);
      message.success('文档已删除');
      setSelectedDoc((prev) => (prev?.id === doc.id ? null : prev));
      loadDocuments();
    });
  }, [confirmDelete, loadDocuments]);

  const handleDocReindex = useCallback(async (doc: Document, event: React.MouseEvent) => {
    event.stopPropagation();
    await reindexDoc(doc.id);
    message.success('重新索引任务已提交');
    loadDocuments();
  }, [loadDocuments]);

  const handleFAQSave = useCallback(async (faq: FAQ) => {
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
  }, [loadFAQs]);

  const handleFAQDelete = useCallback((id: string) => {
    confirmDelete('确认删除 FAQ', '确定要删除这条常见问题吗？', async () => {
      await deleteFAQ(id);
      message.success('FAQ已删除');
      setShowFAQEditor(false);
      setEditingFAQ(null);
      loadFAQs();
    });
  }, [confirmDelete, loadFAQs]);

  const handleFaqImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = await importAdminFaq(file);
      message.success(`导入完成：新增 ${result.imported}，更新 ${result.updated}，跳过 ${result.skipped}`);
      loadFAQs();
    } catch (err: any) {
      message.error('FAQ导入失败: ' + (err?.message || '未知错误'));
    }
  }, [loadFAQs]);

  const saveSpot = useCallback(async () => {
    if (!spotDraft.name.trim()) {
      message.warning('请填写景点名称');
      return;
    }
    const parseQa = (raw: string): { q: string; a: string }[] => {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [];
    };
    const payload = {
      id: spotDraft.id?.trim() || undefined,
      name: spotDraft.name.trim(),
      category: spotDraft.category.trim() || '核心景点',
      tags: splitList(spotDraft.tags),
      overview: spotDraft.overview.trim(),
      detail: spotDraft.detail.trim(),
      qrCode: spotDraft.qrCode.trim() || null,
      relatedSpots: splitList(spotDraft.relatedSpots),
      thumbnail: spotDraft.thumbnail.trim() || null,
      detailImages: splitList(spotDraft.detailImages),
      storyActs: spotDraft.storyActs.length > 0 ? spotDraft.storyActs : null,
      duration: spotDraft.duration.trim() || null,
      qaJson: parseQa(spotDraft.qaJson),
      displayX: spotDraft.displayX.trim() ? parseFloat(spotDraft.displayX) : null,
      displayY: spotDraft.displayY.trim() ? parseFloat(spotDraft.displayY) : null,
    };
    if (editingSpotId) {
      await updateAdminSpot(editingSpotId, payload);
      message.success('景点已更新');
    } else {
      await createAdminSpot(payload);
      message.success('景点已创建');
    }
    setSpotDraft(emptySpot);
    setEditingSpotId(null);
    loadSpots();
  }, [editingSpotId, loadSpots, spotDraft]);

  const saveRoute = useCallback(async () => {
    if (!routeDraft.name.trim()) {
      message.warning('请填写路线名称');
      return;
    }
    const payload = {
      id: routeDraft.id?.trim() || undefined,
      name: routeDraft.name.trim(),
      routeType: routeDraft.routeType.trim() || 'classic',
      duration: routeDraft.duration.trim() || '半日',
      description: routeDraft.description.trim(),
      spotOrder: splitList(routeDraft.spotOrder),
      gradient: routeDraft.gradient.trim() || null,
      coverImage: routeDraft.coverImage.trim() || null,
      color: routeDraft.color.trim() || null,
      brushImage: routeDraft.brushImage.trim() || null,
      openingText: routeDraft.openingText.trim() || null,
      closingText: routeDraft.closingText.trim() || null,
    };
    if (editingRouteId) {
      await updateAdminRoute(editingRouteId, payload);
      message.success('路线已更新');
    } else {
      await createAdminRoute(payload);
      message.success('路线已创建');
    }
    setRouteDraft(emptyRoute);
    setEditingRouteId(null);
    loadRoutes();
  }, [editingRouteId, loadRoutes, routeDraft]);

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'documents', label: '文档档案', icon: <DatabaseOutlined /> },
    { key: 'spots', label: '景点介绍', icon: <EnvironmentOutlined /> },
    { key: 'routes', label: '游览路线', icon: <BranchesOutlined /> },
    { key: 'faq', label: '常见问题', icon: <QuestionCircleOutlined /> },
    { key: 'interactions', label: '交互日志', icon: <MessageOutlined /> },
  ];

  const renderSearchBar = (placeholder: string, withSession = false) => (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} style={{ ...inputStyle, maxWidth: 260 }} />
      {withSession && (
        <input value={sessionQuery} onChange={(event) => setSessionQuery(event.target.value)} placeholder="按会话 ID 筛选" style={{ ...inputStyle, maxWidth: 220 }} />
      )}
      <button onClick={loadAll} style={secondaryButtonStyle}><ReloadOutlined /> 查询</button>
    </div>
  );

  return (
    <div data-testid="knowledge-page" className="animate-scroll-unfold" style={{ padding: 28, maxWidth: 1440, margin: '0 auto' }}>
      <PageTransition>
        <h1 style={{ margin: '0 0 24px', fontSize: 26, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
          知识库管理
        </h1>

        <PaperPanel title="双端知识覆盖" withScrollHead style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { label: '知识文档', value: `${documents.length} 份`, hint: '支撑 Web 问答与移动端讲解' },
              { label: '景点资料', value: `${spots.length} 个`, hint: '双端共用景点内容源' },
              { label: '导览路线', value: `${routes.length} 条`, hint: '移动端路线与大屏推荐共用' },
              { label: '问答样本', value: `${interactions.length} 条`, hint: '用于发现知识盲区' },
            ].map((item) => (
              <div key={item.label} style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(184,115,51,0.12)', background: 'rgba(255,253,247,0.62)' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{item.label}</span>
                <strong style={{ display: 'block', marginTop: 6, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: 22 }}>{item.value}</strong>
                <small style={{ display: 'block', marginTop: 4, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{item.hint}</small>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(106,156,137,0.10)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {contentCoverageAdvice}
          </div>
        </PaperPanel>

        <div data-testid="tab-bar" style={{ marginBottom: 20, backgroundColor: 'var(--ink-dark)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content', display: 'flex', gap: 2, overflowX: 'auto' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              data-testid={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 18px',
                backgroundColor: activeTab === tab.key ? 'rgba(243, 239, 230, 0.1)' : 'transparent',
                color: activeTab === tab.key ? 'var(--gold-leaf)' : 'rgba(243, 239, 230, 0.55)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'documents' && (
          <PaperPanel title="文档档案">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                文档列表 {loading && <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 400 }}>(加载中...)</span>}
              </span>
              <button data-testid="upload-btn" onClick={() => setShowUpload(!showUpload)} style={showUpload ? secondaryButtonStyle : buttonStyle}>
                {showUpload ? '关闭上传' : <><UploadOutlined /> 上传文档</>}
              </button>
            </div>

            {showUpload && (
              <div data-testid="upload-area" style={{ marginBottom: 20 }}>
                <DocumentUpload onSuccess={handleUploadSuccess} onError={(error) => message.error('上传失败: ' + error)} />
              </div>
            )}

            {documents.length === 0 && !loading && (
              <EmptyState icon={<InboxOutlined />} title="暂无文档" note="上传 PDF、DOCX、TXT 或 Markdown 资料，建立可检索知识库。" />
            )}

            {documents.map((doc) => {
              const status = STATUS_MAP[doc.status];
              return (
                <SealCard key={doc.id} size="sm" color="ink" onClick={() => setSelectedDoc(doc)} style={{ marginBottom: 10, border: selectedDoc?.id === doc.id ? '1.5px solid var(--accent)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, wordBreak: 'break-all', flex: 1 }}>{doc.name}</span>
                    <span className="badge" style={{ backgroundColor: status.bg, color: status.color }}>{status.label}</span>
                    <button onClick={(event) => handleDocReindex(doc, event)} title="重新索引" style={secondaryButtonStyle}><ReloadOutlined /></button>
                    <button onClick={(event) => handleDocDelete(doc, event)} title="删除" style={{ ...secondaryButtonStyle, color: 'var(--vermilion)' }}><DeleteOutlined /></button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>分块数: {doc.chunkCount} | 上传时间: {doc.uploadTime}</div>
                </SealCard>
              );
            })}

            {selectedDoc && (
              <div data-testid="chunk-preview-area" style={{ marginTop: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-primary)' }}>分块预览 - {selectedDoc.name}</h3>
                <ChunkPreview docId={selectedDoc.id} />
              </div>
            )}
          </PaperPanel>
        )}

        {activeTab === 'spots' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
            <PaperPanel title={editingSpotId ? '编辑景点' : '新建景点'}>
              <EntitySpotForm draft={spotDraft} onChange={setSpotDraft} onSave={saveSpot} onCancel={() => { setSpotDraft(emptySpot); setEditingSpotId(null); }} editing={Boolean(editingSpotId)} />
            </PaperPanel>
            <PaperPanel title="景点介绍">
              {renderSearchBar('搜索景点名称')}
              <div style={{ display: 'grid', gap: 10 }}>
                {spots.map((spot) => (
                  <SealCard key={spot.id} size="sm" color="ink">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{spot.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>{spot.category} · {(spot.tags ?? []).join('、') || '未设标签'}</div>
                        <div style={{ marginTop: 8, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{spot.overview || '暂无简介'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button style={secondaryButtonStyle} onClick={() => {
                          setEditingSpotId(spot.id);
                          setSpotDraft({
                            id: spot.id,
                            name: spot.name,
                            category: spot.category,
                            tags: (spot.tags ?? []).join('，'),
                            overview: spot.overview,
                            detail: spot.detail,
                            qrCode: spot.qrCode || '',
                            relatedSpots: (spot.relatedSpots ?? []).join('，'),
                            thumbnail: spot.thumbnail || '',
                            detailImages: (spot.detailImages ?? []).join('，'),
                            storyActs: spot.storyActs || [],
                            duration: spot.duration || '',
                            qaJson: spot.qaJson ? JSON.stringify(spot.qaJson, null, 2) : '',
                            displayX: spot.displayX != null ? String(spot.displayX) : '',
                            displayY: spot.displayY != null ? String(spot.displayY) : '',
                          });
                        }}>编辑</button>
                        <button style={{ ...secondaryButtonStyle, color: 'var(--vermilion)' }} onClick={() => confirmDelete('确认删除景点', `确定要删除「${spot.name}」吗？`, async () => {
                          await deleteAdminSpot(spot.id);
                          message.success('景点已删除');
                          loadSpots();
                        })}><DeleteOutlined /></button>
                      </div>
                    </div>
                  </SealCard>
                ))}
              </div>
            </PaperPanel>
          </div>
        )}

        {activeTab === 'routes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
            <PaperPanel title={editingRouteId ? '编辑路线' : '新建路线'}>
              <EntityRouteForm draft={routeDraft} onChange={setRouteDraft} onSave={saveRoute} onCancel={() => { setRouteDraft(emptyRoute); setEditingRouteId(null); }} editing={Boolean(editingRouteId)} />
            </PaperPanel>
            <PaperPanel title="游览路线">
              {renderSearchBar('搜索路线名称')}
              <div style={{ display: 'grid', gap: 10 }}>
                {routes.map((route) => (
                  <SealCard key={route.id} size="sm" color="ink">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{route.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>{route.routeType} · {route.duration}</div>
                        <div style={{ marginTop: 8, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{route.description || '暂无说明'}</div>
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>节点：{route.spotOrder.join(' → ') || '未配置'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button style={secondaryButtonStyle} onClick={() => {
                          setEditingRouteId(route.id);
                          setRouteDraft({
                            id: route.id,
                            name: route.name,
                            routeType: route.routeType,
                            duration: route.duration,
                            description: route.description,
                            spotOrder: route.spotOrder.join('，'),
                            gradient: route.gradient || '',
                            coverImage: route.coverImage || '',
                            color: route.color || '',
                            brushImage: route.brushImage || '',
                            openingText: route.openingText || '',
                            closingText: route.closingText || '',
                          });
                        }}>编辑</button>
                        <button style={{ ...secondaryButtonStyle, color: 'var(--vermilion)' }} onClick={() => confirmDelete('确认删除路线', `确定要删除「${route.name}」吗？`, async () => {
                          await deleteAdminRoute(route.id);
                          message.success('路线已删除');
                          loadRoutes();
                        })}><DeleteOutlined /></button>
                      </div>
                    </div>
                  </SealCard>
                ))}
              </div>
            </PaperPanel>
          </div>
        )}

        {activeTab === 'faq' && (
          <PaperPanel title="常见问题">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>FAQ 列表 ({faqs.length})</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={secondaryButtonStyle} onClick={() => faqImportRef.current?.click()}><UploadOutlined /> 批量导入</button>
                <button style={buttonStyle} onClick={() => { setShowFAQEditor(true); setEditingFAQ(null); }}><PlusOutlined /> 新建FAQ</button>
                <input ref={faqImportRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFaqImport} style={{ display: 'none' }} />
              </div>
            </div>

            {showFAQEditor && (
              <div data-testid="faq-editor-area" style={{ marginBottom: 20 }}>
                <FAQEditor faq={editingFAQ || undefined} onSave={handleFAQSave} onDelete={editingFAQ ? handleFAQDelete : undefined} onCancel={() => { setShowFAQEditor(false); setEditingFAQ(null); }} />
              </div>
            )}

            {faqs.length === 0 && !loading ? (
              <EmptyState icon={<BookOutlined />} title="暂无FAQ" note="可单条创建，也可上传含 question/answer 或 问题/答案 列的表格。" />
            ) : (
              <InscriptionList
                items={faqs.map((faq, index) => ({
                  id: faq.id ?? '',
                  number: index + 1,
                  text: faq.question,
                  note: `${faq.answer}　|　分类: ${faq.category}　|　关键词: ${faq.keywords.join(', ')}`,
                  highlight: index < 3,
                }))}
                onItemClick={(item) => {
                  const faq = faqs.find((candidate) => candidate.id === item.id);
                  if (faq) {
                    setEditingFAQ(faq);
                    setShowFAQEditor(true);
                  }
                }}
              />
            )}
          </PaperPanel>
        )}

        {activeTab === 'interactions' && (
          <PaperPanel title="交互日志">
            {renderSearchBar('搜索用户问题', true)}
            {interactions.length === 0 && !loading ? (
              <EmptyState icon={<FileTextOutlined />} title="暂无交互记录" note="游客问答产生后，会在这里按时间倒序归档。" />
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {interactions.map((item) => (
                  <SealCard key={item.id} size="sm" color="ink">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.question}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.createdAt ?? '-'}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.answer}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      会话 {item.sessionId} · {item.inputType} · {item.source} · {item.sentimentLabel ?? 'unknown'} · {item.latencyMs}ms
                    </div>
                  </SealCard>
                ))}
              </div>
            )}
          </PaperPanel>
        )}
      </PageTransition>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; note: string }> = ({ icon, title, note }) => (
  <div style={{ textAlign: 'center', padding: '44px 24px', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-light)', backgroundColor: 'rgba(247,245,240,0.5)' }}>
    <div style={{ fontSize: 32, color: 'var(--gold-leaf)', marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13 }}>{note}</div>
  </div>
);

const EntitySpotForm: React.FC<{
  draft: SpotDraft;
  editing: boolean;
  onChange: (draft: SpotDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ draft, editing, onChange, onSave, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'thumbnail' | 'detailImages') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = await uploadAdminImage(file, 'icons');
      if (field === 'thumbnail') {
        onChange({ ...draft, thumbnail: result.path });
      } else {
        const list = splitList(draft.detailImages);
        list.push(result.path);
        onChange({ ...draft, detailImages: list.join('，') });
      }
      message.success('图片上传成功');
    } catch (err: any) {
      message.error('图片上传失败: ' + (err?.message || '未知错误'));
    }
  };

  const updateStoryAct = (index: number, act: Partial<StoryAct>) => {
    const next = [...draft.storyActs];
    next[index] = { ...next[index], ...act };
    onChange({ ...draft, storyActs: next });
  };

  const addStoryAct = () => {
    onChange({
      ...draft,
      storyActs: [
        ...draft.storyActs,
        { id: `act-${draft.storyActs.length + 1}`, title: '', emotion: 'neutral', promptHint: '', actImage: '' },
      ],
    });
  };

  const removeStoryAct = (index: number) => {
    const next = draft.storyActs.filter((_, i) => i !== index);
    onChange({ ...draft, storyActs: next });
  };

  const handleActImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !draft.id) return;
    try {
      const result = await uploadAdminImage(file, `story/${draft.id}`);
      updateStoryAct(index, { actImage: result.path });
      message.success('分幕图片上传成功');
    } catch (err: any) {
      message.error('图片上传失败: ' + (err?.message || '未知错误'));
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Field label="自定义 ID（可选）"><input value={draft.id ?? ''} onChange={(event) => onChange({ ...draft, id: event.target.value })} style={inputStyle} disabled={editing} /></Field>
      <Field label="景点名称"><input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} style={inputStyle} /></Field>
      <Field label="分类"><input value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })} style={inputStyle} /></Field>
      <Field label="标签（逗号分隔）"><input value={draft.tags} onChange={(event) => onChange({ ...draft, tags: event.target.value })} style={inputStyle} /></Field>
      <Field label="游玩时长"><input value={draft.duration} onChange={(event) => onChange({ ...draft, duration: event.target.value })} style={inputStyle} placeholder="如 30分钟" /></Field>
      <Field label="坐标 X"><input value={draft.displayX} onChange={(event) => onChange({ ...draft, displayX: event.target.value })} style={inputStyle} placeholder="0-100" /></Field>
      <Field label="坐标 Y"><input value={draft.displayY} onChange={(event) => onChange({ ...draft, displayY: event.target.value })} style={inputStyle} placeholder="0-100" /></Field>
      <Field label="缩略图 / 图标">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={draft.thumbnail} onChange={(event) => onChange({ ...draft, thumbnail: event.target.value })} style={inputStyle} placeholder="image/icons/xxx.png" />
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'thumbnail')} />
          <button style={secondaryButtonStyle} onClick={() => fileInputRef.current?.click()}><UploadOutlined /></button>
        </div>
      </Field>
      <Field label="详情图（逗号分隔）">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={draft.detailImages} onChange={(event) => onChange({ ...draft, detailImages: event.target.value })} style={inputStyle} placeholder="image/xxx.jpg，image/yyy.jpg" />
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'detailImages')} />
        </div>
      </Field>
      <Field label="简介"><textarea value={draft.overview} onChange={(event) => onChange({ ...draft, overview: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <Field label="详细介绍"><textarea value={draft.detail} onChange={(event) => onChange({ ...draft, detail: event.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <Field label="二维码编码"><input value={draft.qrCode} onChange={(event) => onChange({ ...draft, qrCode: event.target.value })} style={inputStyle} /></Field>
      <Field label="关联景点（逗号分隔）"><input value={draft.relatedSpots} onChange={(event) => onChange({ ...draft, relatedSpots: event.target.value })} style={inputStyle} /></Field>
      <Field label="QA 问答（JSON 数组）"><textarea value={draft.qaJson} onChange={(event) => onChange({ ...draft, qaJson: event.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }} placeholder='[{"q":"...","a":"..."}]' /></Field>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>剧场分幕骨架</span>
          <button style={secondaryButtonStyle} onClick={addStoryAct}><PlusOutlined /> 添加分幕</button>
        </div>
        {draft.storyActs.map((act, idx) => (
          <div key={idx} style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 10, marginBottom: 10, background: 'rgba(255,255,255,0.5)' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={act.id} onChange={(e) => updateStoryAct(idx, { id: e.target.value })} style={inputStyle} placeholder="幕ID" />
                <input value={act.title} onChange={(e) => updateStoryAct(idx, { title: e.target.value })} style={inputStyle} placeholder="标题" />
                <select value={act.emotion} onChange={(e) => updateStoryAct(idx, { emotion: e.target.value })} style={inputStyle}
                >
                  {['neutral', 'think', 'smile', 'surprise', 'sorry'].map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <textarea value={act.promptHint} onChange={(e) => updateStoryAct(idx, { promptHint: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Prompt hint" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={act.actImage} onChange={(e) => updateStoryAct(idx, { actImage: e.target.value })} style={inputStyle} placeholder="story/xxx/act-N-id.jpg" />
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleActImageUpload(e, idx)} id={`act-image-${idx}`} />
                <button style={secondaryButtonStyle} onClick={() => document.getElementById(`act-image-${idx}`)?.click()}><UploadOutlined /></button>
                <button style={{ ...secondaryButtonStyle, color: 'var(--vermilion)' }} onClick={() => removeStoryAct(idx)}><DeleteOutlined /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {editing && <button style={secondaryButtonStyle} onClick={onCancel}>取消</button>}
        <button style={buttonStyle} onClick={onSave}>{editing ? '保存修改' : '创建景点'}</button>
      </div>
    </div>
  );
};

const EntityRouteForm: React.FC<{
  draft: RouteDraft;
  editing: boolean;
  onChange: (draft: RouteDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ draft, editing, onChange, onSave, onCancel }) => {
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'coverImage' | 'brushImage') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const subdir = field === 'coverImage' ? 'brushes' : 'brushes';
      const result = await uploadAdminImage(file, subdir);
      onChange({ ...draft, [field]: result.path } as RouteDraft);
      message.success('图片上传成功');
    } catch (err: any) {
      message.error('图片上传失败: ' + (err?.message || '未知错误'));
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Field label="自定义 ID（可选）"><input value={draft.id ?? ''} onChange={(event) => onChange({ ...draft, id: event.target.value })} style={inputStyle} disabled={editing} /></Field>
      <Field label="路线名称"><input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} style={inputStyle} /></Field>
      <Field label="路线类型"><input value={draft.routeType} onChange={(event) => onChange({ ...draft, routeType: event.target.value })} style={inputStyle} /></Field>
      <Field label="时长"><input value={draft.duration} onChange={(event) => onChange({ ...draft, duration: event.target.value })} style={inputStyle} /></Field>
      <Field label="景点顺序（逗号分隔）"><textarea value={draft.spotOrder} onChange={(event) => onChange({ ...draft, spotOrder: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <Field label="路线说明"><textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <Field label="主题色"><input value={draft.color} onChange={(event) => onChange({ ...draft, color: event.target.value })} style={inputStyle} placeholder="#2A2520" /></Field>
      <Field label="渐变 CSS"><input value={draft.gradient} onChange={(event) => onChange({ ...draft, gradient: event.target.value })} style={inputStyle} placeholder="linear-gradient(...)" /></Field>
      <Field label="封面图">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={draft.coverImage} onChange={(event) => onChange({ ...draft, coverImage: event.target.value })} style={inputStyle} placeholder="image/brushes/xxx.png" />
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'coverImage')} id="route-cover-image" />
          <button style={secondaryButtonStyle} onClick={() => document.getElementById('route-cover-image')?.click()}><UploadOutlined /></button>
        </div>
      </Field>
      <Field label="墨线纹理">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={draft.brushImage} onChange={(event) => onChange({ ...draft, brushImage: event.target.value })} style={inputStyle} placeholder="image/brushes/brush-ink.png" />
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'brushImage')} id="route-brush-image" />
          <button style={secondaryButtonStyle} onClick={() => document.getElementById('route-brush-image')?.click()}><UploadOutlined /></button>
        </div>
      </Field>
      <Field label="开场解说"><textarea value={draft.openingText} onChange={(event) => onChange({ ...draft, openingText: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <Field label="结束解说"><textarea value={draft.closingText} onChange={(event) => onChange({ ...draft, closingText: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {editing && <button style={secondaryButtonStyle} onClick={onCancel}>取消</button>}
        <button style={buttonStyle} onClick={onSave}>{editing ? '保存修改' : '创建路线'}</button>
      </div>
    </div>
  );
};

export default KnowledgePage;
