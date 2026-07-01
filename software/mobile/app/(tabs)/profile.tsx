import { useCallback, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { useTour } from '@/context/TourContext';
import { setDigitalHumanPageContext, speakWithDigitalHuman } from '@/services/digitalHuman';
import { trackMobileEvent, flushMobileEvents } from '@/services/mobileAnalytics';
import { SESSION_ID } from '@/services/dataSync';

const FEEDBACK_OPTIONS = [
  { key: 'clear_narration', label: '讲解清晰', insight: 'narration_quality' },
  { key: 'route_fit', label: '路线合适', insight: 'route_fit' },
  { key: 'needs_followup', label: '还想追问', insight: 'question_demand' },
] as const;

interface MenuItem {
  icon: string;
  label: string;
  detail: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.menuIconBox, item.danger && styles.menuIconDanger]}>
        <Text style={[styles.menuIcon, item.danger && styles.menuDangerText]}>{item.icon}</Text>
      </View>
      <View style={styles.menuTextGroup}>
        <Text style={[styles.menuLabel, item.danger && styles.menuDangerText]}>{item.label}</Text>
        <Text style={styles.menuDetail}>{item.detail}</Text>
      </View>
      <Text style={[styles.menuArrow, item.danger && styles.menuDangerText]}>›</Text>
    </Pressable>
  );
}

