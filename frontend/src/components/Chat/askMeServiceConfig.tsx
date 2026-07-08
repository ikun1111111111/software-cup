import React from 'react';
import {
  BookOutlined,
  CarOutlined,
  CarryOutOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ThemeTopic } from '../../types/themeCards';

export type ServiceScenario =
  | 'route'
  | 'spot'
  | 'ticket'
  | 'show'
  | 'food'
  | 'story'
  | 'support';

export interface ScenarioSubItem {
  id: ThemeTopic;
  label: string;
  hint: string;
  defaultQuestion: string;
}

export interface ScenarioItem {
  id: ServiceScenario;
  label: string;
  shortLabel: string;
  eyebrow: string;
  description: string;
  topic: ThemeTopic;
  defaultQuestion: string;
  deliverable: string;
  evidence: string;
  nextAction: string;
  accent: string;
  icon: React.ReactNode;
  subItems?: ScenarioSubItem[];
  prompts: Array<{
    title: string;
    question: string;
  }>;
}

export const SERVICE_SCENARIOS: ScenarioItem[] = [
  {
    id: 'route',
    label: '路线规划',
    shortLabel: '路线',
    eyebrow: '偏好 → 路线 → 讲解',
    description: '按时间、体力、亲子/人文/自然偏好生成差异化游览方案。',
    topic: 'route',
    defaultQuestion: '我想游览灵山胜境，请根据自然风光、人文历史、亲子休闲三个偏好推荐一条路线，并说明每一站讲解重点。',
    deliverable: '个性化路线卡',
    evidence: '结合景区景点资料与路线知识库',
    nextAction: '可继续追问“少走路版/亲子版/半日版”。',
    accent: '#2D8B57',
    icon: <CompassOutlined />,
    prompts: [
      { title: '半日精华', question: '我只有半天时间，请推荐一条灵山胜境精华路线。' },
      { title: '亲子轻松', question: '带孩子游灵山胜境，有没有轻松、不赶路的亲子路线？' },
      { title: '人文深度', question: '我偏好人文历史，请推荐一条讲解更丰富的路线。' },
    ],
  },
  {
    id: 'spot',
    label: '景点介绍',
    shortLabel: '讲解',
    eyebrow: '景点 → 亮点 → 口播',
    description: '围绕灵山大佛、梵宫、九龙灌浴等景点给出事实讲解。',
    topic: 'spot',
    defaultQuestion: '请介绍灵山大佛、梵宫和九龙灌浴这几个核心景点，并告诉我最值得看的细节。',
    deliverable: '景点知识卡',
    evidence: '来自官方示范景区资料包与知识库',
    nextAction: '可继续点名某个景点做 1 分钟导游词。',
    accent: '#2A4D6E',
    icon: <EnvironmentOutlined />,
    prompts: [
      { title: '大佛高度', question: '灵山大佛有多高？有什么文化寓意？' },
      { title: '梵宫看点', question: '梵宫最值得看的地方有哪些？' },
      { title: '定点讲解', question: '请用导游口吻讲解九龙灌浴。' },
    ],
  },
  {
    id: 'ticket',
    label: '票务交通',
    shortLabel: '票务',
    eyebrow: '票价 → 开放 → 到达',
    description: '查询门票、开放时间、交通到达与入园注意事项。',
    topic: 'ticket',
    defaultQuestion: '灵山胜境门票、开放时间和交通方式是什么？请按游客出行前需要知道的信息整理。',
    deliverable: '票务交通卡',
    evidence: '优先匹配 FAQ 与结构化票务资料',
    nextAction: '可继续追问停车、退票、发票或老人儿童票。',
    accent: '#C84B31',
    icon: <CarOutlined />,
    prompts: [
      { title: '门票价格', question: '灵山胜境门票多少钱？老人和儿童有什么优惠？' },
      { title: '开放时间', question: '灵山胜境今天一般几点开放？几点停止入园？' },
      { title: '怎么到达', question: '从无锡市区怎么去灵山胜境比较方便？' },
    ],
  },
  {
    id: 'show',
    label: '演出活动',
    shortLabel: '活动',
    eyebrow: '时间 → 位置 → 提醒',
    description: '整理九龙灌浴等活动时间、观看位置与排队建议。',
    topic: 'ticket',
    defaultQuestion: '九龙灌浴今天一般几点表演？最佳观看位置在哪里？需要提前多久到？',
    deliverable: '活动提醒卡',
    evidence: '结合景区活动说明与实用问答',
    nextAction: '可继续追问“雨天是否取消/附近怎么走”。',
    accent: '#C8A951',
    icon: <FieldTimeOutlined />,
    prompts: [
      { title: '表演时间', question: '九龙灌浴今天一般几点表演？' },
      { title: '观看位置', question: '九龙灌浴最佳观看位置在哪里？' },
      { title: '游览衔接', question: '看完九龙灌浴后下一站去哪里最顺路？' },
    ],
  },
  {
    id: 'food',
    label: '餐饮推荐',
    shortLabel: '餐饮',
    eyebrow: '口味 → 位置 → 预算',
    description: '按口味、距离、预算推荐景区内外餐饮与休息点。',
    topic: 'food',
    defaultQuestion: '灵山胜境周边有什么适合游客的餐饮推荐？请按距离、口味和人均预算整理。',
    deliverable: '餐饮地图卡',
    evidence: '调用餐饮 POI 与游客问答资料',
    nextAction: '可继续追问素食、亲子、低预算或排队少。',
    accent: '#B87333',
    icon: <CoffeeOutlined />,
    prompts: [
      { title: '附近美食', question: '附近有什么美食推荐？请按离景区近的优先。' },
      { title: '素食推荐', question: '灵山胜境附近有没有适合素食或清淡口味的餐厅？' },
      { title: '带娃吃饭', question: '带孩子游玩，附近有哪些更适合亲子用餐的地方？' },
    ],
  },
  {
    id: 'story',
    label: '灵山故事',
    shortLabel: '文化',
    eyebrow: '历史 → 文化 → 故事',
    description: '讲述灵山佛教文化、建筑意象与历史背景，让问答更有温度。',
    topic: 'history',
    defaultQuestion: '请讲讲灵山胜境的历史文化背景，用适合游客听的方式讲解。',
    deliverable: '文化时间线卡',
    evidence: '来自历史文化章节与讲解词',
    nextAction: '可继续选择“历史文化”或“佛教文化”深入讲解。',
    accent: '#8C5E3C',
    icon: <ReadOutlined />,
    subItems: [
      {
        id: 'history',
        label: '历史文化',
        hint: '从景区形成与人文背景讲起',
        defaultQuestion: '灵山胜境有什么历史文化背景？请按时间线讲解。',
      },
      {
        id: 'culture',
        label: '佛教文化',
        hint: '解释佛教意象与礼佛路线',
        defaultQuestion: '灵山胜境的佛教文化有哪些特色？游客参观时应该怎么看懂？',
      },
    ],
    prompts: [
      { title: '时间线', question: '灵山胜境有什么历史？请用时间线讲解。' },
      { title: '佛教文化', question: '灵山胜境的佛教文化有哪些特色？' },
      { title: '故事讲解', question: '请讲一个适合在灵山大佛前听的文化故事。' },
    ],
  },
  {
    id: 'support',
    label: '常见问题',
    shortLabel: '帮助',
    eyebrow: 'FAQ → 服务 → 反馈',
    description: '处理退票、发票、寄存、无障碍、游客服务等高频问题。',
    topic: 'general',
    defaultQuestion: '请整理灵山胜境游客常见问题，包括退票、开发票、寄存、无障碍和服务中心。',
    deliverable: 'FAQ 服务卡',
    evidence: '优先命中 FAQ，沉淀满意度反馈',
    nextAction: '回答后可点赞/点踩，进入后台满意度分析。',
    accent: '#6A6258',
    icon: <CustomerServiceOutlined />,
    prompts: [
      { title: '退票发票', question: '灵山胜境怎么退票？怎么开发票？' },
      { title: '游客服务', question: '景区有没有寄存、母婴室和无障碍服务？' },
      { title: '弱网导览', question: '景区信号不好时，哪些导览信息可以提前离线查看？' },
    ],
  },
];

