import React from 'react';
import {
  Image,
  View,
  StyleSheet,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { SPOT_IMAGES } from '@/constants/scenic';
import { LINGSHAN_SPOTS } from '@/data/lingshanSpots';

export const MEMORY_IMAGES = {
  chat: require('../../assets/images/memory/memory-chat-guide.png'),
  write: require('../../assets/images/memory/memory-write-scroll.png'),
  share: require('../../assets/images/memory/memory-share-poem.png'),
  capsule: require('../../assets/images/memory/memory-capsule-letter.png'),
  route: require('../../assets/images/memory/memory-route-overview.png'),
  photo: require('../../assets/images/memory/memory-photo-buddha.png'),
  map: require('../../assets/images/memory/memory-map-xuanzang.png'),
  seal: require('../../assets/images/memory/memory-seal-tang.png'),
} satisfies Record<string, ImageSourcePropType>;

export const MEMORY_ARTWORKS = [
  MEMORY_IMAGES.route,
  MEMORY_IMAGES.chat,
  MEMORY_IMAGES.photo,
  MEMORY_IMAGES.map,
  MEMORY_IMAGES.write,
  MEMORY_IMAGES.share,
  MEMORY_IMAGES.capsule,
] satisfies ImageSourcePropType[];

export function getMemoryArtwork(index = 0) {
  return MEMORY_ARTWORKS[Math.abs(index) % MEMORY_ARTWORKS.length];
}

export function getSpotImageByName(name?: string | null): ImageSourcePropType | null {
  const keyword = name?.trim();
  if (!keyword) return null;

  const spot = LINGSHAN_SPOTS.find((candidate) =>
    keyword === candidate.name
    || keyword.includes(candidate.name)
    || candidate.name.includes(keyword),
  );

  return spot ? (SPOT_IMAGES[spot.id] ?? null) : null;
}

type MemoryImageProps = {
  source: ImageSourcePropType;
  size?: number;
  width?: number;
  height?: number;
  radius?: number;
  fit?: 'cover' | 'contain';
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  children?: React.ReactNode;
};

export function MemoryImage({
  source,
  size = 44,
  width,
  height,
  radius = 12,
  fit = 'cover',
  style,
  imageStyle,
  children,
}: MemoryImageProps) {
  const finalWidth = width ?? size;
  const finalHeight = height ?? size;

  return (
    <View
      style={[
        styles.imageFrame,
        { width: finalWidth, height: finalHeight, borderRadius: radius },
        style,
      ]}
    >
      <Image
        source={source}
        style={[styles.image, { borderRadius: radius }, imageStyle]}
        resizeMode={fit}
      />
      {children}
    </View>
  );
}

export function MemoryRouteImage({
  width = 96,
  height = 68,
  radius = 14,
  style,
}: {
  width?: number;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <MemoryImage
      source={MEMORY_IMAGES.route}
      width={width}
      height={height}
      radius={radius}
      fit="cover"
      style={style}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 70" style={StyleSheet.absoluteFill}>
        <Line x1="8" y1="58" x2="30" y2="42" stroke="#FFF3D9" strokeWidth="4" strokeLinecap="round" />
        <Line x1="30" y1="42" x2="54" y2="48" stroke="#FFF3D9" strokeWidth="4" strokeLinecap="round" />
        <Line x1="54" y1="48" x2="76" y2="28" stroke="#FFF3D9" strokeWidth="4" strokeLinecap="round" />
        <Line x1="76" y1="28" x2="92" y2="22" stroke="#FFF3D9" strokeWidth="4" strokeLinecap="round" />
        {[['8', '58'], ['30', '42'], ['54', '48'], ['76', '28']].map(([cx, cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#FFFDF8" stroke="#FFF3D9" strokeWidth="2" />
        ))}
        <Circle cx="92" cy="22" r="5" fill={Colors.auxiliary} stroke="#FFFDF8" strokeWidth="2" />
      </Svg>
    </MemoryImage>
  );
}

export function MemorySeal({ size = 36, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <MemoryImage
      source={MEMORY_IMAGES.seal}
      size={size}
      radius={Math.round(size / 2)}
      fit="contain"
      style={[styles.sealFrame, style]}
    />
  );
}

const styles = StyleSheet.create({
  imageFrame: {
    overflow: 'hidden',
    backgroundColor: '#F4EBDD',
    borderWidth: 1,
    borderColor: 'rgba(212, 189, 152, 0.55)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  sealFrame: {
    backgroundColor: '#FFFDF8',
    borderColor: 'rgba(200,75,49,0.25)',
  },
});
