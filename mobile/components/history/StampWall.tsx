import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getStamps, type StampItem } from '@/api/puzzle';
import { Colors } from '@/constants/colors';

interface Props {
  sessionId: string;
}

export function StampWall({ sessionId }: Props) {
  const [stamps, setStamps] = useState<StampItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStamps(sessionId)
      .then((res) => {
        const data = (res as any).data ?? res;
        setStamps(data.stamps || []);
      })
      .catch(() => setStamps([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载印章...</Text>
      </View>
    );
  }

  const collected = stamps.filter((s) => s.collected).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔖 印章墙</Text>
        <Text style={styles.count}>
          {collected}/{stamps.length} 枚
        </Text>
      </View>

      <View style={styles.grid}>
        {stamps.map((stamp) => (
          <View
            key={stamp.id}
            style={[
              styles.stampCell,
              {
                backgroundColor: stamp.collected ? `${stamp.color}18` : 'rgba(0,0,0,0.03)',
                borderColor: stamp.collected ? stamp.color : '#ddd',
                borderWidth: stamp.collected ? 2 : 1,
                borderStyle: stamp.collected ? 'solid' : 'dashed',
                opacity: stamp.collected ? 1 : 0.4,
              },
            ]}
          >
            <Text style={styles.stampSymbol}>{stamp.symbol}</Text>
            <Text
              style={[
                styles.stampName,
                { color: stamp.collected ? stamp.color : '#999' },
              ]}
            >
              {stamp.name}
            </Text>
          </View>
        ))}
      </View>

      {collected === 0 && (
        <Text style={styles.emptyText}>游览景点并答对谜题即可收集印章 🔍</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: 40, justifyContent: 'center', alignItems: 'center',
  },
  loadingText: {
    fontSize: 14, color: Colors.gray400, marginTop: 12, letterSpacing: 2,
  },

  container: {
    backgroundColor: '#fff', borderRadius: 12, padding: 18,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 18, fontWeight: '600', color: Colors.ink,
  },
  count: {
    fontSize: 14, color: Colors.gray400,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  stampCell: {
    width: '30%', aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    padding: 8,
  },
  stampSymbol: {
    fontSize: 28, marginBottom: 4,
  },
  stampName: {
    fontSize: 10, fontWeight: '600', textAlign: 'center',
  },

  emptyText: {
    textAlign: 'center', color: Colors.gray400,
    marginTop: 16, fontSize: 14,
  },
});