export const ASK_ME_SUGGESTIONS = [
  {
    id: 'route-half-day',
    title: '半日路线',
    detail: '按时间与偏好规划',
    question: '我只有半天时间，请推荐一条灵山胜境精华路线。',
    topic: 'route' as ThemeTopic,
    scenarioId: 'route' as ServiceScenario,
    accent: '#2D8B57',
    icon: <CompassOutlined />,
  },
  {
    id: 'spot-story',
    title: '景点讲解',
    detail: '大佛、梵宫、九龙灌浴',
    question: '请讲讲灵山大佛和梵宫最值得看的地方。',
    topic: 'spot' as ThemeTopic,
    scenarioId: 'spot' as ServiceScenario,
    accent: '#2A4D6E',
    icon: <ReadOutlined />,
  },
  {
    id: 'ticket-traffic',
    title: '票务交通',
    detail: '门票、开放、到达',
    question: '灵山胜境门票、开放时间和交通方式是什么？',
    topic: 'ticket' as ThemeTopic,
    scenarioId: 'ticket' as ServiceScenario,
    accent: '#C84B31',
    icon: <CarOutlined />,
  },
  {
    id: 'show-time',
    title: '演出活动',
    detail: '时间、位置、排队建议',
    question: '九龙灌浴今天一般几点表演？最佳观看位置在哪里？',
    topic: 'ticket' as ThemeTopic,
    scenarioId: 'show' as ServiceScenario,
    accent: '#C8A951',
    icon: <ClockCircleOutlined />,
  },
];

export const SERVICE_PROMISES = [
  { label: '语音/文字输入', value: '双模态', icon: <CarryOutOutlined /> },
  { label: '知识库检索', value: '可追溯', icon: <BookOutlined /> },
  { label: '数字人口播', value: '表情口型', icon: <SafetyCertificateOutlined /> },
];

export function findScenarioByTopic(topic?: string | null): ScenarioItem | undefined {
  if (!topic) return undefined;
  return SERVICE_SCENARIOS.find((scenario) =>
    scenario.topic === topic || scenario.subItems?.some((subItem) => subItem.id === topic)
  );
}
