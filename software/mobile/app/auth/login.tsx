import { useRef, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { AuthField } from '@/components/auth/AuthField';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
import { Colors } from '@/constants/colors';
import { validateLogin, type LoginErrors } from '@/features/auth/validation';
import { useAuth } from '@/hooks/useAuth';

type LoginField = 'username' | 'password';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);
  const loginInFlightRef = useRef(false);
  const { login } = useAuth();
  const router = useRouter();

  const clearFieldError = (field: LoginField) => {
    if (errors[field] || errors.submit) {
      setErrors((previous) => ({
        ...previous,
        [field]: undefined,
        submit: undefined,
      }));
    }
  };

  const handleLogin = async () => {
    if (loginInFlightRef.current) return;

    const nextErrors = validateLogin(username, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    loginInFlightRef.current = true;
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      setErrors({
        submit:
          error instanceof Error && error.message
            ? error.message
            : '登录失败，请检查账号或密码',
      });
    } finally {
      loginInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell>
      <AuthBrandHeader
        eyebrow="灵山智慧导览"
        title="欢迎回来"
        subtitle="继续你的个性化游览档案"
      />

      <View style={styles.formPanel}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>账号登录</Text>
            <Text style={styles.formTitle}>开启灵山文化之旅</Text>
          </View>
          <Link href="/(tabs)" asChild>
            <Pressable
              accessibilityLabel="游客进入"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.guestEntry, pressed && styles.pressed]}
            >
              <Text style={styles.guestEntryText}>游客进入</Text>
            </Pressable>
          </Link>
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
          placeholder="输入用户名"
          returnKeyType="next"
          textContentType="username"
          value={username}
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
          onSubmitEditing={handleLogin}
          onTogglePassword={() => setShowPassword((visible) => !visible)}
          placeholder="输入密码"
          returnKeyType="done"
          secureTextEntry
          showPassword={showPassword}
          textContentType="password"
          value={password}
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

        <AuthSubmitButton label="登录" loading={loading} onPress={handleLogin} />

        <View style={styles.footerRow}>
          <Text style={styles.footerHint}>还没有账号？</Text>
          <Link href="/auth/register" asChild>
            <Pressable
              accessibilityLabel="创建账号"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.footerLink}>创建账号</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
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
  guestEntry: {
    minWidth: 72,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.paperWarm,
  },
  guestEntryText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  fieldLeading: {
    minWidth: 20,
    color: Colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
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
