import type { Emotion } from '@/components/vrm/VRMTypes';
import { TRAVEL_TIPS } from '@/data/travelTips';

export interface LocalKnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: 'spot' | 'show' | 'route' | 'ticket' | 'service' | 'history';
  priority: number;
  sourceLabel?: string;
  emotion?: Emotion;
}

export interface LocalKnowledgeMatch {
  entry: LocalKnowledgeEntry;
  score: number;
}

export interface LocalDemoAnswer {
  answer: string;
  displayAnswer: string;
  source: 'local-demo';
  sourceLabel: string;
  emotion: Emotion;
  category: LocalKnowledgeEntry['category'];
  score: number;
}

export interface LocalDemoAnswerContext {
  spotId?: string;
  spotName?: string;
}

const DEFAULT_SOURCE_LABEL = '灵山胜境资料包';

const LOCAL_KNOWLEDGE: LocalKnowledgeEntry[] = [
  {
    id: 'buddha-height',
    question: '灵山大佛有多高',
    answer: '灵山大佛高88米，是世界著名的露天青铜释迦牟尼立像，于1997年落成开光，是灵山胜境的标志性景观。',
    keywords: ['灵山大佛', '大佛', '多高', '高度', '88米', '释迦牟尼'],
    category: 'spot',
    priority: 10,
    emotion: 'surprised',
  },
  {
    id: 'fan-gong',
    question: '灵山梵宫有什么看点',
    answer: '灵山梵宫于2009年开放，被誉为佛教艺术殿堂，内部融合东阳木雕、敦煌壁画、扬州漆器、景泰蓝等传统工艺，《吉祥颂》演出也在梵宫圣坛进行。',
    keywords: ['梵宫', '看点', '佛教艺术', '吉祥颂', '2009', '东阳木雕', '景泰蓝'],
    category: 'spot',
    priority: 9,
    emotion: 'thinking',
  },
  {
    id: 'nine-dragons',
    question: '九龙灌浴什么时候表演',
    answer: '九龙灌浴再现释迦牟尼诞生的场景，通常每日有4到5场表演，建议以景区当天公告为准，并提前到达占位。',
    keywords: ['九龙灌浴', '九龙', '灌浴', '表演', '时间', '几点', '场次'],
    category: 'show',
    priority: 10,
    emotion: 'happy',
  },
  {
    id: 'auspicious-song',
    question: '吉祥颂演出时间',
    answer: '《吉祥颂》常见演出时间为10:35、11:30、14:00、16:00，约20分钟，具体以景区公告为准。',
    keywords: ['吉祥颂', '演出', '时间', '几点', '梵宫圣坛', '20分钟'],
    category: 'show',
    priority: 9,
    emotion: 'happy',
  },
  {
    id: 'classic-route',
    question: '推荐一条经典路线',
    answer: '经典路线可从南门进入，依次游览九龙灌浴、佛手广场、灵山大佛、梵宫、五印坛城，适合第一次来灵山的游客。',
    keywords: ['路线', '推荐', '经典', '第一次', '怎么玩', '南门', '五印坛城'],
    category: 'route',
    priority: 9,
    emotion: 'happy',
  },
  {
    id: 'family-route',
    question: '带孩子怎么玩',
    answer: '亲子路线建议选择九龙灌浴、佛手广场、百子戏弥勒、梵宫和五印坛城，节奏轻松，也方便孩子理解故事和拍照互动。',
    keywords: ['亲子', '孩子', '小孩', '带娃', '家庭', '百子戏弥勒', '轻松'],
    category: 'route',
    priority: 9,
    emotion: 'happy',
  },
  {
    id: 'ticket',
    question: '景区门票多少钱',
    answer: '灵山胜境门票和演出票价会随季节、活动和平台政策调整，建议以景区官方公告或购票页面为准。到现场前可以先确认开放时间和演出场次。',
    keywords: ['门票', '票价', '多少钱', '价格', '购票', '开放时间'],
    category: 'ticket',
    priority: 8,
    emotion: 'neutral',
  },
  {
    id: 'first-palm',
    question: '天下第一掌是什么',
    answer: '天下第一掌是灵山大佛右手按比例复制而成的景观，游客常在这里触摸佛手祈福，也很适合作为游览灵山大佛前的打卡点。',
    keywords: ['天下第一掌', '佛手', '第一掌', '祈福', '打卡'],
    category: 'spot',
    priority: 8,
    emotion: 'grateful',
  },
  {
    id: 'little-lingshan-history',
    question: '小灵山名称有什么来历',
    answer: '小灵山与唐代玄奘有关。相传玄奘西行归来后认为这里山水清秀、气象庄严，便有了“小灵山”的文化来历。',
    keywords: ['小灵山', '来历', '玄奘', '历史', '唐代', '西行'],
    category: 'history',
    priority: 8,
    emotion: 'thinking',
  },
  {
    id: 'food',
    question: '灵山有什么餐饮',
    answer: '灵山胜境内可关注素斋、简餐和景区餐饮点。节假日人流较大，建议错峰用餐，并随身带水。',
    keywords: ['餐饮', '吃饭', '素斋', '午饭', '用餐', '带水'],
    category: 'service',
    priority: 7,
    emotion: 'neutral',
  },
  {
    id: 'tips',
    question: '游览灵山要注意什么',
    answer: '建议提前查看天气和演出公告，穿舒适鞋子，热门演出提前到场。殿堂和礼佛区域请保持安静，遵守景区秩序。',
    keywords: ['注意', '注意事项', '天气', '舒适鞋', '提前', '安静', '秩序'],
    category: 'service',
    priority: 7,
    emotion: 'neutral',
  },
  {
    id: 'main-spots',
    question: '灵山胜境主要景点有哪些',
    answer: '灵山胜境的主要游览点包括九龙灌浴、佛手广场、天下第一掌、灵山大佛、灵山梵宫和五印坛城。第一次来可以按这条主线游览。',
    keywords: ['主要景点', '有哪些景点', '景点', '游览点', '灵山胜境', '主线'],
    category: 'spot',
    priority: 9,
    emotion: 'happy',
  },
  {
    id: 'five-mudra-mandala',
    question: '五印坛城是什么',
    answer: '五印坛城是灵山胜境内富有藏传佛教艺术特色的建筑景观，适合了解坛城文化、建筑装饰和佛教象征意义。',
    keywords: ['五印坛城', '坛城', '藏传佛教', '建筑', '象征'],
    category: 'spot',
    priority: 8,
    emotion: 'thinking',
  },
  {
    id: 'baizi-mile',
    question: '百子戏弥勒适合看什么',
    answer: '百子戏弥勒以弥勒文化和童趣互动为看点，氛围轻松，适合亲子游客停留拍照，也适合作为孩子理解佛教故事的入口。',
    keywords: ['百子戏弥勒', '弥勒', '孩子', '亲子', '拍照', '童趣'],
    category: 'spot',
    priority: 8,
    emotion: 'happy',
  },
  {
    id: 'opening-hours',
    question: '灵山胜境开放时间',
    answer: '灵山胜境开放时间会随季节和活动调整，出行前建议查看景区官方公告。若要看演出，也要同步确认九龙灌浴和《吉祥颂》的当日场次。',
    keywords: ['开放时间', '几点开门', '几点关门', '营业时间', '闭园', '公告'],
    category: 'service',
    priority: 8,
    emotion: 'neutral',
  },
  {
    id: 'transport',
    question: '怎么去灵山胜境',
    answer: '前往灵山胜境可根据出发地选择自驾、公交或旅游专线。比赛演示中建议用“到达景区入口”作为起点，再由数字人推荐园内路线。',
    keywords: ['怎么去', '交通', '公交', '自驾', '旅游专线', '入口'],
    category: 'service',
    priority: 8,
    emotion: 'neutral',
  },
  {
    id: 'parking',
    question: '灵山胜境停车方便吗',
    answer: '自驾游客建议提前查看景区停车场开放和收费信息，节假日尽量预留排队时间。到达后可以从入口开始按经典路线游览。',
    keywords: ['停车', '停车场', '自驾', '收费', '节假日', '排队'],
    category: 'service',
    priority: 7,
    emotion: 'neutral',
  },
  {
    id: 'half-day-route',
    question: '半天怎么玩灵山',
    answer: '半天路线建议抓主线：九龙灌浴、佛手广场、灵山大佛、梵宫、五印坛城。时间紧时可压缩拍照停留，把演出时间优先排进去。',
    keywords: ['半天', '半日', '时间紧', '主线', '怎么安排', '路线'],
    category: 'route',
    priority: 9,
    emotion: 'happy',
  },
  {
    id: 'one-hour-route',
    question: '只有一小时怎么玩',
    answer: '只有一小时建议优先看九龙灌浴和灵山大佛，中途经过佛手广场打卡。如果刚好赶上演出场次，就把九龙灌浴作为第一站。',
    keywords: ['一小时', '1小时', '时间很少', '快速', '必看', '来不及'],
    category: 'route',
    priority: 9,
    emotion: 'thinking',
  },
  {
    id: 'elderly-route',
    question: '老人游览灵山怎么安排',
    answer: '老人同行建议放慢节奏，优先选择九龙灌浴、佛手广场、灵山大佛和梵宫，减少来回折返，途中多安排休息点。',
    keywords: ['老人', '长辈', '腿脚', '休息', '慢一点', '少走路'],
    category: 'route',
    priority: 8,
    emotion: 'grateful',
  },
  {
    id: 'photo-route',
    question: '灵山哪里适合拍照',
    answer: '拍照打卡可重点选择九龙灌浴、佛手广场、天下第一掌、灵山大佛远景和梵宫外观。上午或傍晚光线更柔和。',
    keywords: ['拍照', '打卡', '出片', '照片', '哪里好看', '机位'],
    category: 'route',
    priority: 8,
    emotion: 'happy',
  },
  {
    id: 'best-season',
    question: '什么时候去灵山比较好',
    answer: '春秋季通常更适合游览，天气相对舒适。夏季注意防晒补水，冬季注意保暖；节假日建议提前购票并错峰入园。',
    keywords: ['什么时候去', '季节', '春天', '秋天', '夏天', '冬天', '错峰'],
    category: 'service',
    priority: 7,
    emotion: 'neutral',
  },
  {
    id: 'crowd-avoidance',
    question: '怎么避开人多',
    answer: '想避开人流，可以尽量选择工作日或上午较早入园，热门演出提前到场。节假日优先确认演出时间，再反推路线顺序。',
    keywords: ['人多', '排队', '避开', '错峰', '工作日', '节假日'],
    category: 'service',
    priority: 7,
    emotion: 'thinking',
  },
  {
    id: 'worship-etiquette',
    question: '礼佛有什么注意事项',
    answer: '礼佛区域建议保持安静，不大声喧哗，不随意触碰殿堂陈设，拍照请以现场提示为准。尊重礼仪会让游览体验更从容。',
    keywords: ['礼佛', '礼仪', '寺庙', '安静', '拍照', '殿堂'],
    category: 'service',
    priority: 8,
    emotion: 'grateful',
  },
  {
    id: 'rainy-day',
    question: '下雨天还能游览灵山吗',
    answer: '小雨天气仍可游览，但建议带好雨具、防滑鞋，并优先安排梵宫等室内点位。若遇强降雨，请以景区安全提示为准。',
    keywords: ['下雨', '雨天', '雨具', '室内', '防滑', '强降雨'],
    category: 'service',
    priority: 7,
    emotion: 'neutral',
  },
  {
    id: 'digital-guide-demo',
    question: '数字人可以怎么带我游览',
    answer: '小灵可以先根据你的时间和同行人推荐路线，再在到达景点时讲解故事；你也可以随时追问景点、演出、路线和服务信息。',
    keywords: ['数字人', '小灵', '导览', '怎么带我', '讲解', '追问'],
    category: 'service',
    priority: 8,
    emotion: 'happy',
  },
  {
    id: 'unknown-safe-answer',
    question: '资料里没有的问题怎么办',
    answer: '如果资料里没有可靠答案，我会明确说明没有找到依据，不会编造。联网后可以继续交给后端知识库检索。',
    keywords: ['不知道', '不清楚', '没有资料', '不会编造', '可靠答案'],
    category: 'service',
    priority: 6,
    emotion: 'thinking',
  },
];

