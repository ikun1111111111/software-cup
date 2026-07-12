import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface AuthBrandHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  compact?: boolean;
}

export function AuthBrandHeader({
  eyebrow,
  title,
  subtitle,
  compact = false,
}: AuthBrandHeaderProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.seal, compact && styles.sealCompact]} accessibilityElementsHidden>
        <Text style={[styles.sealText, compact && styles.sealTextCompact]}>灵</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  containerCompact: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seal: {
    width: 58,
    height: 58,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  sealCompact: {
    width: 48,
    height: 48,
    marginRight: 14,
    marginBottom: 0,
  },
  sealText: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '800',
  },
  sealTextCompact: {
    fontSize: 23,
  },
  copy: {
    flexShrink: 1,
  },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  title: {
    color: Colors.ink,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
  },
  titleCompact: {
    fontSize: 23,
    lineHeight: 30,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 7,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 3,
  },
});
