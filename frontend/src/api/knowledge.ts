import { get, post, put, del } from './request';

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'indexing' | 'indexed' | 'failed';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chunk {
  id: string;
  docId: string;
  content: string;
  index: number;
  metadata: Record<string, any>;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface FAQListParams {
  page?: number;
  pageSize?: number;
  category?: string;
}

export interface UploadResult {
  filename: string;
  file_path: string;
  file_type: string;
  url: string;
}

// ===== Backend raw types =====
interface RawDoc {
  id: number;
  title: string;
  file_type: string;
  status: string;
  chunk_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RawFAQ {
  id: number;
  question: string;
  answer: string;
  keywords: string | null;
  category: string;
  priority: number;
  hit_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===== Helpers =====
const rawDocToDocument = (d: RawDoc): Document => ({
  id: String(d.id),
  name: d.title,
  type: d.file_type,
  size: 0,
  status: d.status as Document['status'],
  chunkCount: d.chunk_count,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
});

const rawFAQToFAQ = (f: RawFAQ): FAQ => ({
  id: String(f.id),
  question: f.question,
  answer: f.answer,
  keywords: f.keywords ? f.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
  category: f.category,
  createdAt: f.created_at,
  updatedAt: f.updated_at,
});

// ===== Document APIs =====
export const getDocs = async (params?: DocumentListParams): Promise<{ total: number; data: Document[] }> => {
  const resp = await get<{ total: number; items: RawDoc[] }>('/knowledge/docs', params);
  return {
    total: resp.data.total,
    data: resp.data.items.map(rawDocToDocument),
  };
};

export const getDocById = async (id: string): Promise<{ document: Document; chunks: Chunk[] }> => {
  const resp = await get<RawDoc & { chunks: Array<{ id: number; chunk_index: number; chunk_text: string; token_count: number }> }>(`/knowledge/docs/${id}`);
  const doc = resp.data;
  return {
    document: rawDocToDocument(doc),
    chunks: doc.chunks.map((c: { id: number; chunk_index: number; chunk_text: string; token_count: number }) => ({
      id: String(c.id),
      docId: id,
      content: c.chunk_text,
      index: c.chunk_index,
      metadata: { token_count: c.token_count },
    })),
  };
};

export const uploadFile = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await post<{ filename: string; file_path: string; file_type: string; url: string }>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
};

export const createDoc = async (data: { title: string; content?: string; file_type: string; file_path: string }): Promise<Document> => {
  const resp = await post<RawDoc>('/knowledge/docs', data);
  return rawDocToDocument(resp.data);
};

export const deleteDoc = async (id: string) => {
  await del(`/knowledge/docs/${id}`);
};

export const reindexDoc = async (id: string) => {
  await post(`/knowledge/docs/${id}/reindex`);
};

// ===== FAQ APIs =====
export const getFAQs = async (params?: FAQListParams): Promise<{ total: number; data: FAQ[] }> => {
  const resp = await get<{ total: number; items: RawFAQ[] }>('/knowledge/faq', params);
  return {
    total: resp.data.total,
    data: resp.data.items.map(rawFAQToFAQ),
  };
};

export const createFAQ = async (data: { question: string; answer: string; keywords: string[]; category: string }): Promise<FAQ> => {
  const resp = await post<RawFAQ>('/knowledge/faq', {
    ...data,
    keywords: data.keywords.join(','),
  });
  return rawFAQToFAQ(resp.data);
};

export const updateFAQ = async (id: string, data: Partial<{ question: string; answer: string; keywords: string[]; category: string }>): Promise<FAQ> => {
  const payload: any = { ...data };
  if (data.keywords) {
    payload.keywords = data.keywords.join(',');
  }
  const resp = await put<RawFAQ>(`/knowledge/faq/${id}`, payload);
  return rawFAQToFAQ(resp.data);
};

export const deleteFAQ = async (id: string) => {
  await del(`/knowledge/faq/${id}`);
};
