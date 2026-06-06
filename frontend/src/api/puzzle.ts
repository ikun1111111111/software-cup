import request from './request';

export interface PuzzleItem {
  id: number;
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
  difficulty: string;
}

export interface StampItem {
  id: string;
  name: string;
  color: string;
  symbol: string;
  collected: boolean;
  spot_name: string;
}

export interface UserProfile {
  session_id: string;
  score: number;
  visited_count: number;
  correct_answers: number;
  total_answers: number;
  accuracy: number;
  collected_stamps: number;
  total_stamps: number;
  achievements: string[];
  level: { name: string; icon: string; min_score: number };
}

export const generatePuzzles = (spotName: string, count = 4) => {
  return request.post<{ spot_name: string; puzzles: PuzzleItem[]; source: string }>(
    '/puzzle/generate',
    { spot_name: spotName, count },
  );
};

export const submitAnswer = (sessionId: string, puzzleId: number, selected: number, correct: number) => {
  return request.post('/puzzle/answer', {
    session_id: sessionId,
    puzzle_id: puzzleId,
    selected_index: selected,
    correct_index: correct,
  });
};

export const recordVisit = (sessionId: string, spotName: string) => {
  return request.post('/puzzle/visit', null, { params: { session_id: sessionId, spot_name: spotName } });
};

export const getStamps = (sessionId: string) => {
  return request.get('/puzzle/stamps', { params: { session_id: sessionId } });
};

export const getProfile = (sessionId: string) => {
  return request.get<UserProfile>('/puzzle/profile', { params: { session_id: sessionId } });
};

export const getLeaderboard = (limit = 10) => {
  return request.get('/puzzle/leaderboard', { params: { limit } });
};
