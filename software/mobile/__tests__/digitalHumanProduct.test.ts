import {
  DEFAULT_DIGITAL_HUMAN_VOICE_MODE,
  HOME_DIGITAL_HUMAN_LINES,
  MOBILE_DIGITAL_HUMAN_TABS,
  XIAOLING_ATTRACTION_COPY,
  XIAOLING_CHAT_COPY,
  XIAOLING_MAP_COPY,
  XIAOLING_MEMORY_COPY,
  XIAOLING_PROFILE_COPY,
  XIAOLING_ROUTE_COPY,
} from '../utils/digitalHumanProduct';

describe('mobile digital human product contract', () => {
  test('keeps the tab bar labels and pictographic icons', () => {
    expect(MOBILE_DIGITAL_HUMAN_TABS.map((tab) => tab.title)).toEqual([
      '首页',
      '小灵',
      '导览',
      '记忆',
      '我的',
    ]);
    expect(MOBILE_DIGITAL_HUMAN_TABS.map((tab) => tab.icon)).toEqual([
      '🏯',
      '💬',
      '🗺️',
      '📝',
      '🧘',
    ]);
  });

  test('defaults chat to audible digital human speech', () => {
    expect(['browser', 'tts']).toContain(DEFAULT_DIGITAL_HUMAN_VOICE_MODE);
  });

  test('home welcome lines introduce Xiaoling as the digital guide', () => {
    expect(HOME_DIGITAL_HUMAN_LINES[0].text).toContain('小灵');
    expect(HOME_DIGITAL_HUMAN_LINES[0].text).toContain('数字人导游');
    expect(HOME_DIGITAL_HUMAN_LINES[0].text).not.toContain('VRM');
    expect(HOME_DIGITAL_HUMAN_LINES[1].text).toContain('语音');
  });

  test('frames routes as Xiaoling-led planning and guiding', () => {
    expect(XIAOLING_ROUTE_COPY.pageTitle).toBe('小灵路线台');
    expect(XIAOLING_ROUTE_COPY.heroEyebrow).toContain('小灵');
    expect(XIAOLING_ROUTE_COPY.primaryCta).toBe('让小灵带路');
    expect(XIAOLING_ROUTE_COPY.secondaryCta).toBe('问小灵为什么');
  });

  test('frames map as the live Xiaoling navigation surface', () => {
    expect(XIAOLING_MAP_COPY.headerTitle).toBe('小灵正在带路');
    expect(XIAOLING_MAP_COPY.avatarLabel).toBe('小灵正在带路');
    expect(XIAOLING_MAP_COPY.primaryCta).toBe('听小灵讲');
    expect(XIAOLING_MAP_COPY.secondaryCta).toBe('小灵指路');
    expect(XIAOLING_MAP_COPY.demoLabel).toBe('小灵现场导览');
    expect(XIAOLING_MAP_COPY.demoArriveCta).toBe('我已到达');
    expect(XIAOLING_MAP_COPY.demoNarrationCta).toBe('开始讲解');
    expect(Object.values(XIAOLING_MAP_COPY).join(' ')).not.toMatch(/正文已切到|模拟|演示/);
  });

  test('frames attraction detail as arrival narration, questions, and memory', () => {
    expect(XIAOLING_ATTRACTION_COPY.heroBadge).toBe('小灵到点讲解');
    expect(XIAOLING_ATTRACTION_COPY.narrationCta).toBe('听小灵讲解');
    expect(XIAOLING_ATTRACTION_COPY.memoryCta).toBe('记录回忆');
    expect(XIAOLING_ATTRACTION_COPY.askSectionTitle).toBe('问小灵这一站');
  });

  test('frames chat as multimodal Xiaoling interaction', () => {
    expect(XIAOLING_CHAT_COPY.title).toBe('和小灵对话');
    expect(XIAOLING_CHAT_COPY.subtitle).toContain('语音');
    expect(XIAOLING_CHAT_COPY.inputPlaceholder).toBe('向小灵语音或文字提问...');
    expect(XIAOLING_CHAT_COPY.routeCta).toBe('让小灵规划路线');
  });

  test('frames memory as Xiaoling turning guide events into a travel album', () => {
    expect(XIAOLING_MEMORY_COPY.heroTitle).toBe('小灵回忆册');
    expect(XIAOLING_MEMORY_COPY.finaleTitle).toBe('小灵手账生成台');
    expect(XIAOLING_MEMORY_COPY.enrollCta).toBe('让小灵入册');
  });

  test('frames profile as Xiaoling guide profile and feedback insight', () => {
    expect(XIAOLING_PROFILE_COPY.title).toBe('我的小灵导览档案');
    expect(XIAOLING_PROFILE_COPY.feedbackTitle).toBe('游客反馈给小灵');
    expect(XIAOLING_PROFILE_COPY.feedbackOptions.map((item) => item.label)).toEqual([
      '讲解清楚',
      '路线合适',
      '还想追问',
    ]);
  });
});
