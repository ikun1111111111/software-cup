export type GuideIntent =
  | 'history'
  | 'nature'
  | 'family'
  | 'photo'
  | 'quiet'
  | 'budget'
  | 'deep_explain'
  | 'free_walk';

export type GuideRouteTheme = 'history' | 'nature' | 'family' | 'free';

export interface UserGuideProfile {
  userId?: string;
  interests: GuideIntent[];
  pace: 'slow' | 'normal' | 'fast';
  groupType: 'solo' | 'couple' | 'family' | 'group';
  budgetLevel: 'low' | 'medium' | 'high';
  narrationDepth: 'brief' | 'standard' | 'deep';
  autoNarrate: boolean;
  companionLevel?: 'quiet' | 'balanced' | 'active';
  safetyReminder?: boolean;
}

export interface GuideStop {
  id: string;
  name: string;
  type: string;
  overview: string;
  guideLine: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  recommendedStayMinutes: number;
  culturalTags: string[];
  narrationScriptId?: string;
  checkinRequired?: boolean;
}

export interface GuideRoute {
  id: string;
  name: string;
  theme: GuideRouteTheme;
  durationMinutes: number;
  description: string;
  suitableFor: GuideIntent[];
  stops: GuideStop[];
  openingLine: string;
}

export type GuideSessionStatus =
  | 'idle'
  | 'planning'
  | 'navigating'
  | 'narrating'
  | 'chatting'
  | 'completed';

export interface GuideSessionState {
  sessionId: string;
  status: GuideSessionStatus;
  currentRoute?: GuideRoute;
  currentStopId?: string;
  nextStopId?: string;
  completedStopIds: string[];
  profile: UserGuideProfile;
}

export interface GuideNarrationScript {
  id: string;
  stopId: string;
  title: string;
  brief: string;
  deepDive: string;
  familyVersion: string;
  source: string;
}

export interface GuideMemoryEvent {
  id: string;
  sessionId: string;
  type: 'start_route' | 'arrive_stop' | 'narration' | 'ask' | 'checkin' | 'finish_route';
  stopId?: string;
  routeId?: string;
  title: string;
  content?: string;
  createdAt: string;
  mediaUri?: string;
  metadata?: Record<string, any>;
}

export type GuideMemoryEventInput =
  Omit<GuideMemoryEvent, 'id' | 'sessionId' | 'createdAt'>
  & Partial<Pick<GuideMemoryEvent, 'id' | 'sessionId' | 'createdAt'>>;
