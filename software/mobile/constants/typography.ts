import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const Typography = {
  calligraphy: {
    fontFamily: isAndroid ? 'ZCOOLXiaoWei' : 'ZCOOL XiaoWei',
    fontWeight: '400' as const,
  },
  serif: {
    fontFamily: isAndroid ? 'NotoSerifSC' : 'Noto Serif SC',
    fontWeight: '400' as const,
  },
  serifBold: {
    fontFamily: isAndroid ? 'NotoSerifSC' : 'Noto Serif SC',
    fontWeight: '700' as const,
  },
  body: {
    fontFamily: isAndroid ? 'NotoSerifSC' : 'Noto Serif SC',
    fontWeight: '400' as const,
  },
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  display: 36,
  hero: 48,
} as const;
