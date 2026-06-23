import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export interface GuidePreferences {
  enableNearbyPrompt: boolean;
  enableIdlePrompt: boolean;
  enableDetourPrompt: boolean;
  promptFrequency: 'low' | 'medium' | 'high';
  autoNarrate: boolean;
  narrationSpeed: 'slow' | 'normal' | 'fast';
  dndMode: boolean;
  dndSchedule?: {
    start: string;
    end: string;
  };
  preferredRole: string;
  preferredRouteType: string;
}

const DEFAULT_PREFERENCES: GuidePreferences = {
  enableNearbyPrompt: true,
  enableIdlePrompt: true,
  enableDetourPrompt: true,
  promptFrequency: 'medium',
  autoNarrate: false,
  narrationSpeed: 'normal',
  dndMode: false,
  preferredRole: '小灵',
  preferredRouteType: 'classic-tour',
};

interface Props {
  preferences?: GuidePreferences;
  onSave: (prefs: GuidePreferences) => void;
  onClose: () => void;
}

/**
 * 向导偏好设置页面
 * 控制提示策略、讲解模式、免打扰等
 */
export const GuideSettings: React.FC<Props> = ({
  preferences = DEFAULT_PREFERENCES,
  onSave,
  onClose,
}) => {
  const [prefs, setPrefs] = useState<GuidePreferences>(preferences);

  const updatePref = <K extends keyof GuidePreferences>(
    key: K,
    value: GuidePreferences[K],
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(prefs);
    onClose();
  };

  const handleReset = () => {
    Alert.alert('重置设置', '确定要恢复默认设置吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: () => setPrefs(DEFAULT_PREFERENCES),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>✕ 取消</Text>
        </Pressable>
        <Text style={styles.headerTitle}>向导设置</Text>
        <Pressable onPress={handleSave} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, styles.saveBtn]}>✓ 保存</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 主动提示 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 主动提示</Text>
          <Text style={styles.sectionDesc}>数字人会在以下场景主动提示您</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>接近景点提示</Text>
              <Text style={styles.settingDesc}>距离景点50米时提示</Text>
            </View>
            <Switch
              value={prefs.enableNearbyPrompt}
              onValueChange={(v) => updatePref('enableNearbyPrompt', v)}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={prefs.enableNearbyPrompt ? Colors.primary : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>空闲提示</Text>
              <Text style={styles.settingDesc}>停留2分钟无操作时提示</Text>
            </View>
            <Switch
              value={prefs.enableIdlePrompt}
              onValueChange={(v) => updatePref('enableIdlePrompt', v)}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={prefs.enableIdlePrompt ? Colors.primary : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>偏离路线提示</Text>
              <Text style={styles.settingDesc}>偏离推荐路线100米时提示</Text>
            </View>
            <Switch
              value={prefs.enableDetourPrompt}
              onValueChange={(v) => updatePref('enableDetourPrompt', v)}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={prefs.enableDetourPrompt ? Colors.primary : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>提示频率</Text>
              <Text style={styles.settingDesc}>控制提示的密集程度</Text>
            </View>
            <View style={styles.segmentedControl}>
              {(['low', 'medium', 'high'] as const).map((freq) => (
                <Pressable
                  key={freq}
                  style={[
                    styles.segmentedBtn,
                    prefs.promptFrequency === freq && styles.segmentedBtnActive,
                  ]}
                  onPress={() => updatePref('promptFrequency', freq)}
                >
                  <Text
                    style={[
                      styles.segmentedBtnText,
                      prefs.promptFrequency === freq && styles.segmentedBtnTextActive,
                    ]}
                  >
                    {freq === 'low' ? '低' : freq === 'medium' ? '中' : '高'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* 讲解模式 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 讲解模式</Text>
          <Text style={styles.sectionDesc}>控制讲解行为和语速</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>自动讲解</Text>
              <Text style={styles.settingDesc}>到达景点自动开始讲解</Text>
            </View>
            <Switch
              value={prefs.autoNarrate}
              onValueChange={(v) => updatePref('autoNarrate', v)}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={prefs.autoNarrate ? Colors.primary : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>讲解语速</Text>
              <Text style={styles.settingDesc}>调整讲解的速度</Text>
            </View>
            <View style={styles.segmentedControl}>
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <Pressable
                  key={speed}
                  style={[
                    styles.segmentedBtn,
                    prefs.narrationSpeed === speed && styles.segmentedBtnActive,
                  ]}
                  onPress={() => updatePref('narrationSpeed', speed)}
                >
                  <Text
                    style={[
                      styles.segmentedBtnText,
                      prefs.narrationSpeed === speed && styles.segmentedBtnTextActive,
                    ]}
                  >
                    {speed === 'slow' ? '慢' : speed === 'normal' ? '正常' : '快'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* 免打扰 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌙 免打扰模式</Text>
          <Text style={styles.sectionDesc}>开启后数字人不会主动提示</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>免打扰</Text>
              <Text style={styles.settingDesc}>关闭所有主动提示</Text>
            </View>
            <Switch
              value={prefs.dndMode}
              onValueChange={(v) => updatePref('dndMode', v)}
              trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
              thumbColor={prefs.dndMode ? Colors.primary : '#fff'}
            />
          </View>

          {prefs.dndMode && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>定时免打扰</Text>
                <Text style={styles.settingDesc}>
                  {prefs.dndSchedule
                    ? `${prefs.dndSchedule.start} - ${prefs.dndSchedule.end}`
                    : '未设置'}
                </Text>
              </View>
              <Pressable
                style={styles.timeBtn}
                onPress={() => {
                  // TODO: 实现时间选择器
                  Alert.alert('提示', '时间选择器待实现');
                }}
              >
                <Text style={styles.timeBtnText}>设置</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 个性化 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 个性化</Text>
          <Text style={styles.sectionDesc}>定制您的向导体验</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>向导角色</Text>
              <Text style={styles.settingDesc}>选择数字人的角色</Text>
            </View>
            <Pressable
              style={styles.selectBtn}
              onPress={() => {
                // TODO: 实现角色选择器
                Alert.alert('提示', '角色选择器待实现');
              }}
            >
              <Text style={styles.selectBtnText}>{prefs.preferredRole}</Text>
              <Text style={styles.selectBtnArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>偏好路线</Text>
              <Text style={styles.settingDesc}>推荐路线的类型</Text>
            </View>
            <Pressable
              style={styles.selectBtn}
              onPress={() => {
                // TODO: 实现路线类型选择器
                Alert.alert('提示', '路线选择器待实现');
              }}
            >
              <Text style={styles.selectBtnText}>
                {prefs.preferredRouteType === 'zen-journey'
                  ? '禅意之旅'
                  : prefs.preferredRouteType === 'family-fun'
                    ? '亲子欢乐'
                    : '经典全景'}
              </Text>
              <Text style={styles.selectBtnArrow}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* 重置按钮 */}
        <Pressable style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>恢复默认设置</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paperWarm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 156, 137, 0.1)',
  },
  headerBtn: {
    padding: 8,
  },
  headerBtnText: {
    fontSize: 15,
    color: Colors.gray600,
  },
  saveBtn: {
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.ink,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.gray500,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 156, 137, 0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.gray500,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(106, 156, 137, 0.08)',
    borderRadius: 8,
    padding: 2,
  },
  segmentedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentedBtnActive: {
    backgroundColor: '#fff',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedBtnText: {
    fontSize: 13,
    color: Colors.gray600,
  },
  segmentedBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  timeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(106, 156, 137, 0.08)',
  },
  timeBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(106, 156, 137, 0.08)',
  },
  selectBtnText: {
    fontSize: 13,
    color: Colors.ink,
    marginRight: 8,
  },
  selectBtnArrow: {
    fontSize: 16,
    color: Colors.gray400,
  },
  resetBtn: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray300,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 15,
    color: Colors.gray600,
  },
});

export default GuideSettings;
