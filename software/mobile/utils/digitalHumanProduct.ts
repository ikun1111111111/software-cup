export type MobileDigitalHumanTabName = 'index' | 'chat' | 'explore' | 'memory' | 'profile';
export type MobileDigitalHumanVoiceMode = 'silent' | 'browser' | 'tts';

function resolveDefaultVoiceMode(): MobileDigitalHumanVoiceMode {
  return 'tts';
}

export interface MobileDigitalHumanTab {
  name: MobileDigitalHumanTabName;
  title: string;
  icon: string;
}

export const MOBILE_DIGITAL_HUMAN_TABS: MobileDigitalHumanTab[] = [
  { name: 'index', title: '首页', icon: '🏯' },
  { name: 'chat', title: '小灵', icon: '💬' },
  { name: 'explore', title: '导览', icon: '🗺️' },
  { name: 'memory', title: '记忆', icon: '📝' },
  { name: 'profile', title: '我的', icon: '🧘' },
];

export const DEFAULT_DIGITAL_HUMAN_VOICE_MODE: MobileDigitalHumanVoiceMode =
  resolveDefaultVoiceMode();

export const HOME_DIGITAL_HUMAN_LINES = [
  {
    delay: 1000,
    text: '欢迎来到灵山胜境，我是你的数字人导游小灵。今天由我陪你问、走、听、记。',
    emotion: 'happy',
    duration: 5800,
    action: 'wave',
    actionDuration: 2200,
  },
  {
    delay: 7000,
    text: '你可以直接语音问我，也可以让我主动规划路线、沿途讲解、提醒打卡并生成旅行回忆。',
    emotion: 'relaxed',
    duration: 6400,
    action: 'explain',
    actionDuration: 2400,
  },
] as const;

export const XIAOLING_CHAT_COPY = {
  title: '和小灵对话',
  subtitle: '语音或文字提问，小灵会说话、做表情并回答。',
  tourQuickTitle: '小灵导览快捷操作',
  quickTitle: '问小灵这些问题',
  inputPlaceholder: '向小灵语音或文字提问...',
  routeCta: '让小灵规划路线',
  memoryCta: '小灵回忆',
  pauseCta: '暂停小灵',
  resumeCta: '继续小灵',
  endCta: '结束',
} as const;

export const XIAOLING_ROUTE_COPY = {
  pageKicker: 'DIGITAL ROUTE GUIDE',
  pageTitle: '小灵路线台',
  modePill: '小灵规划',
  heroEyebrow: '小灵正在规划路线',
  heroFallbackTitle: '让小灵带你走一条不绕路的路线',
  heroFallbackDescription: '小灵会按你的时间、兴趣和体力，把景点拆成可跟随的讲解节奏。',
  primaryCta: '让小灵带路',
  touringPrimaryCta: '继续小灵导览',
  secondaryCta: '问小灵为什么',
  cardCta: '听小灵讲这条',
  currentCardCta: '继续跟小灵走',
  sectionTitle: '按小灵的讲解风格筛选',
  loadingText: '小灵正在整理路线...',
  emptyText: '换个风格试试，或者让小灵先给你推荐全部路线。',
} as const;

export const XIAOLING_MAP_COPY = {
  headerKicker: 'LIVE DIGITAL GUIDE',
  headerTitle: '小灵正在带路',
  avatarLabel: '小灵正在带路',
  dockEyebrow: '数字人导览 · 小灵',
  beaconFallback: '点选景点，小灵讲解并带路',
  demoLabel: '小灵现场导览',
  demoText: '到达景点后，小灵会自动切换讲解、打卡和路线提示。',
  demoArriveCta: '我已到达',
  demoNarrationCta: '开始讲解',
  primaryCta: '听小灵讲',
  secondaryCta: '小灵指路',
  secondaryCtaNavigating: '刷新路线',
  askCta: '问小灵',
  detailCta: '景点详情',
  selectRouteCta: '选路线',
  continueRouteCta: '继续路线',
  routeRailTitle: '小灵推荐顺路看',
} as const;

export const XIAOLING_ATTRACTION_COPY = {
  heroBadge: '小灵到点讲解',
  narrationCta: '听小灵讲解',
  memoryCta: '记录回忆',
  askSectionTitle: '问小灵这一站',
  detailSectionTitle: '小灵讲解稿',
  tipsSectionTitle: '小灵游览提醒',
  checkInCta: '让小灵记录到访',
  checkedInCta: '小灵已记录',
  continueTourCta: '让小灵继续带路',
  endTourCta: '结束小灵导览',
} as const;

export const XIAOLING_MEMORY_COPY = {
  heroSub: 'XIAOLING TRAVEL MEMOIR',
  heroTitle: '小灵回忆册',
  finaleEyebrow: 'AI GUIDE MEMORY',
  finaleTitle: '小灵手账生成台',
  clueUnit: '条线索',
  emptyLine: '小灵会把问答、讲解、打卡整理成旅行回忆。',
  enrollCta: '让小灵入册',
  emptyEnrollCta: '暂无线索',
  summaryCta: '生成总结',
  shareCta: '分享手账',
  quickTitle: '开始小灵数字人导览',
  quickDesc: '小灵全程语音讲解、地图带路，并把问答与打卡沉淀成回忆素材。',
  quickCta: '让小灵带路',
  timelineTitle: '小灵记忆时光',
  mapTitle: '小灵记忆地图',
} as const;

export const XIAOLING_PROFILE_COPY = {
  title: '我的小灵导览档案',
  subtitle: '路线偏好、讲解节奏、反馈都会帮助小灵更懂你。',
  guestTitle: '登录后保存小灵导览档案',
  guestDesc: '登录后可同步打卡记录、旅行回忆、导览偏好和游客反馈。',
  statsTitle: '小灵导览统计',
  completedLabel: '已打卡',
  totalLabel: '路线站点',
  progressLabel: '完成度',
  feedbackTitle: '游客反馈给小灵',
  feedbackDesc: '这些反馈会回流为景区服务洞察，帮助优化路线、讲解和现场运营。',
  feedbackSuccess: '收到反馈，小灵会把它同步到运营洞察里。',
  feedbackOptions: [
    { key: 'clear_narration', label: '讲解清楚', insight: 'narration_quality' },
    { key: 'route_fit', label: '路线合适', insight: 'route_fit' },
    { key: 'needs_followup', label: '还想追问', insight: 'question_demand' },
  ],
  menu: {
    editProfile: '修改资料',
    password: '修改密码',
    guidePreference: '小灵偏好设置',
    logout: '退出登录',
  },
} as const;