const PUNCTUATION = /[\s,，.。?？!！:：;；"'“”‘’()（）[\]【】《》、-]/g;
const BEST_TIME_INTENT = /(最佳|最好|适合|推荐|建议).*(游览|参观|去|时间|时段|时候)|(游览|参观).*(时间|时段|时候)/;
const DURATION_INTENT = /(游览|参观|停留|逛).*(多久|多长|时长)|(多久|多长时间|几小时)/;
const TIPS_INTENT = /(注意|提醒|攻略|建议|小贴士|要点)/;

function normalizeText(text: string): string {
  return text.toLowerCase().replace(PUNCTUATION, '');
}

function formatDisplayAnswer(answer: string): string {
  return answer;
}

function getSpotContextAnswer(question: string, context?: LocalDemoAnswerContext): LocalDemoAnswer | null {
  if (!context?.spotId) return null;
  const tips = TRAVEL_TIPS[context.spotId];
  if (!tips) return null;

  const spotName = context.spotName || '这一站';
  if (DURATION_INTENT.test(question) && tips.duration) {
    const answer = `${spotName}建议游览${tips.duration}。${tips.bestTime ? `如果安排行程，${tips.bestTime}更合适。` : ''}`;
    return {
      answer,
      displayAnswer: formatDisplayAnswer(answer),
      source: 'local-demo',
      sourceLabel: '景点详情游览提示',
      emotion: 'neutral',
      category: 'route',
      score: 12,
    };
  }

  if (BEST_TIME_INTENT.test(question) && tips.bestTime) {
    const answer = `${spotName}的最佳游览时间是${tips.bestTime}。${tips.duration ? `建议停留${tips.duration}。` : ''}`;
    return {
      answer,
      displayAnswer: formatDisplayAnswer(answer),
      source: 'local-demo',
      sourceLabel: '景点详情游览提示',
      emotion: 'happy',
      category: 'service',
      score: 12,
    };
  }

  if (TIPS_INTENT.test(question) && tips.tips?.length) {
    const answer = `${spotName}游览建议：${tips.tips.join('；')}。`;
    return {
      answer,
      displayAnswer: formatDisplayAnswer(answer),
      source: 'local-demo',
      sourceLabel: '景点详情游览提示',
      emotion: 'thinking',
      category: 'service',
      score: 12,
    };
  }

  return null;
}

function scoreEntry(normalizedQuestion: string, entry: LocalKnowledgeEntry): number {
  let score = 0;
  const normalizedEntryQuestion = normalizeText(entry.question);

  if (normalizedQuestion.includes(normalizedEntryQuestion) || normalizedEntryQuestion.includes(normalizedQuestion)) {
    score += 6;
  }

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;
    if (normalizedQuestion.includes(normalizedKeyword)) {
      score += normalizedKeyword.length >= 3 ? 3 : 2;
    }
  }

  if (normalizedQuestion.includes(entry.category)) {
    score += 1;
  }

  return score + entry.priority / 20;
}

