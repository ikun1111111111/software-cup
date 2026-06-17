import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, withDelay, Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

const TAB_EMOJIS: Record<string, string> = {
  '启扉': '🏯', '问讯': '💬', '云游': '🗺️', '记忆': '📝',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const prevFocused = useSharedValue(focused);
  const bounce = useSharedValue(focused ? 1.15 : 1);
  const breath = useSharedValue(1);
  const dotScale = useSharedValue(focused ? 1 : 0);

  // Trigger bounce + haptic on focus change
  if (prevFocused.value !== focused) {
    prevFocused.value = focused;
    if (focused) {
      bounce.value = withSequence(
        withSpring(1.35, { damping: 8, stiffness: 400 }),
        withSpring(1.15, { damping: 12, stiffness: 200 }),
      );
      dotScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      bounce.value = withTiming(1, { duration: 200 });
      dotScale.value = withTiming(0, { duration: 200 });
    }
  }

  // Breathing animation for unfocused tabs
  if (!focused) {
    breath.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  } else {
    breath.value = withTiming(1, { duration: 200 });
  }

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: focused ? bounce.value : breath.value },
    ],
    opacity: focused ? 1 : 0.5,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  return (
    <View style={styles.tabIcon}>
      <Animated.Text style={[styles.tabEmoji, emojiStyle]}>
        {TAB_EMOJIS[label] || '📍'}
      </Animated.Text>
      <Animated.View style={[styles.inkDot, dotStyle]} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: [styles.tabBar, { paddingBottom: insets.bottom + 8 }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '启扉',
          tabBarIcon: ({ focused }) => <TabIcon label="启扉" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '问讯',
          tabBarIcon: ({ focused }) => <TabIcon label="问讯" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '云游',
          tabBarIcon: ({ focused }) => <TabIcon label="云游" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: '记忆',
          tabBarIcon: ({ focused }) => <TabIcon label="记忆" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: Colors.borderLight,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 6,
    paddingBottom: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
  },
  tabItem: {
    gap: 1,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 20,
  },
  inkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 3,
  },
});
