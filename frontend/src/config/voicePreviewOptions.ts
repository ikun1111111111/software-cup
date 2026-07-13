export type VoicePreviewId = 'mandarin' | 'female' | 'liaoning';

export interface VoicePreviewOption {
  id: VoicePreviewId;
  name: string;
  description: string;
  previewUrl: string;
}

export const VOICE_PREVIEW_OPTIONS: VoicePreviewOption[] = [
  {
    id: 'mandarin',
    name: '标准女声',
    description: '温柔清晰 · 稳重 · 标准普通话',
    previewUrl: '/audio/voice-previews/mandarin.mp3',
  },
  {
    id: 'female',
    name: '年轻女声',
    description: '青春明亮 · 轻快 · 更有活力',
    previewUrl: '/audio/voice-previews/female.mp3',
  },
  {
    id: 'liaoning',
    name: '东北女声',
    description: '亲切爽朗 · 地域感 · 更有记忆点',
    previewUrl: '/audio/voice-previews/liaoning.mp3',
  },
];
