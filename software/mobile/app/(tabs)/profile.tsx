import { useCallback, useEffect } from 'react';
import {
  Alert,
  Image as RNImage,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '@/constants/colors';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { useTour } from '@/context/TourContext';
import { setDigitalHumanPageContext, speakWithDigitalHuman } from '@/services/digitalHuman';
import { trackMobileEvent, flushMobileEvents } from '@/services/mobileAnalytics';
import { SESSION_ID } from '@/services/dataSync';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import { PageDigitalHumanDock } from '@/components/vrm/PageDigitalHumanDock';
import { confirmLogout } from '@/utils/logoutConfirmation';

const PROFILE_VISUALS = {
  hero: require('../../assets/images/explore/hero-courtyard.png'),
  heroEcho: require('../../assets/images/explore/hero-overview.png'),
  seal: require('../../assets/images/explore/seal-lingshan.png'),
};

const FEEDBACK_OPTIONS = [
  { key: 'clear_narration', label: '讲解清楚', insight: 'narration_quality' },
  { key: 'route_fit', label: '路线合适', insight: 'route_fit' },
  { key: 'needs_followup', label: '还想追问', insight: 'question_demand' },
] as const;

const INTEREST_LABELS: Record<string, string> = {
  history: '历史文化',
  nature: '自然风光',
  family: '亲子同行',
  photo: '拍照打卡',
  quiet: '安静陪伴',
  budget: '轻量消费',
  deep_explain: '深度讲解',
  free_walk: '自由游逛',
};

const PACE_LABELS = {
  slow: '慢游',
  normal: '适中',
  fast: '高效',
} as const;

const DEPTH_LABELS = {
  brief: '简明',
  standard: '标准',
  deep: '深入',
} as const;

const COMPANION_LABELS = {
  quiet: '少打扰',
  balanced: '适度提醒',
  active: '主动陪伴',
} as const;

function getAvatarText(name?: string, username?: string) {
  const source = (name || username || '灵').trim();
  return source.slice(0, 1).toUpperCase();
}

function getProfileSignature(interests: string[], companionLabel: string) {
  const firstInterest = interests[0] ?? '自由游逛';
  return `${firstInterest} · ${companionLabel}`;
}

interface ActionItem {
  mark: string;
  label: string;
  detail: string;
  onPress: () => void;
  danger?: boolean;
}

function ProgressLine({ width }: { width: `${number}%` }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width }]} />
    </View>
  );
}

function PreferencePill({ label }: { label: string }) {
  return (
    <View style={styles.preferencePill}>
      <Text style={styles.preferencePillText}>{label}</Text>
    </View>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionRow,
        item.danger && styles.actionRowDanger,
        pressed && styles.pressed,
      ]}
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.actionMark, item.danger && styles.actionMarkDanger]}>
        <Text style={[styles.actionMarkText, item.danger && styles.dangerText]}>{item.mark}</Text>
      </View>
      <View style={styles.actionTextGroup}>
        <Text style={[styles.actionLabel, item.danger && styles.dangerText]}>{item.label}</Text>
        <Text style={styles.actionDetail}>{item.detail}</Text>
      </View>
      <Text style={[styles.actionArrow, item.danger && styles.dangerText]}>›</Text>
    </Pressable>
  );
}

