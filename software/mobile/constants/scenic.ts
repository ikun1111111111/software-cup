import { Colors } from './colors';

export const SPOT_IMAGES: Record<string, any> = {
  'ling-shan-da-fo': require('../assets/images/bigfo.png'),
  'jiu-long-guan-yu': require('../assets/images/nine-dragon.png'),
  'fan-gong': require('../assets/images/fangong.png'),
  'wu-yin-tan-cheng': require('../assets/images/wuyin.png'),
  'xiang-fu-chan-si': require('../assets/images/xiangfu.png'),
  'fo-shou-guang-chang': require('../assets/images/foshouguangchang.jpg'),
  'bai-zi-xi-mi-le': require('../assets/images/baizi.png'),
  'man-fei-long-ta': require('../assets/images/manfeilong.png'),
  'ling-shan-jing-she': require('../assets/images/jingshe.jpg'),
  'ling-shan-da-zhao-bi': require('../assets/images/dazhaobi.jpg'),
  'pu-ti-da-dao': require('../assets/images/putidadao.jpg'),
  'wu-ming-qiao': require('../assets/images/wumingqiao.jpg'),
  'fo-zu-tan': require('../assets/images/fozutai.jpg'),
  'wu-zhi-men': require('../assets/images/wuzhimen.jpg'),
  'xiang-mo-fu-diao': require('../assets/images/fudiao.jpg'),
  'a-yu-wang-zhu': require('../assets/images/yuzhu.png'),
  'fo-jiao-wen-hua-blan-guan': require('../assets/images/wuming.jpg'),
  'san-sheng-dian': require('../assets/images/sansheng.png'),
  'wu-jin-yi-zhai': require('../assets/images/wujinyizhai.jpg'),
};

export const ROUTE_TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string; desc?: string }> = {
  history: { label: '历史文化', color: Colors.ink, bg: '#F0EDE8', icon: '史', desc: '深度体验千年文化' },
  nature: { label: '自然风光', color: Colors.primary, bg: Colors.primaryBg, icon: '山', desc: '欣赏太湖风光' },
  family: { label: '亲子家庭', color: Colors.accent, bg: Colors.accentBg, icon: '乐', desc: '趣味互动体验' },
};

export const CAT_COLORS: Record<string, string> = {
  '核心景点': Colors.accent,
  '特色景点': Colors.primary,
  '文化设施': Colors.auxiliary,
};

export const CATEGORIES = [
  { key: '', label: '全部', icon: '全' },
  { key: '核心景点', label: '核心景点', icon: '核' },
  { key: '特色景点', label: '特色景点', icon: '特' },
  { key: '文化设施', label: '文化设施', icon: '文' },
];
