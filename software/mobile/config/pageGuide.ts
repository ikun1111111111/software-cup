/**
 * 页面导览配置
 * 每个页面一条配置，控制进入时的讲解行为
 */

export interface PageGuideConfig {
  pageId: string;
  guidePrompt: string;
  welcomeText: string;
  autoSpeak: boolean;
  quickQuestions: string[];
  locationTip?: string;
  guideType: 'auto' | 'manual' | 'none';
}

export const PAGE_GUIDE_MAP: Record<string, PageGuideConfig> = {
  '(tabs)/index': {
    pageId: 'home',
    guidePrompt: '欢迎来到灵山胜境！我是小灵，你的数字导览员。需要我为你介绍一下吗？',
    welcomeText: '欢迎来到灵山胜境！这里是太湖之滨的佛教文化圣地。灵山大佛高88米，是世界上最高的青铜立佛。景区还有梵宫、九龙灌浴等精彩景点。有什么想了解的，随时问我！',
    autoSpeak: false,
    quickQuestions: ['推荐一条游玩路线', '灵山大佛有多高？', '景区开放时间', '门票多少钱？'],
    guideType: 'auto',
  },

  '(tabs)/explore': {
    pageId: 'explore',
    guidePrompt: '这是云游胜境，我可以带你拍照识景、路线导航。',
    welcomeText: '欢迎来到云游胜境！在这里你可以拍照识别景点，获取实时导航。让我带你探索灵山的每一个角落。',
    autoSpeak: false,
    quickQuestions: ['拍照识景怎么用？', '附近有什么景点？', '推荐步行路线'],
    guideType: 'auto',
  },

  'attractions/index': {
    pageId: 'attractions',
    guidePrompt: '这里是景点大全，点击查看每个景点的详细介绍。',
    welcomeText: '这里是灵山景区的景点大全。灵山大佛、梵宫、九龙灌浴...每一个景点都有独特的故事。点击感兴趣的景点，我来为你详细讲解。',
    autoSpeak: true,
    quickQuestions: ['大佛有多高？', '梵宫里面有什么？', '九龙灌浴什么时候表演？', '哪个景点最适合拍照？'],
    guideType: 'auto',
  },

  'map': {
    pageId: 'map',
    guidePrompt: '这是景区导览地图，我会实时告诉你位置和推荐路线。',
    welcomeText: '这是灵山景区的导览地图。我会实时告诉你当前位置，推荐附近的景点和最佳游览路线。想去哪里，告诉我就好。',
    autoSpeak: true,
    quickQuestions: ['离我最近的景点？', '从这里到大佛怎么走？', '推荐步行路线', '洗手间在哪里？'],
    locationTip: '点击景点或告诉我你想去哪里',
    guideType: 'auto',
  },

  '(tabs)/memory': {
    pageId: 'memory',
    guidePrompt: '这里记录了你的旅行足迹和美好回忆。',
    welcomeText: '这里是你的旅行记忆。每一次到访、每一张照片，都成为了珍贵的回忆。让我帮你回顾这段美好的旅程。',
    autoSpeak: false,
    quickQuestions: ['我去过哪些景点？', '帮我生成旅程总结', '哪张照片最受欢迎？'],
    guideType: 'auto',
  },

  'history/index': {
    pageId: 'history',
    guidePrompt: '穿越千年，探索灵山的历史文化。',
    welcomeText: '欢迎来到时空穿越。灵山有着深厚的历史文化底蕴，从唐朝至今，见证了千年的佛教文化传承。让我带你了解灵山的故事。',
    autoSpeak: false,
    quickQuestions: ['灵山是什么时候建立的？', '讲讲唐朝的灵山', '灵山的佛教文化', '有哪些历史名人来过？'],
    guideType: 'auto',
  },

  'attractions/[id]': {
    pageId: 'attraction-detail',
    guidePrompt: '这是景点详情页，我可以为你详细讲解。',
    welcomeText: '欢迎来到这个景点。让我为你详细介绍这里的历史、特色和文化内涵。有任何疑问，随时问我。',
    autoSpeak: true,
    quickQuestions: ['讲一个这里的故事', '这里有什么传说？', '最佳游览时间？', '拍照最佳位置？'],
    guideType: 'auto',
  },

  '(tabs)/chat': {
    pageId: 'chat',
    guidePrompt: '',
    welcomeText: '',
    autoSpeak: false,
    quickQuestions: [],
    guideType: 'none',
  },
};

export function matchPageGuide(routeName: string): PageGuideConfig | null {
  if (PAGE_GUIDE_MAP[routeName]) {
    return PAGE_GUIDE_MAP[routeName];
  }

  for (const [pattern, config] of Object.entries(PAGE_GUIDE_MAP)) {
    const regexPattern = pattern
      .replace(/\[id\]/g, '[^/]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(routeName)) {
      return config;
    }
  }

  // Fallback: map common web paths to configs
  const pathFallback: Record<string, string> = {
    '/': '(tabs)/index',
    '/chat': '(tabs)/chat',
    '/explore': '(tabs)/explore',
    '/memory': '(tabs)/memory',
    '/attractions': 'attractions/index',
    '/map': 'map',
    '/history': 'history/index',
  };
  const mapped = pathFallback[routeName];
  if (mapped && PAGE_GUIDE_MAP[mapped]) {
    return PAGE_GUIDE_MAP[mapped];
  }

  return null;
}
