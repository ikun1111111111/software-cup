import { del, get, post, put } from './request';

export interface Paginated<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface ScenicSpotItem {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  detail: string;
  qrCode: string | null;
  relatedSpots: string[] | null;
  thumbnail: string | null;
  detailImages: string[] | null;
  storyActs: StoryAct[] | null;
  duration: string | null;
  qaJson: { q: string; a: string }[] | null;
  displayX: number | null;
  displayY: number | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface StoryAct {
  id: string;
  title: string;
  emotion: string;
  promptHint: string;
  actImage: string;
}

export interface TourRouteItem {
  id: string;
  name: string;
  routeType: string;
  duration: string;
  description: string;
  gradient: string | null;
  coverImage: string | null;
  color: string | null;
  brushImage: string | null;
  openingText: string | null;
  closingText: string | null;
  spotOrder: string[];
  spotDetails: Record<string, any> | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface InteractionItem {
  id: number;
  sessionId: string;
  question: string;
  answer: string;
  inputType: string;
  sentimentLabel: string | null;
  sentimentScore: number | null;
  source: string;
  latencyMs: number;
  feedback: string | null;
  createdAt: string | null;
}

interface RawPaginated<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

interface RawScenicSpot {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  detail: string;
  qr_code: string | null;
  related_spots: string[] | null;
  thumbnail: string | null;
  detail_images: string[] | null;
  story_acts: RawStoryAct[] | null;
  duration: string | null;
  qa_json: { q: string; a: string }[] | null;
  display_x: number | null;
  display_y: number | null;
  is_active: boolean;
  created_at: string | null;
}

interface RawStoryAct {
  id: string;
  title: string;
  emotion: string;
  prompt_hint: string;
  act_image: string;
}

interface RawTourRoute {
  id: string;
  name: string;
  route_type: string;
  duration: string;
  description: string;
  gradient: string | null;
  cover_image: string | null;
  color: string | null;
  brush_image: string | null;
  opening_text: string | null;
  closing_text: string | null;
  spot_order: string[];
  spot_details: Record<string, any> | null;
  is_active: boolean;
  created_at: string | null;
}

interface RawInteraction {
  id: number;
  session_id: string;
  question: string;
  answer: string;
  input_type: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
  source: string;
  latency_ms: number;
  feedback: string | null;
  created_at: string | null;
}

export interface ScenicSpotPayload {
  id?: string;
  name: string;
  category: string;
  tags?: string[] | null;
  overview?: string;
  detail?: string;
  qrCode?: string | null;
  relatedSpots?: string[] | null;
  thumbnail?: string | null;
  detailImages?: string[] | null;
  storyActs?: StoryAct[] | null;
  duration?: string | null;
  qaJson?: { q: string; a: string }[] | null;
  displayX?: number | null;
  displayY?: number | null;
  isActive?: boolean;
}

export interface TourRoutePayload {
  id?: string;
  name: string;
  routeType: string;
  duration: string;
  description?: string;
  gradient?: string | null;
  coverImage?: string | null;
  color?: string | null;
  brushImage?: string | null;
  openingText?: string | null;
  closingText?: string | null;
  spotOrder: string[];
  spotDetails?: Record<string, any> | null;
  isActive?: boolean;
}

const toPaginated = <TRaw, T>(raw: RawPaginated<TRaw>, mapper: (item: TRaw) => T): Paginated<T> => ({
  total: raw.total,
  page: raw.page,
  pageSize: raw.page_size,
  items: raw.items.map(mapper),
});

const toSpot = (item: RawScenicSpot): ScenicSpotItem => ({
  id: item.id,
  name: item.name,
  category: item.category,
  tags: item.tags,
  overview: item.overview,
  detail: item.detail,
  qrCode: item.qr_code,
  relatedSpots: item.related_spots,
  thumbnail: item.thumbnail,
  detailImages: item.detail_images,
  storyActs: (item.story_acts || []).map((a) => ({
    id: a.id,
    title: a.title,
    emotion: a.emotion,
    promptHint: a.prompt_hint,
    actImage: a.act_image,
  })),
  duration: item.duration,
  qaJson: item.qa_json,
  displayX: item.display_x,
  displayY: item.display_y,
  isActive: item.is_active,
  createdAt: item.created_at,
});

const toRoute = (item: RawTourRoute): TourRouteItem => ({
  id: item.id,
  name: item.name,
  routeType: item.route_type,
  duration: item.duration,
  description: item.description,
  gradient: item.gradient,
  coverImage: item.cover_image,
  color: item.color,
  brushImage: item.brush_image,
  openingText: item.opening_text,
  closingText: item.closing_text,
  spotOrder: item.spot_order,
  spotDetails: item.spot_details,
  isActive: item.is_active,
  createdAt: item.created_at,
});

const toInteraction = (item: RawInteraction): InteractionItem => ({
  id: item.id,
  sessionId: item.session_id,
  question: item.question,
  answer: item.answer,
  inputType: item.input_type,
  sentimentLabel: item.sentiment_label,
  sentimentScore: item.sentiment_score,
  source: item.source,
  latencyMs: item.latency_ms,
  feedback: item.feedback,
  createdAt: item.created_at,
});

const spotPayload = (data: Partial<ScenicSpotPayload>) => ({
  id: data.id,
  name: data.name,
  category: data.category,
  tags: data.tags,
  overview: data.overview,
  detail: data.detail,
  qr_code: data.qrCode,
  related_spots: data.relatedSpots,
  thumbnail: data.thumbnail,
  detail_images: data.detailImages,
  story_acts: data.storyActs,
  duration: data.duration,
  qa_json: data.qaJson,
  display_x: data.displayX,
  display_y: data.displayY,
  is_active: data.isActive ?? true,
});

const routePayload = (data: Partial<TourRoutePayload>) => ({
  id: data.id,
  name: data.name,
  route_type: data.routeType,
  duration: data.duration,
  description: data.description,
  gradient: data.gradient,
  cover_image: data.coverImage,
  color: data.color,
  brush_image: data.brushImage,
  opening_text: data.openingText,
  closing_text: data.closingText,
  spot_order: data.spotOrder ?? [],
  spot_details: data.spotDetails,
  is_active: data.isActive ?? true,
});

export const getAdminSpots = async (params?: { q?: string; page?: number; pageSize?: number }) => {
  const resp = await get<RawPaginated<RawScenicSpot>>('/admin/scenic-spots', {
    q: params?.q,
    page: params?.page,
    page_size: params?.pageSize,
  });
  return toPaginated(resp.data, toSpot);
};

export const createAdminSpot = async (data: ScenicSpotPayload) => {
  const resp = await post<RawScenicSpot>('/admin/scenic-spots', spotPayload(data));
  return toSpot(resp.data);
};

export const updateAdminSpot = async (id: string, data: ScenicSpotPayload) => {
  const resp = await put<RawScenicSpot>(`/admin/scenic-spots/${id}`, spotPayload(data));
  return toSpot(resp.data);
};

export const deleteAdminSpot = async (id: string) => {
  await del(`/admin/scenic-spots/${id}`);
};

export const getAdminRoutes = async (params?: { q?: string; page?: number; pageSize?: number }) => {
  const resp = await get<RawPaginated<RawTourRoute>>('/admin/tour-routes', {
    q: params?.q,
    page: params?.page,
    page_size: params?.pageSize,
  });
  return toPaginated(resp.data, toRoute);
};

export const createAdminRoute = async (data: TourRoutePayload) => {
  const resp = await post<RawTourRoute>('/admin/tour-routes', routePayload(data));
  return toRoute(resp.data);
};

export const updateAdminRoute = async (id: string, data: TourRoutePayload) => {
  const resp = await put<RawTourRoute>(`/admin/tour-routes/${id}`, routePayload(data));
  return toRoute(resp.data);
};

export const deleteAdminRoute = async (id: string) => {
  await del(`/admin/tour-routes/${id}`);
};

export const getAdminInteractions = async (params?: { q?: string; sessionId?: string; page?: number; pageSize?: number }) => {
  const resp = await get<RawPaginated<RawInteraction>>('/admin/interactions', {
    q: params?.q,
    session_id: params?.sessionId,
    page: params?.page,
    page_size: params?.pageSize,
  });
  return toPaginated(resp.data, toInteraction);
};

export const importAdminFaq = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await post<{ imported: number; updated: number; skipped: number }>('/admin/faq/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
};

export const uploadAdminImage = async (file: File, subdir: string): Promise<{ path: string; url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await post<{ path: string; url: string }>(`/admin/upload-image?subdir=${encodeURIComponent(subdir)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
};
