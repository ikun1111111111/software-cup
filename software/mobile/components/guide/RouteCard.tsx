import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

export interface RouteCardData {
  id: string;
  name: string;
  route_type: string;
  duration?: string;
  description: string;
  spots: Array<{ id: string; name: string }>;
  reason?: string;
}

interface Props {
  route: RouteCardData;
  reason?: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/** 路线推荐卡片：从底部上滑展示。 */
export const RouteCard: React.FC<Props> = ({ route, reason, onAccept, onDismiss }) => {
  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
      <Text style={styles.title}>{route.name}</Text>
      <Text style={styles.desc}>{route.description}</Text>

      <View style={styles.metaRow}>
        {route.route_type && <Text style={styles.tag}>{route.route_type}</Text>}
        {route.duration && <Text style={styles.duration}>⏱ {route.duration}</Text>}
      </View>

      {route.spots && route.spots.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spotsRow}
        >
          {route.spots.map((s, i) => (
            <View key={s.id} style={styles.spotChip}>
              <Text style={styles.spotIndex}>{i + 1}</Text>
              <Text style={styles.spotName}>{s.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>稍后再说</Text>
        </Pressable>
        <Pressable style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptText}>开始行程</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 90,
    backgroundColor: 'rgba(253, 251, 247, 0.98)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.15)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    marginBottom: 8,
  },
  reason: { fontSize: 11, color: Colors.gray500, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.primary, marginBottom: 6 },
  desc: { fontSize: 13, lineHeight: 20, color: Colors.gray600, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tag: {
    fontSize: 11,
    color: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(106,156,137,0.12)',
    overflow: 'hidden',
  },
  duration: { fontSize: 12, color: Colors.gray500 },
  spotsRow: { gap: 8, paddingBottom: 12 },
  spotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(106,156,137,0.08)',
  },
  spotIndex: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  spotName: { fontSize: 12, color: Colors.ink },
  actions: { flexDirection: 'row', gap: 8 },
  dismissBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.3)',
  },
  dismissText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  acceptBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

export default RouteCard;
