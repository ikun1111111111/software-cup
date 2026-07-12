import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

interface AuthScreenShellProps {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function AuthScreenShell({ children, contentStyle }: AuthScreenShellProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isNarrow = width < 360;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <View pointerEvents="none" style={styles.mountainWash} />
      <View pointerEvents="none" style={styles.goldMist} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isNarrow ? 16 : 24,
            paddingTop: 32 + insets.top,
            paddingBottom: 32 + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, Platform.OS === 'web' && styles.webContent, contentStyle]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
  },
  webContent: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  mountainWash: {
    position: 'absolute',
    left: -80,
    right: 40,
    bottom: -72,
    height: 210,
    borderTopRightRadius: 180,
    backgroundColor: Colors.primaryBg,
    opacity: 0.72,
    transform: [{ rotate: '-4deg' }],
  },
  goldMist: {
    position: 'absolute',
    width: 180,
    height: 180,
    right: -86,
    top: -54,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: Colors.gold,
    opacity: 0.18,
  },
});
