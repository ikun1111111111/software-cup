export interface TravelTip {
  bestTime?: string;
  duration?: string;
  tips?: string[];
}

export const TRAVEL_TIPS: Record<string, TravelTip> = {
  'ling-shan-da-fo': {
    bestTime: '春秋季节（3-5月、9-11月）',
    duration: '1.5-2小时',
    tips: ['建议上午9点前登顶避开人流', '216级台阶较陡，穿舒适运动鞋', '夕阳时分拍摄大佛效果最佳'],
  },
  'fan-gong': {
    bestTime: '全天，演出时间 10:35/11:30/14:00/16:00',
    duration: '1.5-2小时',
    tips: ['《吉祥颂》演出时长20分钟，建议提前入场', '梵宫内禁止大声喧哗', '穹顶天象图需仰头观赏'],
  },
  'jiu-long-guan-yu': {
    bestTime: '每日4-5场表演，提前到达占位',
    duration: '30-45分钟',
    tips: ['表演约15分钟', '可在广场两侧接取龙头圣水', '雨天表演可能取消'],
  },
  'wu-yin-tan-cheng': {
    bestTime: '全天，光线充足时最佳',
    duration: '1-1.5小时',
    tips: ['顺时针转动转经筒', '五层顶层可俯瞰全景', '部分区域禁止拍照'],
  },
  'xiang-fu-chan-si': {
    bestTime: '清晨或傍晚',
    duration: '1-1.5小时',
    tips: ['秋季可赏千年银杏', '可参与撞钟祈福', '寺内保持安静'],
  },
  'fo-shou-guang-chang': {
    bestTime: '全天',
    duration: '20-30分钟',
    tips: ['触摸天下第一掌沾福气', '与大佛手掌合影'],
  },
  'bai-zi-xi-mi-le': {
    bestTime: '全天',
    duration: '15-20分钟',
    tips: ['触摸弥勒肚皮寓意福气', '亲子互动拍照佳处'],
  },
  'man-fei-long-ta': {
    bestTime: '全天，光线好时拍照佳',
    duration: '20-30分钟',
    tips: ['九塔组合全景需远距离拍摄', '可对比三大语系建筑差异'],
  },
  'ling-shan-jing-she': {
    bestTime: '用餐时间或清晨',
    duration: '1-2小时',
    tips: ['素斋自助50元/位', '可体验早课禅修', '需提前预约'],
  },
  'ling-shan-da-zhao-bi': {
    bestTime: '全天',
    duration: '10-15分钟',
    tips: ['景区入口第一处打卡点', '搭配太湖背景拍照'],
  },
  'pu-ti-da-dao': {
    bestTime: '春季菩提花开时',
    duration: '20-30分钟',
    tips: ['可捡拾菩提叶制作书签', '漫步林荫感受禅意'],
  },
  'wu-ming-qiao': {
    bestTime: '全天',
    duration: '10-15分钟',
    tips: ['拍摄石桥与香水海倒影', '驻足观赏桥栏雕刻'],
  },
  'fo-zu-tan': {
    bestTime: '全天',
    duration: '10-15分钟',
    tips: ['触摸足心吉祥图案', '解读32种瑞相寓意'],
  },
  'wu-zhi-men': {
    bestTime: '全天',
    duration: '10-15分钟',
    tips: ['穿门祈福感受恢弘气势', '解读门柱经文'],
  },
  'xiang-mo-fu-diao': {
    bestTime: '全天',
    duration: '15-20分钟',
    tips: ['观赏浮雕细节', '聆听降魔成道故事'],
  },
  'a-yu-wang-zhu': {
    bestTime: '全天',
    duration: '10-15分钟',
    tips: ['拍摄四狮柱头细节', '了解阿育王弘法历史'],
  },
  'fo-jiao-wen-hua-blan-guan': {
    bestTime: '全天',
    duration: '1-1.5小时',
    tips: ['三层万佛殿必看', '可体验智能导览'],
  },
  'san-sheng-dian': {
    bestTime: '全天',
    duration: '20-30分钟',
    tips: ['了解佛教历史文化'],
  },
  'wu-jin-yi-zhai': {
    bestTime: '上午或下午',
    duration: '30-45分钟',
    tips: ['可免费品鉴禅茶', '天井石桌石凳适合休憩'],
  },
};
