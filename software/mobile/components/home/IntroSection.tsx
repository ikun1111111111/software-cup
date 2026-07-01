import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

export default function IntroSection() {
  const text1Opacity = useSharedValue(0);
  const text1TranslateY = useSharedValue(20);
  const text2Opacity = useSharedValue(0);
  const text2TranslateY = useSharedValue(20);
  const breath = useSharedValue(0.3);

  useEffect(() => {
    const text1Timer = setTimeout(() => {
      text1Opacity.value = withTiming(1, { duration: 600 });
      text1TranslateY.value = withTiming(0, { duration: 600 });
    }, 220);
    const text2Timer = setTimeout(() => {
      text2Opacity.value = withTiming(1, { duration: 600 });
      text2TranslateY.value = withTiming(0, { duration: 600 });
    }, 420);
    return () => {
      clearTimeout(text1Timer);
      clearTimeout(text2Timer);
    };
  }, [text1Opacity, text1TranslateY, text2Opacity, text2TranslateY]);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const text1Style = useAnimatedStyle(() => ({
    opacity: text1Opacity.value,
    transform: [{ translateY: text1TranslateY.value }],
  }));

  const text2Style = useAnimatedStyle(() => ({
    opacity: text2Opacity.value,
    transform: [{ translateY: text2TranslateY.value }],
  }));

  const cornerStyle = useAnimatedStyle(() => ({
    opacity: breath.value,
  }));

  return (
    <View style={styles.intro}>
      <View style={styles.inkBlot1} />
      <View style={styles.inkBlot2} />
      <Animated.View style={[styles.cornerTL, cornerStyle]} />
      <Animated.View style={[styles.cornerTR, cornerStyle]} />
      <Animated.View style={[styles.cornerBL, cornerStyle]} />
      <Animated.View style={[styles.cornerBR, cornerStyle]} />
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>关于灵山</Text>
        <Text style={styles.secSub}>ABOUT LINGSHAN</Text>
        <View style={styles.secLine} />
      </View>
      <Animated.Text style={[styles.introTxt, text1Style]}>
        灵山胜境，坐落于太湖之滨，是中国著名的佛教文化圣地。高达88米的灵山大佛、九龙灌浴、梵宫、五印坛城等众多景点，蕴含深厚的佛教文化底蕴。
      </Animated.Text>
      <Animated.Text style={[styles.introTxt, text2Style]}>
        走进灵山，仿佛步入一幅流动的山水画卷。晨钟暮鼓，梵音缭绕，让心灵在这片净土中找到归宿。
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: 22, paddingTop: 28, paddingBottom: 28,
    backgroundColor: Colors.paper, position: 'relative', overflow: 'hidden',
  },
  inkBlot1: {
    position: 'absolute', top: -30, left: -20,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(107,162,146,0.06)',
  },
  inkBlot2: {
    position: 'absolute', bottom: -20, right: -30,
    width: 250, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(42,77,110,0.04)',
  },
  cornerTL: { position: 'absolute', top: 14, left: 14, width: 18, height: 18, borderTopWidth: 2, borderLeftWidth: 2, borderColor: Colors.primary },
  cornerTR: { position: 'absolute', top: 14, right: 14, width: 18, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderColor: Colors.primary },
  cornerBL: { position: 'absolute', bottom: 14, left: 14, width: 18, height: 18, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: Colors.primary },
  cornerBR: { position: 'absolute', bottom: 14, right: 14, width: 18, height: 18, borderBottomWidth: 2, borderRightWidth: 2, borderColor: Colors.primary },
  introTxt: { fontSize: 13, lineHeight: 24, color: Colors.gray600, textAlign: 'justify', marginBottom: 14 },
  secHead: { alignItems: 'center', marginBottom: 20 },
  secTitle: { fontSize: 20, fontWeight: '700', color: Colors.ink, letterSpacing: 4 },
  secSub: { fontSize: 9, letterSpacing: 3, color: Colors.gray400, marginTop: 5 },
  secLine: { width: 28, height: 2, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 10, opacity: 0.6 },
});