export function findLocalKnowledgeAnswer(question: string): LocalKnowledgeMatch | null {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return null;

  const best = LOCAL_KNOWLEDGE
    .map((entry) => ({ entry, score: scoreEntry(normalizedQuestion, entry) }))
    .sort((a, b) => b.score - a.score)[0];

  return best && best.score >= 3 ? best : null;
}

export function getLocalDemoAnswer(question: string, context?: LocalDemoAnswerContext): LocalDemoAnswer | null {
  const contextAnswer = getSpotContextAnswer(question, context);
  if (contextAnswer) return contextAnswer;

  const match = findLocalKnowledgeAnswer(question);
  if (!match) return null;

  const sourceLabel = match.entry.sourceLabel ?? DEFAULT_SOURCE_LABEL;

  return {
    answer: match.entry.answer,
    displayAnswer: formatDisplayAnswer(match.entry.answer),
    source: 'local-demo' as const,
    sourceLabel,
    emotion: match.entry.emotion ?? 'neutral',
    category: match.entry.category,
    score: match.score,
  };
}

export function getOfflineFallbackAnswer(question: string, context?: LocalDemoAnswerContext): LocalDemoAnswer {
  const localAnswer = getLocalDemoAnswer(question, context);
  if (localAnswer) return localAnswer;

  const sourceLabel = '移动端本地演示知识库';
  const answer = '这个问题我在本地演示知识库里还没有找到可靠答案，可以换个问法，或等联网后由知识库继续检索。';

  return {
    answer,
    displayAnswer: formatDisplayAnswer(answer),
    source: 'local-demo' as const,
    sourceLabel,
    emotion: 'thinking' as Emotion,
    category: 'service' as const,
    score: 0,
  };
}

export function getLocalKnowledgeEntryCount(): number {
  return LOCAL_KNOWLEDGE.length;
}
