import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

type LoginErrors = Partial<Record<'username' | 'password' | 'submit', string>>;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const validate = () => {
    const nextErrors: LoginErrors = {};
    if (!username.trim()) nextErrors.username = '请输入用户名';
    if (!password) nextErrors.password = '请输入密码';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrors({ submit: err.message || '登录失败，请检查账号或密码' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>山</Text>
          </View>
          <Text style={styles.brandName}>灵山智慧导览</Text>
          <Text style={styles.brandSub}>继续你的个性化游览档案</Text>
        </View>

        <View style={styles.formPanel}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.eyebrow}>账号登录</Text>
              <Text style={styles.title}>欢迎回来</Text>
            </View>
            <Link href="/(tabs)" asChild>
              <Pressable style={styles.ghostEntry} hitSlop={8}>
                <Text style={styles.ghostEntryText}>游客</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>用户名</Text>
            <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="输入用户名"
                placeholderTextColor={Colors.textTertiary}
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  if (errors.username || errors.submit) {
                    setErrors((prev) => ({ ...prev, username: undefined, submit: undefined }));
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="username"
              />
            </View>
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>密码</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Text style={styles.inputPrefix}>*</Text>
              <TextInput
                style={styles.input}
                placeholder="输入密码"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password || errors.submit) {
                    setErrors((prev) => ({ ...prev, password: undefined, submit: undefined }));
                  }
                }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                textContentType="password"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                style={styles.passwordToggle}
                onPress={() => setShowPassword((value) => !value)}
                hitSlop={8}
              >
                <Text style={styles.passwordToggleText}>{showPassword ? '隐藏' : '显示'}</Text>
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {errors.submit ? <Text style={styles.submitError}>{errors.submit}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>登录</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerHint}>还没有账号？</Text>
            <Link href="/auth/register" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>创建账号</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandBlock: {
    marginBottom: 28,
  },
  brandMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.ink,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  brandMarkText: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '700',
  },
  brandName: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  brandSub: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  formPanel: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    shadowColor: Colors.gray900,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 12,
  },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  ghostEntry: {
    minWidth: 52,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  ghostEntryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
  },
  inputPrefix: {
    width: 22,
    color: Colors.primaryDark,
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    minHeight: 50,
    paddingVertical: 0,
  },
  passwordToggle: {
    minWidth: 42,
    minHeight: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  passwordToggleText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  submitError: {
    color: Colors.error,
    backgroundColor: Colors.errorBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  primaryButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primaryDark,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '800',
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
});
