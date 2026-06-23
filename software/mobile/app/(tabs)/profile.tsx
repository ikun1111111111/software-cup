import { useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { useTour } from '@/context/TourContext';

// ─── 菜单项 ───
interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
      onPress={item.onPress}
    >
      <Text style={styles.menuIcon}>{item.icon}</Text>
      <Text style={[styles.menuLabel, item.danger && styles.menuDanger]}>{item.label}</Text>
      <Text style={styles.menuArrow}>→</Text>
    </Pressable>
  );
}

// ─── 未登录状态 ───
function NotLoggedIn({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🧘</Text>
      <Text style={styles.emptyTitle}>登录后查看个人中心</Text>
      <Text style={styles.emptyDesc}>登录后可保存打卡记录、旅行记忆和导览偏好</Text>
      <Pressable
        style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
        onPress={onLogin}
      >
        <Text style={styles.loginBtnText}>去登录</Text>
      </Pressable>
    </View>
  );
}

// ─── 主组件 ───
export default function ProfilePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const { logout } = useAuth();
  const [tourState] = useTour();

  const handleLogout = useCallback(() => {
    Alert.alert('退出登录', '确定退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }, [logout]);

  const menuItems: MenuItem[] = [
    {
      icon: '✏️',
      label: '修改资料',
      onPress: () => Alert.alert('修改资料', '功能开发中，敬请期待'),
    },
    {
      icon: '🔑',
      label: '修改密码',
      onPress: () => Alert.alert('修改密码', '功能开发中，敬请期待'),
    },
    {
      icon: '⚙️',
      label: '导览偏好设置',
      onPress: () => Alert.alert('偏好设置', '功能开发中，敬请期待'),
    },
    {
      icon: '🚪',
      label: '退出登录',
      onPress: handleLogout,
      danger: true,
    },
  ];

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
        <NotLoggedIn onLogin={() => router.push('/auth/login')} />
      </View>
    );
  }

  const { progress } = tourState;
  const roleLabel = user.role === 'admin' ? '管理员' : '旅行者';
  const roleColor = user.role === 'admin' ? Colors.accent : Colors.primary;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── 用户信息头部 ─── */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarEmoji}>🧘</Text>
        </View>
        <Text style={styles.profileName}>{user.nickname || user.username}</Text>
        <Text style={styles.profileUsername}>@{user.username}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor + '40' }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
        </View>
      </View>

      {/* ─── 旅行统计 ─── */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>📊 旅行统计</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress.completed}</Text>
            <Text style={styles.statLabel}>已打卡景点</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress.total}</Text>
            <Text style={styles.statLabel}>总景点数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>完成进度</Text>
          </View>
        </View>
        {/* 进度条 */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      {/* ─── 功能菜单 ─── */}
      <View style={styles.menuCard}>
        {menuItems.map((item) => (
          <MenuRow key={item.label} item={item} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  // ─── 未登录 ───
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 2 },

  // ─── 头部 ───
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  avatarWrap: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: Colors.primaryLighter,
  },
  avatarEmoji: { fontSize: 38 },
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  profileUsername: { fontSize: 14, color: Colors.textTertiary, marginBottom: 10 },
  roleBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },

  // ─── 统计卡片 ───
  statsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textTertiary },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.borderLight },
  progressBar: {
    height: 6, borderRadius: 3,
    backgroundColor: Colors.gray100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  // ─── 菜单 ───
  menuCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: { fontSize: 18, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  menuDanger: { color: Colors.error },
  menuArrow: { fontSize: 14, color: Colors.gray300 },
});