function StatBlock({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NotLoggedIn({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={styles.guestShell}>
      <View style={styles.guestMark}>
        <Text style={styles.guestMarkText}>灵</Text>
      </View>
      <Text style={styles.guestKicker}>XIAOLING PROFILE</Text>
      <Text style={styles.guestTitle}>登录后保存小灵导览档案</Text>
      <Text style={styles.guestDesc}>
        同步打卡记录、旅行回忆、导览偏好和反馈，让小灵下次更懂你的节奏。
      </Text>
      <Pressable
        style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
        onPress={onLogin}
        accessibilityRole="button"
      >
        <Text style={styles.loginBtnText}>去登录</Text>
      </Pressable>
    </View>
  );
}

export default function ProfilePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const { logout } = useAuth();
  const [tourState] = useTour();
  const { progress } = tourState;

  const completion = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const progressWidth = `${Math.min(100, Math.max(0, completion))}%` as `${number}%`;

  useEffect(() => {
    setDigitalHumanPageContext('profile');
    const timer = setTimeout(() => {
      speakWithDigitalHuman(
        user
          ? '这里是你的小灵导览档案。你的路线进度和反馈会帮助我更好地服务你。'
          : '登录后，我可以为你保存导览档案、旅行回忆和游客反馈。',
        'neutral',
      );
    }, 700);
    return () => clearTimeout(timer);
  }, [user]);

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

  const handleFeedback = useCallback((option: typeof FEEDBACK_OPTIONS[number]) => {
    void trackMobileEvent('feedback_submitted', {
      source_page: 'profile',
      feedback_key: option.key,
      feedback_label: option.label,
      insight: option.insight,
      route_id: tourState.currentRoute?.id,
      route_name: tourState.currentRoute?.name,
      progress_completed: progress.completed,
      progress_total: progress.total,
    }, SESSION_ID);
    void flushMobileEvents();
    speakWithDigitalHuman(`${option.label}，收到反馈，我会同步给运营洞察。`, 'happy');
    Alert.alert('反馈已记录', '谢谢你，小灵会把它同步到运营洞察里。');
  }, [progress.completed, progress.total, tourState.currentRoute]);

  const menuItems: MenuItem[] = [
    {
      icon: '演',
      label: '数字人表现包 Demo',
      detail: '查看小灵表情、动作和播报状态',
      onPress: () => router.push('/vrm-performance-demo'),
    },
    {
      icon: '档',
      label: '修改资料',
      detail: '调整昵称、头像和基础身份信息',
      onPress: () => Alert.alert('修改资料', '功能开发中，敬请期待。'),
    },
    {
      icon: '密',
      label: '修改密码',
      detail: '保护账号安全和旅行数据',
      onPress: () => Alert.alert('修改密码', '功能开发中，敬请期待。'),
    },
    {
      icon: '偏',
      label: '小灵偏好设置',
      detail: '设置讲解深度、陪伴频率和路线偏好',
      onPress: () => Alert.alert('偏好设置', '功能开发中，敬请期待。'),
    },
    {
      icon: '退',
      label: '退出登录',
      detail: '结束当前账号会话',
      onPress: handleLogout,
      danger: true,
    },
  ];

  if (!user) {
    return (
      <View style={[styles.root, styles.centeredRoot, { paddingTop: insets.top + 24 }]}>
        <NotLoggedIn onLogin={() => router.push('/auth/login')} />
      </View>
    );
  }

  const roleLabel = user.role === 'admin' ? '管理端账号' : '旅行者';
  const routeName = tourState.currentRoute?.name ?? '尚未选择路线';
  const routeHint = tourState.currentRoute ? '当前导览路线' : '从首页或路线页开启小灵导览';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 42 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTexture} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroKicker}>XIAOLING GUIDE PROFILE</Text>
            <Text style={styles.heroTitle}>我的小灵导览档案</Text>
          </View>
          <View style={styles.statusSeal}>
            <Text style={styles.statusSealText}>在线</Text>
          </View>
        </View>

        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>灵</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.profileName}>{user.nickname || user.username}</Text>
            <Text style={styles.profileUsername}>@{user.username}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.heroSub}>
          路线偏好、讲解节奏和反馈会沉淀成你的导览档案，让小灵越陪越顺手。
        </Text>
      </View>

      <View style={styles.progressPanel}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.sectionKicker}>TRIP SIGNAL</Text>
            <Text style={styles.sectionTitle}>今日导览进度</Text>
          </View>
          <Text style={styles.completionText}>{completion}%</Text>
        </View>

        <View style={styles.routeStrip}>
          <Text style={styles.routeLabel}>{routeHint}</Text>
          <Text style={styles.routeName}>{routeName}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        <View style={styles.statsRow}>
          <StatBlock value={progress.completed} label="已打卡" />
          <StatBlock value={progress.total} label="路线站点" />
          <StatBlock value={Math.max(progress.total - progress.completed, 0)} label="待完成" />
        </View>
      </View>

      <View style={styles.feedbackPanel}>
        <View style={styles.feedbackCopy}>
          <Text style={styles.feedbackKicker}>SERVICE INSIGHT</Text>
          <Text style={styles.feedbackTitle}>把体验反馈给小灵</Text>
          <Text style={styles.feedbackDesc}>
            选择最贴近感受的一项，系统会把它沉淀为路线、讲解和现场运营洞察。
          </Text>
        </View>
        <View style={styles.feedbackOptions}>
          {FEEDBACK_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={({ pressed }) => [styles.feedbackOption, pressed && styles.pressed]}
              onPress={() => handleFeedback(option)}
              accessibilityRole="button"
              accessibilityLabel={`反馈：${option.label}`}
            >
              <Text style={styles.feedbackOptionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.menuPanel}>
        <Text style={styles.menuPanelTitle}>档案与设置</Text>
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
    backgroundColor: '#F4F1EA',
  },
  centeredRoot: {
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  guestShell: {
    marginHorizontal: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 8,
    backgroundColor: '#FEFCF7',
    borderWidth: 1,
    borderColor: '#DED6C8',
    alignItems: 'flex-start',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  guestMark: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  guestMarkText: {
    color: '#F8E8C9',
    fontSize: 34,
    fontWeight: '900',
  },
  guestKicker: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  guestTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    marginBottom: 12,
  },
  guestDesc: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 24,
  },
  loginBtn: {
    minHeight: 46,
    paddingHorizontal: 28,
    borderRadius: 6,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.vermilion,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 4,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  hero: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 8,
    backgroundColor: Colors.ink,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  heroTexture: {
    position: 'absolute',
    top: -36,
    right: -42,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 32,
    borderColor: 'rgba(200,169,81,0.12)',
    transform: [{ rotate: '-16deg' }],
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 28,
  },
  heroKicker: {
    color: '#C8A951',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#FFF8E8',
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
  },
  statusSeal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(248,232,201,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,75,49,0.24)',
  },
  statusSealText: {
    color: '#FFF8E8',
    fontSize: 12,
    fontWeight: '900',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#C8A951',
  },
  avatarText: {
    color: Colors.ink,
    fontSize: 36,
    fontWeight: '900',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  profileUsername: {
    color: 'rgba(255,248,232,0.64)',
    fontSize: 13,
    marginBottom: 10,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(106,156,137,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.4)',
  },
  rolePillText: {
    color: '#B8D4C8',
    fontSize: 12,
    fontWeight: '800',
  },
  heroSub: {
    color: 'rgba(255,248,232,0.72)',
    fontSize: 13,
    lineHeight: 22,
  },
  progressPanel: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 8,
    backgroundColor: '#FEFCF7',
    borderWidth: 1,
    borderColor: '#E4DCCF',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  sectionKicker: {
    color: Colors.celadon,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '900',
  },
  completionText: {
    color: Colors.vermilion,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
  },
  routeStrip: {
    padding: 14,
    borderRadius: 6,
    backgroundColor: '#F4EFE5',
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
    marginBottom: 16,
  },
  routeLabel: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginBottom: 5,
  },
  routeName: {
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5DDD0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Colors.vermilion,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBlock: {
    flex: 1,
    minHeight: 78,
    borderRadius: 6,
    backgroundColor: '#F8F3EA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9E0D2',
  },
  statValue: {
    color: Colors.ink,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 5,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackPanel: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 8,
    backgroundColor: '#EDE4D5',
    borderWidth: 1,
    borderColor: '#DCCFBF',
  },
  feedbackCopy: {
    marginBottom: 14,
  },
  feedbackKicker: {
    color: Colors.vermilion,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
  },
  feedbackTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 8,
  },
  feedbackDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
  feedbackOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedbackOption: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackOptionText: {
    color: '#FFF8E8',
    fontSize: 13,
    fontWeight: '900',
  },
  menuPanel: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: '#FEFCF7',
    borderWidth: 1,
    borderColor: '#E4DCCF',
    overflow: 'hidden',
  },
  menuPanelTitle: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 6,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#EEE7DC',
    gap: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#F2EADD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: Colors.errorBg,
  },
  menuIcon: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  menuTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  menuDetail: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  menuDangerText: {
    color: Colors.error,
  },
  menuArrow: {
    color: Colors.gray400,
    fontSize: 24,
    fontWeight: '300',
  },
});