function GuestProfile({ onLogin, topInset }: { onLogin: () => void; topInset: number }) {
  return (
    <View style={[styles.guestStage, { paddingTop: topInset + 18 }]}>
      <ExpoImage source={PROFILE_VISUALS.hero} style={StyleSheet.absoluteFill} contentFit="cover" />
      <ExpoImage source={PROFILE_VISUALS.heroEcho} style={[StyleSheet.absoluteFill, styles.heroEchoImage]} contentFit="cover" />
      <View style={styles.heroScrim} />
      <View style={styles.heroWarmth} />

      <View style={[styles.heroTopBar, styles.guestHeroTopBar]}>
        <View style={styles.heroSeal}>
          <ExpoImage source={PROFILE_VISUALS.seal} style={styles.heroSealImage} contentFit="contain" />
        </View>
        <View style={styles.heroCounter}>
          <Text style={styles.heroCounterNum}>档案</Text>
          <Text style={styles.heroCounterLabel}>未登录</Text>
        </View>
      </View>

      <View style={styles.guestShell}>
        <View style={styles.guestAvatarStage}>
          <Text style={styles.guestAvatarText}>灵</Text>
          <View style={styles.guestAvatarSeal}>
            <Text style={styles.guestAvatarSealText}>客</Text>
          </View>
        </View>
        <Text style={styles.guestKicker}>小灵导览档案</Text>
        <Text style={styles.guestTitle}>登录后继续保存你的灵山旅程</Text>
        <Text style={styles.guestDesc}>
          路线进度、问讯记录、旅行记忆和体验反馈都会沉淀成个人档案，让小灵下次更懂你的节奏。
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={onLogin}
          accessibilityRole="button"
          accessibilityLabel="去登录"
        >
          <Text style={styles.primaryButtonText}>去登录</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ProfilePage() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const router = useRouter();
  const { user } = useUserStore();
  const { logout } = useAuth();
  const [tourState] = useTour();
  const profileDigitalHuman = useDigitalHumanDriver(DEFAULT_DIGITAL_HUMAN_VOICE_MODE, {
    speakerId: 'profile-page',
  });
  useFocusEffect(useCallback(() => {
    profileDigitalHuman.activate();
    return undefined;
  }, [profileDigitalHuman.activate]));
  const { progress, guideProfile } = tourState;

  const completion = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const progressWidth = `${Math.min(100, Math.max(0, completion))}%` as `${number}%`;
  const remainingStops = Math.max(progress.total - progress.completed, 0);
  const routeName = tourState.currentRoute?.name ?? '尚未选择路线';
  const routeHint = tourState.currentRoute
    ? tourState.currentRoute.description || '当前小灵导览路线'
    : '从首页或云游页开启路线后，这里会显示实时进度。';
  const companionLabel = COMPANION_LABELS[guideProfile.companionLevel ?? 'balanced'];
  const roleLabel = user?.role === 'admin' ? '管理端账号' : '游客账号';
  const interests = guideProfile.interests.map((item) => INTEREST_LABELS[item] ?? item).slice(0, 4);
  const displayName = user?.nickname || user?.username || '灵山游客';
  const avatarText = getAvatarText(user?.nickname, user?.username);
  const profileSignature = getProfileSignature(interests, companionLabel);

  useEffect(() => {
    if (!isFocused) return undefined;
    setDigitalHumanPageContext('profile');
    const timer = setTimeout(() => {
      speakWithDigitalHuman(
        user
          ? '这里是你的导览档案。我会根据路线进度、偏好和反馈，调整接下来的陪伴方式。'
          : '登录后，我可以帮你保存导览档案、旅行记忆和游客反馈。',
        'neutral',
        { replaceCurrent: true },
      );
    }, 700);
    return () => clearTimeout(timer);
  }, [isFocused, user]);

  const handleLogout = useCallback(() => {
    confirmLogout({
      platform: Platform.OS,
      alert: Alert.alert,
      onConfirm: logout,
    });
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

  if (!user) {
    return (
      <View style={styles.root}>
        <GuestProfile onLogin={() => router.push('/auth/login')} topInset={insets.top} />
        <PageDigitalHumanDock digitalHuman={profileDigitalHuman} />
      </View>
    );
  }

  const actionItems: ActionItem[] = [
    {
      mark: '档',
      label: '编辑个人信息',
      detail: '设置昵称、头像和档案名片',
      onPress: () => router.push('/profile/edit'),
    },
    {
      mark: '行',
      label: tourState.currentRoute ? '继续当前路线' : '选择导览路线',
      detail: tourState.currentRoute ? `下一步完成 ${remainingStops} 个节点` : '从云游页开始一条适合你的路线',
      onPress: () => router.push('/explore'),
    },
    {
      mark: '问',
      label: '向小灵追问',
      detail: '继续问景点、路线、典故和现场服务',
      onPress: () => router.push('/chat'),
    },
    {
      mark: '记',
      label: '查看旅行记忆',
      detail: '整理打卡、问讯和手帐记录',
      onPress: () => router.push('/memory'),
    },
    {
      mark: '退',
      label: '退出登录',
      detail: '结束当前账号会话',
      onPress: handleLogout,
      danger: true,
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 220 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <ExpoImage source={PROFILE_VISUALS.hero} style={StyleSheet.absoluteFill} contentFit="cover" />
        <ExpoImage source={PROFILE_VISUALS.heroEcho} style={[StyleSheet.absoluteFill, styles.heroEchoImage]} contentFit="cover" />
        <View style={styles.heroScrim} />
        <View style={styles.heroWarmth} />

        <View style={styles.heroTopBar}>
          <View style={styles.heroSeal}>
            <ExpoImage source={PROFILE_VISUALS.seal} style={styles.heroSealImage} contentFit="contain" />
          </View>
          <View style={styles.heroCounter}>
            <Text style={styles.heroCounterNum}>{completion}%</Text>
            <Text style={styles.heroCounterLabel}>档案进度</Text>
          </View>
        </View>

        <View style={styles.heroHeader}>
          <View style={styles.avatarStage}>
            {user.avatar ? (
              <RNImage
                source={{ uri: user.avatar }}
                style={styles.avatarImage}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text style={styles.avatarInitial}>{avatarText}</Text>
            )}
            <View style={styles.avatarSeal}>
              <Text style={styles.avatarSealText}>灵</Text>
            </View>
          </View>

          <View style={styles.nameBlock}>
            <Text style={styles.heroKicker}>LINGSHAN PROFILE</Text>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileUsername}>@{user.username}</Text>
            <Text style={styles.profileTagline} numberOfLines={1}>{profileSignature}</Text>
            <View style={styles.badgeRail}>
              <View style={styles.miniBadge}>
                <Text style={styles.miniBadgeText}>{roleLabel}</Text>
              </View>
              <View style={styles.miniBadgeWarm}>
                <Text style={styles.miniBadgeWarmText}>{PACE_LABELS[guideProfile.pace]}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.heroDesc}>
          小灵会把你的路线偏好、讲解节奏和现场反馈合并成一份可持续更新的导览档案。
        </Text>

        <View style={styles.heroMetaRail}>
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaValue}>{progress.completed}</Text>
            <Text style={styles.heroMetaLabel}>已完成</Text>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaValue}>{remainingStops}</Text>
            <Text style={styles.heroMetaLabel}>待完成</Text>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaValue}>{PACE_LABELS[guideProfile.pace]}</Text>
            <Text style={styles.heroMetaLabel}>游览节奏</Text>
          </View>
        </View>
      </View>

      <View style={styles.routePanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>当前路线</Text>
            <Text style={styles.sectionTitle}>{routeName}</Text>
          </View>
          <Text style={styles.sectionMeta}>{progress.completed}/{progress.total}</Text>
        </View>
        <Text style={styles.routeHint}>{routeHint}</Text>
        <ProgressLine width={progressWidth} />
      </View>

      <View style={styles.preferencePanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>小灵偏好画像</Text>
            <Text style={styles.sectionTitle}>陪伴方式</Text>
          </View>
          <Text style={styles.preferenceScore}>{companionLabel}</Text>
        </View>

        <View style={styles.preferenceGrid}>
          <View style={styles.preferenceTile}>
            <Text style={styles.preferenceLabel}>游览节奏</Text>
            <Text style={styles.preferenceValue}>{PACE_LABELS[guideProfile.pace]}</Text>
          </View>
          <View style={styles.preferenceTile}>
            <Text style={styles.preferenceLabel}>讲解深度</Text>
            <Text style={styles.preferenceValue}>{DEPTH_LABELS[guideProfile.narrationDepth]}</Text>
          </View>
          <View style={styles.preferenceTile}>
            <Text style={styles.preferenceLabel}>自动讲解</Text>
            <Text style={styles.preferenceValue}>{guideProfile.autoNarrate ? '开启' : '关闭'}</Text>
          </View>
        </View>

        <View style={styles.preferencePills}>
          {interests.map((item) => (
            <PreferencePill key={item} label={item} />
          ))}
        </View>
      </View>

      <View style={styles.feedbackPanel}>
        <View style={styles.feedbackCopy}>
          <Text style={styles.sectionKicker}>体验反馈</Text>
          <Text style={styles.feedbackTitle}>把最近的感受告诉小灵</Text>
          <Text style={styles.feedbackDesc}>
            选择一项最贴近的体验，系统会把它用于路线、讲解和现场运营洞察。
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

      <View style={styles.actionPanel}>
        <Text style={styles.actionPanelTitle}>常用操作</Text>
        {actionItems.map((item) => (
          <ActionRow key={item.label} item={item} />
        ))}
      </View>
    </ScrollView>

    <PageDigitalHumanDock digitalHuman={profileDigitalHuman} />
  </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    flex: 1,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  guestStage: {
    flex: 1,
    minHeight: 760,
    paddingHorizontal: 18,
    paddingBottom: 28,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  guestShell: {
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 22,
    backgroundColor: 'rgba(255,253,248,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 8,
  },
  guestAvatarStage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.ink,
    borderWidth: 3,
    borderColor: '#D6B45A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  guestAvatarText: {
    color: '#FFF8E8',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  guestAvatarSeal: {
    position: 'absolute',
    right: -5,
    bottom: -3,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.vermilion,
    borderWidth: 2,
    borderColor: '#FFFDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarSealText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  guestKicker: {
    color: Colors.vermilion,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
  },
  guestTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
    marginBottom: 12,
  },
  guestDesc: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 24,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 26,
    borderRadius: 6,
    backgroundColor: Colors.ink,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF8E8',
    fontSize: 16,
    fontWeight: '900',
  },
  hero: {
    minHeight: 430,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: Colors.ink,
    overflow: 'hidden',
  },
  heroEchoImage: {
    opacity: 0.2,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,10,8,0.66)',
  },
  heroWarmth: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,75,49,0.12)',
  },
  heroTopBar: {
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 34,
  },
  guestHeroTopBar: {
    justifyContent: 'flex-start',
    gap: 10,
  },
  heroSeal: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,228,203,0.72)',
    backgroundColor: 'rgba(255,250,241,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    overflow: 'hidden',
  },
  heroSealImage: {
    width: 44,
    height: 44,
  },
  heroCounter: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  heroCounterNum: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  heroCounterLabel: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
  },
  heroHeader: {
    zIndex: 2,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarStage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF8E8',
    borderWidth: 3,
    borderColor: '#D6B45A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  avatarInitial: {
    color: Colors.ink,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '900',
  },
  avatarSeal: {
    position: 'absolute',
    right: -4,
    bottom: 2,
    width: 31,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: Colors.vermilion,
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSealText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  profileName: {
    color: '#FFF8E8',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    fontFamily: 'MaShanZheng',
  },
  profileUsername: {
    color: 'rgba(255,248,232,0.65)',
    fontSize: 13,
    marginTop: 6,
  },
  profileTagline: {
    color: '#D6B45A',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 7,
  },
  badgeRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  miniBadge: {
    minHeight: 27,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(106,156,137,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(184,212,200,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeText: {
    color: '#DCEDE5',
    fontSize: 12,
    fontWeight: '900',
  },
  miniBadgeWarm: {
    minHeight: 27,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(200,169,81,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(214,180,90,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeWarmText: {
    color: '#F1D98A',
    fontSize: 12,
    fontWeight: '900',
  },
  heroDesc: {
    zIndex: 2,
    color: 'rgba(255,248,232,0.75)',
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 16,
  },
  heroMetaRail: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroMetaValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  heroMetaLabel: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
  },
  heroMetaDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  routePanel: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E2D8C8',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12,
  },
  sectionKicker: {
    color: Colors.gray400,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'MaShanZheng',
  },
  sectionMeta: {
    color: Colors.vermilion,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
  },
  routeHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 16,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8DED0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Colors.vermilion,
  },
  preferencePanel: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#EAF2EE',
    borderWidth: 1,
    borderColor: '#C7DCD3',
  },
  preferenceScore: {
    color: Colors.primaryDark,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '900',
  },
  preferenceGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  preferenceTile: {
    flex: 1,
    minHeight: 76,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(74,122,104,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  preferenceLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  preferenceValue: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  preferencePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferencePill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferencePillText: {
    color: '#FFF8E8',
    fontSize: 12,
    fontWeight: '900',
  },
  feedbackPanel: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#F0E6D6',
    borderWidth: 1,
    borderColor: '#DCCDB8',
  },
  feedbackCopy: {
    marginBottom: 14,
  },
  feedbackTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
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
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackOptionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  actionPanel: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E2D8C8',
    overflow: 'hidden',
  },
  actionPanelTitle: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 7,
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEE4D7',
    gap: 12,
  },
  actionRowDanger: {
    backgroundColor: '#FFF8F6',
  },
  actionMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F0E7D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMarkDanger: {
    backgroundColor: Colors.errorBg,
  },
  actionMarkText: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  actionTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  actionDetail: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  actionArrow: {
    color: Colors.gray400,
    fontSize: 24,
    fontWeight: '300',
  },
  dangerText: {
    color: Colors.error,
  },
});
