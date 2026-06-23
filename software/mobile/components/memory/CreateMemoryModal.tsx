import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type Spot } from '@/api/spots';
import InlineModal from '@/components/ui/InlineModal';
import { MOOD_META, MOOD_OPTIONS } from './constants';

export default function CreateMemoryModal({ visible, onClose, onSubmit, spots, loading, initialSpotName, initialInput }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { user_input: string; spot_name?: string; mood_tag?: string }) => void;
  spots: Spot[];
  loading: boolean;
  initialSpotName?: string;
  initialInput?: string;
}) {
  const [input, setInput] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<string | undefined>();
  const [selectedMood, setSelectedMood] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setSelectedSpot(initialSpotName);
      setInput(initialInput || '');
    }
  }, [visible, initialSpotName, initialInput]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSubmit({
      user_input: input.trim(),
      spot_name: selectedSpot,
      mood_tag: selectedMood,
    });
  };

  const handleClose = () => {
    setInput('');
    setSelectedSpot(undefined);
    setSelectedMood(undefined);
    onClose();
  };

  return (
    <InlineModal visible={visible} animationType="slide">
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalHeader, { paddingTop: 48 }]}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text style={styles.modalCancel}>取消</Text>
          </Pressable>
          <Text style={styles.modalTitle}>写一条记忆</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalLabel}>描述你看到的、感受到的</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="比如：站在大佛脚下，仰望88米的青铜巨佛，内心无比震撼..."
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={input}
            onChangeText={setInput}
          />

          <Text style={styles.modalLabel}>关联景点（可选）</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spotScroll}>
            {spots.map((spot) => (
              <Pressable
                key={spot.id}
                style={({ pressed }) => [
                  styles.spotChip,
                  selectedSpot === spot.name && styles.spotChipActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedSpot(selectedSpot === spot.name ? undefined : spot.name)}
              >
                <Text style={[
                  styles.spotChipText,
                  selectedSpot === spot.name && styles.spotChipTextActive,
                ]} numberOfLines={1}>
                  {spot.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>你的心情</Text>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((mood) => {
              const meta = MOOD_META[mood];
              return (
                <Pressable
                  key={mood}
                  style={({ pressed }) => [
                    styles.moodOption,
                    selectedMood === mood && styles.moodOptionActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedMood(selectedMood === mood ? undefined : mood)}
                >
                  <Text style={styles.moodOptionEmoji}>{meta.emoji}</Text>
                  <Text style={[
                    styles.moodOptionLabel,
                    selectedMood === mood && styles.moodOptionLabelActive,
                  ]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Pressable
            style={({ pressed }) => [
              styles.modalSubmitBtn,
              (!input.trim() || loading) && styles.modalSubmitBtnDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSubmit}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.modalSubmitText}>✨ 数字人为你书写</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </InlineModal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: Colors.paper },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalCancel: { fontSize: 14, color: Colors.gray500 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.ink },
  modalBody: { flex: 1, padding: 16 },
  modalLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.ink, marginBottom: 8, marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#fff', borderRadius: Radius.md, padding: 14,
    fontSize: 14, color: Colors.ink, lineHeight: 22, minHeight: 120,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  spotScroll: { gap: 8 },
  spotChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#fff', borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  spotChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  spotChipText: { fontSize: 12, color: Colors.gray600 },
  spotChipTextActive: { color: '#fff', fontWeight: '600' },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodOption: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  moodOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  moodOptionEmoji: { fontSize: 22 },
  moodOptionLabel: { fontSize: 10, color: Colors.gray500 },
  moodOptionLabelActive: { color: Colors.primary, fontWeight: '600' },
  modalFooter: {
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  modalSubmitBtn: {
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  modalSubmitBtnDisabled: { opacity: 0.5 },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 1 },
});
