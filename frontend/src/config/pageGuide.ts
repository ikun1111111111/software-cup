/**
 * 页面讲解配置 — 每个页面的讲解词、快捷问题、是否自动朗读
 */

export interface PageGuideConfig {
  pageId: string;
  welcomeText: string;
  autoSpeak: boolean;
  quickQuestions: string[];
  /** 进入页面的引导提示（询问用户是否需要讲解） */
  guidePrompt: string;
}

const PAGE_GUIDE_MAP: Record<string, PageGuideConfig> = {
  '/': {
    pageId: 'home',
    guidePrompt: '欢迎来到灵山胜境！我是你的数字导览员小灵，需要我为你介绍一下吗？',
    welcomeText: '欢迎来到灵山胜境！这里是太湖之滨的佛教文化圣地，有高达88米的灵山大佛，有九龙灌浴的壮观表演，还有富丽堂皇的梵宫。让我带你一一探索吧！',
    autoSpeak: true,
    quickQuestions: ['推荐一条游玩路线', '灵山大佛有多高？', '景区门票多少钱？'],
  },
  '/attractions': {
    pageId: 'attractions',
    guidePrompt: '这里是灵山胜境的景点大全，想听我介绍一下各个景点吗？',
    welcomeText: '灵山胜境主要景点包括：灵山大佛——世界第一高青铜释迦牟尼立像，高88米；九龙灌浴——以佛教太子诞生为背景的主题表演；还有梵宫、五印坛城等佛教艺术殿堂，每一处都值得细细品味。',
    autoSpeak: true,
    quickQuestions: ['灵山大佛有多高？', '梵宫里有什么？', '哪个景点最适合拍照？'],
  },
  '/map': {
    pageId: 'map',
    guidePrompt: '这是景区导览地图，我可以帮你导航和推荐路线，需要我帮忙吗？',
    welcomeText: '这是灵山景区的导览地图，我会实时告诉你当前位置，并为你推荐最佳路线。告诉我你想去哪里，我来帮你指路！',
    autoSpeak: true,
    quickQuestions: ['离我最近的景点是哪个？', '从这里到大佛怎么走？', '推荐一条步行路线'],
  },
  '/recommend': {
    pageId: 'recommend',
    guidePrompt: '想让我为你推荐个性化的游玩路线吗？',
    welcomeText: '我可以根据你的时间、兴趣和体力，为你推荐最适合的游玩路线。半日游、一日游，或者带老人小孩的轻松路线，都可以定制。',
    autoSpeak: false,
    quickQuestions: ['半日游推荐', '带老人怎么走？', '最经典的路线是什么？'],
  },
  '/history': {
    pageId: 'history',
    guidePrompt: '这里是你的历史探索记录，想回顾一下吗？',
    welcomeText: '这里记录了你与灵山的每一次相遇，去过的景点、问过的问题，都成了珍贵的回忆。让我帮你回顾一下吧。',
    autoSpeak: false,
    quickQuestions: ['我之前去过哪些地方？', '有没有我没去过的景点？'],
  },
  '/memory': {
    pageId: 'memory',
    guidePrompt: '来看看你的旅行记忆册吧！',
    welcomeText: '你的每一次灵山之旅都被珍藏。穿越不同的时空，看看你与灵山的点点滴滴。',
    autoSpeak: false,
    quickQuestions: ['帮我润色这条记忆', '生成分享卡片'],
  },
};

/** 根据路由路径匹配讲解配置（前缀匹配） */
export function matchPageGuide(pathname: string): PageGuideConfig | null {
  // 精确匹配
  if (PAGE_GUIDE_MAP[pathname]) return PAGE_GUIDE_MAP[pathname];
  // 前缀匹配（如 /attractions/xxx 匹配 /attractions）
  for (const [route, config] of Object.entries(PAGE_GUIDE_MAP)) {
    if (route !== '/' && pathname.startsWith(route)) return config;
  }
  return null;
}

export default PAGE_GUIDE_MAP;
