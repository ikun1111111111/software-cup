import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import React from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

const TAB_EMOJIS: Record<string, string> = {
  '启扉': '🏯', '问讯': '💬', '云游': '🗺️', '记忆': '📝', '我的': '🧘',
};

const TAB_IMAGES: Record<string, any> = {
  '启扉': require('../../assets/images/tabs/tab-home.png'),
  '问讯': require('../../assets/images/tabs/tab-chat.png'),
  '云游': require('../../assets/images/tabs/tab-explore.png'),
  '记忆': require('../../assets/images/tabs/tab-memory.png'),
  '我的': require('../../assets/images/tabs/tab-profile.png'),
};

const TabIcon = React.memo(function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const prevFocused = useSharedValue(focused);
  const bounce = useSharedValue(focused ? 1.15 : 1);
  const dotScale = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    if (prevFocused.value === focused) return;
    prevFocused.value = focused;
    if (focused) {
      bounce.value = withSequence(
        withSpring(1.35, { damping: 8, stiffness: 400 }),
        withSpring(1.15, { damping: 12, stiffness: 200 }),
      );
      dotScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } else {
      bounce.value = withTiming(1, { duration: 200 });
      dotScale.value = withTiming(0, { duration: 200 });
    }
  }, [focused, bounce, dotScale, prevFocused]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
    opacity: focused ? 1 : 0.5,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  return (
    <View style={styles.tabIcon}>
      {TAB_IMAGES[label] ? (
        <Animated.View style={[styles.tabImageWrap, emojiStyle]}>
          <Image source={TAB_IMAGES[label]} style={styles.tabImage} contentFit="cover" />
        </Animated.View>
      ) : (
        <Animated.Text style={[styles.tabEmoji, emojiStyle]}>
          {TAB_EMOJIS[label] || '📍'}
        </Animated.Text>
      )}
      <Animated.View style={[styles.inkDot, dotStyle]} />
    </View>
  );
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const renderIndexIcon = React.useCallback(({ focused }: { focused: boolean }) => <TabIcon label="启扉" focused={focused} />, []);
  const renderChatIcon = React.useCallback(({ focused }: { focused: boolean }) => <TabIcon label="问讯" focused={focused} />, []);
  const renderExploreIcon = React.useCallback(({ focused }: { focused: boolean }) => <TabIcon label="云游" focused={focused} />, []);
  const renderMemoryIcon = React.useCallback(({ focused }: { focused: boolean }) => <TabIcon label="记忆" focused={focused} />, []);
  const renderProfileIcon = React.useCallback(({ focused }: { focused: boolean }) => <TabIcon label="我的" focused={focused} />, []);

  return (
    <Tabs
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        animation: 'none',
        freezeOnBlur: true,
        lazy: true,
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
          tabBarIcon: renderIndexIcon,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '问讯',
          tabBarIcon: renderChatIcon,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '云游',
          tabBarIcon: renderExploreIcon,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: '记忆',
          tabBarIcon: renderMemoryIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: renderProfileIcon,
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
  tabImageWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    backgroundColor: '#F7F1E5',
  },
  tabImage: {
    width: '100%',
    height: '100%',
  },
  inkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 3,
  },
});
