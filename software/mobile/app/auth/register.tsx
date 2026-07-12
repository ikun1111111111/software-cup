import { useRef, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { AuthField } from '@/components/auth/AuthField';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
import { Colors } from '@/constants/colors';
import {
  getPasswordScore,
  validateRegister,
  type RegisterErrors,
} from '@/features/auth/validation';
import { useAuth } from '@/hooks/useAuth';

type RegisterField = 'username' | 'nickname' | 'password' | 'confirmPassword';

const PASSWORD_STRENGTH_LABELS = ['较弱', '较弱', '一般', '良好', '很强'] as const;

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const registerInFlightRef = useRef(false);
  const { register } = useAuth();
  const router = useRouter();

  const passwordScore = password ? getPasswordScore(password) : 0;
  const passwordStrengthLabel = PASSWORD_STRENGTH_LABELS[passwordScore];

  const clearFieldError = (field: RegisterField) => {
    if (errors[field] || errors.submit) {
      setErrors((previous) => ({
        ...previous,
        [field]: undefined,
        submit: undefined,
      }));
    }
  };

  const handleRegister = async () => {
    if (registerInFlightRef.current) return;

    const nextErrors = validateRegister(username, nickname, password, confirmPassword);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    registerInFlightRef.current = true;
    setLoading(true);
    try {
      await register(username.trim(), password, nickname.trim() || undefined);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      setErrors({
        submit:
          error instanceof Error && error.message
            ? error.message
            : '注册失败，请稍后再试',
      });
    } finally {
      registerInFlightRef.current = false;
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((visible) => !visible);
  };

  return (
    <AuthScreenShell>
      <Link href="/auth/login" asChild>
        <Pressable
          accessibilityLabel="返回登录"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
        >
          <Text style={styles.backLinkText}>← 返回登录</Text>
        </Pressable>
      </Link>

      <AuthBrandHeader
        compact
        eyebrow="灵山智慧导览"
        title="创建旅途档案"
        subtitle="以一纸灵山行笺，珍藏你的导览、足迹与文化记忆"
      />

      <View style={styles.formPanel}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>新客题名</Text>
          <Text style={styles.formTitle}>从此刻启程，续写灵山故事</Text>
        </View>

        <AuthField
          accessibilityLabel="用户名"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.username}
          label="用户名"
          leading={<Text style={styles.fieldLeading}>@</Text>}
          onChangeText={(value) => {
            setUsername(value);
            clearFieldError('username');
          }}
          placeholder="3-20 位字母、数字或下划线"
          returnKeyType="next"
          textContentType="username"
          value={username}
        />

        <AuthField
          accessibilityLabel="昵称"
          error={errors.nickname}
          label="昵称"
          leading={<Text style={styles.fieldLeading}>名</Text>}
          maxLength={16}
          onChangeText={(value) => {
            setNickname(value);
            clearFieldError('nickname');
          }}
          placeholder="选填，最多 16 个字符"
          returnKeyType="next"
          value={nickname}
        />

        <AuthField
          accessibilityLabel="密码"
          error={errors.password}
          label="密码"
          leading={<Text style={styles.fieldLeading}>密</Text>}
          onChangeText={(value) => {
            setPassword(value);
            clearFieldError('password');
          }}
          onTogglePassword={togglePasswordVisibility}
          placeholder="6-32 位密码"
          returnKeyType="next"
          secureTextEntry
          showPassword={showPassword}
          textContentType="newPassword"
          value={password}
        />

        {password ? (
          <View accessibilityLabel="密码强度" style={styles.strengthBlock}>
            <View style={styles.strengthTrack}>
              {[0, 1, 2, 3].map((segment) => {
                const isActive = segment < passwordScore;
                return (
                  <View
                    accessibilityLabel={`密码强度第${segment + 1}段`}
                    accessibilityState={{ selected: isActive }}
                    key={segment}
                    style={[
                      styles.strengthSegment,
                      isActive && styles.strengthSegmentActive,
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.strengthCopy}>
              <Text style={styles.strengthHint}>密码强度</Text>
              <Text style={styles.strengthLabel}>{passwordStrengthLabel}</Text>
            </View>
          </View>
        ) : null}

        <AuthField
          accessibilityLabel="确认密码"
          error={errors.confirmPassword}
          label="确认密码"
          leading={<Text style={styles.fieldLeading}>确</Text>}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearFieldError('confirmPassword');
          }}
          onSubmitEditing={handleRegister}
          onTogglePassword={togglePasswordVisibility}
          placeholder="再次输入密码"
          returnKeyType="done"
          secureTextEntry
          showPassword={showPassword}
          textContentType="newPassword"
          value={confirmPassword}
        />

        {errors.submit ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.submitError}
          >
            {errors.submit}
          </Text>
        ) : null}

        <AuthSubmitButton label="注册并进入" loading={loading} onPress={handleRegister} />

        <View style={styles.footerRow}>
          <Text style={styles.footerHint}>已有账号？</Text>
          <Link href="/auth/login" asChild>
            <Pressable
              accessibilityLabel="前往登录"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.footerLink}>直接登录</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  backLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 8,
  },
  backLinkText: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  formPanel: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  titleBlock: {
    marginBottom: 22,
  },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  formTitle: {
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
  },
  fieldLeading: {
    minWidth: 20,
    color: Colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  strengthBlock: {
    marginTop: -8,
    marginBottom: 16,
  },
  strengthTrack: {
    flexDirection: 'row',
    gap: 5,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: Colors.gray200,
  },
  strengthSegmentActive: {
    backgroundColor: Colors.primaryDark,
  },
  strengthCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  strengthHint: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  strengthLabel: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  submitError: {
    color: Colors.error,
    backgroundColor: Colors.errorBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  footerHint: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.68,
  },
});
