import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image as RNImage,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { Colors } from '@/constants/colors';
import { setDigitalHumanPageContext, speakWithDigitalHuman } from '@/services/digitalHuman';
import { useUserStore } from '@/stores/userStore';

const EDIT_PROFILE_VISUALS = {
  hero: require('../../assets/images/explore/hero-courtyard.png'),
  heroEcho: require('../../assets/images/explore/hero-overview.png'),
  seal: require('../../assets/images/explore/seal-lingshan.png'),
};

function getAvatarText(name?: string, username?: string) {
  const source = (name || username || '灵').trim();
  return source.slice(0, 1).toUpperCase();
}

export default function EditProfilePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [nickname, setNickname] = useState(user?.nickname || user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const savedNickname = user?.nickname || user?.username || '';
  const savedAvatar = user?.avatar || '';
  const avatarText = getAvatarText(nickname, user?.username);
  const isDirty = nickname.trim() !== savedNickname.trim() || avatar.trim() !== savedAvatar.trim();

  const previewLine = useMemo(() => {
    if (!nickname.trim()) return '请填写昵称';
    return avatar.trim() ? '使用图片头像' : '使用首字头像';
  }, [avatar, nickname]);

  useEffect(() => {
    setDigitalHumanPageContext('profile');
    speakWithDigitalHuman('这里可以调整你的个人名片。昵称会显示在导览档案里。', 'neutral');
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    setNickname(user.nickname || user.username);
    setAvatar(user.avatar || '');
  }, [router, user?.avatar, user?.id, user?.nickname, user?.username]);

  const validate = useCallback(() => {
    const nextNickname = nickname.trim();
    const nextAvatar = avatar.trim();
    let valid = true;

    setNicknameError('');
    setAvatarError('');

    if (!nextNickname) {
      setNicknameError('请填写昵称。');
      valid = false;
    } else if (nextNickname.length > 16) {
      setNicknameError('昵称最多 16 个字符。');
      valid = false;
    }

    if (nextAvatar && !/^https?:\/\//i.test(nextAvatar)) {
      setAvatarError('头像链接需要以 http 或 https 开头。');
      valid = false;
    }

    return valid;
  }, [avatar, nickname]);

  const handleSave = useCallback(async () => {
    if (!user || isSaving || !validate()) return;

    const nextNickname = nickname.trim();
    const nextAvatar = avatar.trim();

    try {
      setIsSaving(true);
      const res = await authApi.updateProfile({ nickname: nextNickname, avatar: nextAvatar });
      setUser(res.data);
      speakWithDigitalHuman('资料已更新，我会用新的昵称继续陪你游览。', 'happy');
      Alert.alert('资料已保存', '你的个人名片已经更新。', [
        { text: '好的', onPress: () => router.replace('/profile') },
      ]);
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setIsSaving(false);
    }
  }, [avatar, isSaving, nickname, router, setUser, user, validate]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert('放弃修改？', '未保存的昵称和头像会被丢弃。', [
        { text: '继续编辑', style: 'cancel' },
        { text: '放弃', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  }, [isDirty, router]);

  if (!user) {
    return <View style={styles.root} />;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <ExpoImage source={EDIT_PROFILE_VISUALS.hero} style={StyleSheet.absoluteFill} contentFit="cover" />
        <ExpoImage source={EDIT_PROFILE_VISUALS.heroEcho} style={[StyleSheet.absoluteFill, styles.heroEcho]} contentFit="cover" />
        <View style={styles.heroScrim} />
        <View style={styles.heroWarmth} />

        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="返回个人档案"
          >
            <Text style={styles.backButtonText}>‹</Text>
            <Text style={styles.backButtonLabel}>档案</Text>
          </Pressable>
          <View style={styles.heroSeal}>
            <ExpoImage source={EDIT_PROFILE_VISUALS.seal} style={styles.heroSealImage} contentFit="contain" />
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>PROFILE SETTINGS</Text>
          <Text style={styles.heroTitle}>编辑个人名片</Text>
          <Text style={styles.heroDesc}>这张名片会同步到小灵导览档案，用来展示你的昵称、头像和个人游览身份。</Text>
        </View>
      </View>

      <View style={styles.editorCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarStage}>
            {avatar.trim() ? (
              <RNImage
                source={{ uri: avatar.trim() }}
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
          <View style={styles.avatarCopy}>
            <Text style={styles.previewName} numberOfLines={1}>{nickname.trim() || '灵山游客'}</Text>
            <Text style={styles.previewMeta}>{previewLine}</Text>
            <Text style={styles.previewHint}>头像链接可以留空，系统会自动使用昵称首字。</Text>
          </View>
        </View>

        <View style={styles.formStack}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>昵称</Text>
              <Text style={styles.requiredLabel}>必填</Text>
            </View>
            <TextInput
              value={nickname}
              onChangeText={(value) => {
                setNickname(value);
                if (nicknameError) setNicknameError('');
              }}
              placeholder="例如：山间旅人"
              placeholderTextColor={Colors.textTertiary}
              maxLength={16}
              style={[styles.textInput, nicknameError && styles.inputError]}
              accessibilityLabel="昵称"
              accessibilityHint="最多 16 个字符"
            />
            <Text style={[styles.helperText, nicknameError && styles.errorText]}>
              {nicknameError || '最多 16 个字符，会显示在个人档案和导览名片中。'}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>头像图片链接</Text>
            <TextInput
              value={avatar}
              onChangeText={(value) => {
                setAvatar(value);
                if (avatarError) setAvatarError('');
              }}
              placeholder="https://example.com/avatar.jpg"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
              maxLength={255}
              style={[styles.textInput, avatarError && styles.inputError]}
              accessibilityLabel="头像图片链接"
              accessibilityHint="留空则使用昵称首字头像"
            />
            <Text style={[styles.helperText, avatarError && styles.errorText]}>
              {avatarError || '可选。建议使用正方形图片链接，留空则使用首字头像。'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRail}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="取消编辑"
          >
            <Text style={styles.secondaryButtonText}>取消</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (!isDirty || isSaving) && styles.primaryButtonDisabled,
              pressed && isDirty && !isSaving && styles.pressed,
            ]}
            onPress={handleSave}
            disabled={!isDirty || isSaving}
            accessibilityRole="button"
            accessibilityLabel="保存个人信息"
            accessibilityState={{ disabled: !isDirty || isSaving }}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? '保存中' : '保存信息'}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  hero: {
    minHeight: 330,
    paddingHorizontal: 18,
    paddingBottom: 86,
    backgroundColor: Colors.ink,
    overflow: 'hidden',
  },
  heroEcho: {
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
  topBar: {
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 42,
  },
  backButton: {
    minHeight: 44,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '700',
  },
  backButtonLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
  heroCopy: {
    zIndex: 2,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#FFF8E8',
    fontSize: 34,
    lineHeight: 42,
    fontFamily: 'MaShanZheng',
  },
  heroDesc: {
    marginTop: 12,
    maxWidth: 310,
    color: 'rgba(255,248,232,0.78)',
    fontSize: 14,
    lineHeight: 23,
  },
  editorCard: {
    marginHorizontal: 16,
    marginTop: -58,
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,253,248,0.97)',
    borderWidth: 1,
    borderColor: '#E2D8C8',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 22,
  },
  avatarStage: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#FFF8E8',
    borderWidth: 3,
    borderColor: '#D6B45A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.vermilion,
    borderWidth: 2,
    borderColor: '#FFFDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSealText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  avatarCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewName: {
    color: Colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  previewMeta: {
    color: Colors.vermilion,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  previewHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  formStack: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  requiredLabel: {
    color: Colors.vermilion,
    fontSize: 11,
    fontWeight: '900',
  },
  textInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9CFBF',
    backgroundColor: '#F8F2E8',
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: '#FFF6F4',
  },
  helperText: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: Colors.error,
    fontWeight: '800',
  },
  actionRail: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#EEE4D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
