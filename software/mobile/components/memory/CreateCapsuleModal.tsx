import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import InlineModal from '@/components/ui/InlineModal';

export default function CreateCapsuleModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; unlock_days: number }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState('给未来的自己');
  const [content, setContent] = useState('');
  const [unlockDays, setUnlockDays] = useState(30);

  const presetDays = [7, 30, 90, 365];

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({ title: title.trim() || '给未来的自己', content: content.trim(), unlock_days: unlockDays });
  };

  const handleClose = () => {
    setTitle('给未来的自己');
    setContent('');
    setUnlockDays(30);
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
          <Text style={styles.modalTitle}>🔮 记忆胶囊</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalLabel}>胶囊标题</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="给未来的自己..."
            placeholderTextColor={Colors.gray400}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.modalLabel}>写给未来的话</Text>
          <TextInput
            style={[styles.modalInput, { minHeight: 150 }]}
            placeholder="亲爱的未来的自己，当你打开这封信时..."
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={content}
            onChangeText={setContent}
          />

          <Text style={styles.modalLabel}>多久后打开？</Text>
          <View style={styles.capsuleDaysRow}>
            {presetDays.map((days) => (
              <Pressable
                key={days}
                style={({ pressed }) => [
                  styles.capsuleDayOption,
                  unlockDays === days && styles.capsuleDayOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setUnlockDays(days)}
              >
                <Text style={[
                  styles.capsuleDayText,
                  unlockDays === days && styles.capsuleDayTextActive,
                ]}>
                  {days < 30 ? `${days}天` : days < 365 ? `${days / 30}个月` : '1年'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.capsuleHintText}>
            💡 胶囊将在 {unlockDays} 天后解锁，届时你会收到提醒
          </Text>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Pressable
            style={({ pressed }) => [
              styles.modalSubmitBtn,
              (!content.trim() || loading) && styles.modalSubmitBtnDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSubmit}
            disabled={!content.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.modalSubmitText}>🔮 封存胶囊</Text>
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
  capsuleDaysRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  capsuleDayOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  capsuleDayOptionActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  capsuleDayText: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '500',
  },
  capsuleDayTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  capsuleHintText: {
    fontSize: 12,
    color: Colors.gray500,
    lineHeight: 18,
    marginTop: 8,
  },
});
