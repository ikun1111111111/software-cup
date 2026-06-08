import React, { useCallback, useEffect, useState } from 'react';
import { FileTextOutlined } from '@ant-design/icons';
import { getDocById } from '../../api/knowledge';

export interface Chunk {
  id: string;
  content: string;
  index: number;
  metadata: Record<string, any>;
}

export interface ChunkPreviewProps {
  docId: string;
  chunks?: Chunk[];
  onChunkClick?: (chunk: Chunk) => void;
  highlightKeywords?: string[];
}

const ChunkPreview: React.FC<ChunkPreviewProps> = ({
  docId,
  chunks: propChunks,
  onChunkClick,
  highlightKeywords = [],
}) => {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propChunks) {
      setChunks(propChunks);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getDocById(docId)
      .then((res) => {
        setChunks(res.chunks);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || '加载分块失败');
        setLoading(false);
      });
  }, [docId, propChunks]);

  const highlightText = useCallback((text: string, keywords: string[]) => {
    if (keywords.length === 0) return text;

    let result = text;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      result = result.replace(regex, '**$1**');
    });
    return result;
  }, []);

  const renderChunk = useCallback((chunk: Chunk) => {
    const displayText = highlightText(chunk.content, highlightKeywords);

    return (
      <div
        key={chunk.id}
        data-testid={`chunk-${chunk.id}`}
        onClick={() => onChunkClick?.(chunk)}
        style={{
          border: '1px solid #E8E5DF',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '10px',
          cursor: onChunkClick ? 'pointer' : 'default',
          backgroundColor: '#FFFFFF',
          transition: 'all 200ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,22,20,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#1A5FB4', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileTextOutlined />
            分块 #{chunk.index + 1}
          </span>
          <span style={{ color: '#A8A198', fontSize: '12px' }}>
            ID: {chunk.id}
          </span>
        </div>
        <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14px', color: '#1A1614' }}>
          {displayText}
        </p>
        {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#A8A198', display: 'flex', gap: '12px' }}>
            {Object.entries(chunk.metadata).map(([key, value]) => (
              <span key={key}>
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }, [highlightText, highlightKeywords, onChunkClick]);

  if (loading) {
    return (
      <div data-testid="chunk-preview-loading" style={{ textAlign: 'center', padding: '24px', color: '#A8A198' }}>
        加载中...
      </div>
    );
  }

  return (
    <div data-testid="chunk-preview">
      <div style={{ marginBottom: '14px', color: '#A8A198', fontSize: '13px' }}>
        文档ID: {docId} | 共 {chunks.length} 个分块
      </div>
      <div data-testid="chunk-list">
        {chunks.length > 0 ? (
          chunks.map(renderChunk)
        ) : (
          <div data-testid="empty-state" style={{ textAlign: 'center', padding: '24px', color: '#A8A198' }}>
            暂无分块数据
          </div>
        )}
      </div>
    </div>
  );
};

export default ChunkPreview;
