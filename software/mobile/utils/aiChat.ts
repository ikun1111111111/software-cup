export interface ChatHistoryMessage {
  role: string;
  content: string;
}

export interface DigitalHumanChatPayloadInput {
  sessionId: string;
  question: string;
  stream?: boolean;
  history?: ChatHistoryMessage[];
  spotId?: string;
  spotName?: string;
  routeId?: string;
  sourcePage?: string;
}

export interface DigitalHumanChatPayload {
  session_id: string;
  question: string;
  stream: boolean;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  spot_id?: string;
  spot_name?: string;
  route_id?: string;
  source_page?: string;
}

const cleanOptional = (value?: string) => {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
};

export function buildDigitalHumanChatStreamUrl(apiBaseUrl: string) {
  return `${apiBaseUrl.replace(/\/+$/, '')}/chat/stream`;
}

export function buildDigitalHumanChatPayload(input: DigitalHumanChatPayloadInput): DigitalHumanChatPayload {
  const payload: DigitalHumanChatPayload = {
    session_id: input.sessionId,
    question: input.question.trim(),
    stream: input.stream ?? true,
    history: (input.history ?? [])
      .filter((item): item is { role: 'user' | 'assistant'; content: string } => (
        (item.role === 'user' || item.role === 'assistant') && Boolean(item.content.trim())
      ))
      .map((item) => ({
        role: item.role,
        content: item.content.trim(),
      })),
  };

  const spotId = cleanOptional(input.spotId);
  const spotName = cleanOptional(input.spotName);
  const routeId = cleanOptional(input.routeId);
  const sourcePage = cleanOptional(input.sourcePage);

  if (spotId) payload.spot_id = spotId;
  if (spotName) payload.spot_name = spotName;
  if (routeId) payload.route_id = routeId;
  if (sourcePage) payload.source_page = sourcePage;

  return payload;
}
