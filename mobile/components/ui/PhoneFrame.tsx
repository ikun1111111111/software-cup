import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

const PHONE_W = 390;
const PHONE_H = 844;
const NOTCH_W = 110;

export default function PhoneFrame({ children }: Props) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.outerBg}>
      <View style={styles.sidePanel}>
        <View style={styles.brandBlock}>
          <View style={styles.seal}>
            <Text style={{ fontSize: 28, color: 'rgba(200,75,49,0.9)', fontWeight: '900' }}>灵</Text>
          </View>
          <Text style={styles.brandName}>灵山胜境</Text>
          <Text style={styles.brandSub}>LINGSHAN SACRED LAND</Text>
        </View>
      </View>

      <View style={styles.phoneOuter}>
        <View style={[styles.phoneNotch, { left: (PHONE_W - NOTCH_W) / 2 }]} />
        <View style={styles.phoneScreen}>
          <View style={styles.phoneContent}>
            <View style={{ flex: 1, width: PHONE_W - 24, maxWidth: PHONE_W - 24 }}>
              {children}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sidePanel}>
        <View style={styles.specBlock}>
          {[
            { label: '框架', value: 'React Native + Expo' },
            { label: '路由', value: 'Expo Router' },
            { label: '动画', value: 'Reanimated' },
            { label: '状态', value: 'Zustand' },
          ].map((item) => (
            <View key={item.label} style={styles.specRow}>
              <Text style={styles.specLabel}>{item.label}</Text>
              <Text style={styles.specValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerBg: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1A17',
    paddingVertical: 20,
  },

  sidePanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    maxWidth: 280,
  },
  brandBlock: {
    alignItems: 'center',
  },
  seal: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: 'rgba(200,75,49,0.6)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  brandName: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: '600',
    marginTop: 16,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 8,
  },

  specBlock: {},
  specRow: {
    marginBottom: 20,
  },
  specLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 2,
  },
  specValue: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },

  phoneOuter: {
    width: PHONE_W,
    height: PHONE_H,
    backgroundColor: '#000',
    borderRadius: 50,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 30,
  },
  phoneNotch: {
    position: 'absolute',
    top: 12,
    width: NOTCH_W,
    height: 28,
    backgroundColor: '#000',
    borderRadius: 14,
    zIndex: 100,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#F7F5F0',
    borderRadius: 40,
    overflow: 'hidden',
  },
  phoneContent: {
    flex: 1,
  },
});
