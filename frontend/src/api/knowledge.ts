import request from './request';

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'completed' | 'failed';
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
  keyword?: string;
  status?: string;
}

export interface FAQListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
}

// 文档相关API
export const getDocs = (params?: DocumentListParams) => {
  return request.get<{ data: Document[]; total: number }>('/api/knowledge/docs', params);
};

export const getDocById = (id: string) => {
  return request.get<Document>(`/api/knowledge/docs/${id}`);
};

export const uploadDoc = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<Document>('/api/knowledge/docs/upload', formData);
};

export const deleteDoc = (id: string) => {
  return request.del(`/api/knowledge/docs/${id}`);
};

export const reindexDoc = (id: string) => {
  return request.post(`/api/knowledge/docs/${id}/reindex`);
};

// 分块相关API
export const getChunks = (docId: string) => {
  return request.get<Chunk[]>(`/api/knowledge/docs/${docId}/chunks`);
};

// FAQ相关API
export const getFAQs = (params?: FAQListParams) => {
  return request.get<{ data: FAQ[]; total: number }>('/api/knowledge/faqs', params);
};

export const createFAQ = (data: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>) => {
  return request.post<FAQ>('/api/knowledge/faqs', data);
};

export const updateFAQ = (id: string, data: Partial<FAQ>) => {
  return request.put<FAQ>(`/api/knowledge/faqs/${id}`, data);
};

export const deleteFAQ = (id: string) => {
  return request.del(`/api/knowledge/faqs/${id}`);
};
