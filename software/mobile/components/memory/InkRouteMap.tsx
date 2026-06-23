import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { ROUTE_SPOTS } from './constants';

export function InkRouteMap({ visitedSpotNames }: { visitedSpotNames: Set<string> }) {
  const nodeSpacing = 68;
  const totalWidth = (ROUTE_SPOTS.length - 1) * nodeSpacing + 40;
  const pathLength = (ROUTE_SPOTS.length - 1) * nodeSpacing;

  const drawProgress = useSharedValue(0);

  useEffect(() => {
    drawProgress.value = withTiming(1, { duration: 1500 });
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.routeMapScroll}
    >
      <View style={[styles.routeMapContainer, { width: totalWidth }]}>
        <Svg width={totalWidth} height={60} viewBox={`0 0 ${totalWidth} 60`}>
          {/* 墨迹路径 */}
          <Path
            d={`M 20,30 ${ROUTE_SPOTS.map((_, i) => i > 0 ? `L ${20 + i * nodeSpacing},30` : '').join(' ')}`}
            stroke={Colors.gray300}
            strokeWidth={2}
            fill="none"
            strokeDasharray={`${pathLength} ${pathLength}`}
            strokeDashoffset={pathLength * (1 - 1)}
            strokeLinecap="round"
          />
          {/* 已走过的路径 (深色) */}
          {(() => {
            let lastVisitedIdx = -1;
            ROUTE_SPOTS.forEach((s, i) => {
              if (visitedSpotNames.has(s.name)) lastVisitedIdx = i;
            });
            if (lastVisitedIdx <= 0) return null;
            const visitedLength = lastVisitedIdx * nodeSpacing;
            return (
              <Path
                d={`M 20,30 ${ROUTE_SPOTS.slice(1, lastVisitedIdx + 1).map((_, i) => `L ${20 + (i + 1) * nodeSpacing},30`).join(' ')}`}
                stroke={Colors.ink}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                opacity={0.7}
              />
            );
          })()}

          {/* 景点节点 */}
          {ROUTE_SPOTS.map((spot, i) => {
            const cx = 20 + i * nodeSpacing;
            const isVisited = visitedSpotNames.has(spot.name);
            return (
              <React.Fragment key={spot.name}>
                {isVisited && (
                  <Circle cx={cx} cy={30} r={10} fill={Colors.ink} opacity={0.08} />
                )}
                <Circle
                  cx={cx}
                  cy={30}
                  r={isVisited ? 6 : 5}
                  fill={isVisited ? Colors.ink : Colors.paperWarm}
                  stroke={isVisited ? Colors.ink : Colors.gray300}
                  strokeWidth={isVisited ? 2 : 1.5}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* 景点名称标签 */}
        <View style={styles.routeLabels}>
          {ROUTE_SPOTS.map((spot, i) => {
            const isVisited = visitedSpotNames.has(spot.name);
            return (
              <Text
                key={spot.name}
                style={[styles.routeLabel, {
                  left: 20 + i * nodeSpacing - 16,
                  color: isVisited ? Colors.ink : Colors.gray400,
                  fontWeight: isVisited ? '700' : '400',
                }]}
              >
                {spot.short}
              </Text>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  routeMapScroll: {
    paddingHorizontal: 8,
  },
  routeMapContainer: {
    height: 70,
    position: 'relative',
  },
  routeLabels: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    height: 20,
  },
  routeLabel: {
    position: 'absolute',
    fontSize: 10,
    textAlign: 'center',
    width: 32,
  },
});
