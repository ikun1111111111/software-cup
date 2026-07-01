import { useMemo, useState } from 'react';
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

type RegisterField = 'username' | 'nickname' | 'password' | 'confirmPassword' | 'submit';
type RegisterErrors = Partial<Record<RegisterField, string>>;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function getPasswordScore(password: string) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const passwordScore = useMemo(() => getPasswordScore(password), [password]);
  const passwordHint = passwordScore >= 3 ? '密码强度不错' : '建议加入数字、大小写或符号';

  const clearFieldError = (field: RegisterField) => {
    if (errors[field] || errors.submit) {
      setErrors((prev) => ({ ...prev, [field]: undefined, submit: undefined }));
    }
  };

  const validate = () => {
    const trimmedUsername = username.trim();
    const trimmedNickname = nickname.trim();
    const nextErrors: RegisterErrors = {};

    if (!trimmedUsername) {
      nextErrors.username = '请输入用户名';
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      nextErrors.username = '用户名需为 3-20 位';
    } else if (!USERNAME_PATTERN.test(trimmedUsername)) {
      nextErrors.username = '仅支持字母、数字和下划线';
    }

    if (trimmedNickname.length > 16) {
      nextErrors.nickname = '昵称最多 16 个字符';
    }

    if (!password) {
      nextErrors.password = '请输入密码';
    } else if (password.length < 6 || password.length > 32) {
      nextErrors.password = '密码需为 6-32 位';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = '请再次输入密码';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await register(username.trim(), password, nickname.trim() || undefined);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrors({ submit: err.message || '注册失败，请稍后再试' });
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
        <View style={styles.topBar}>
          <Link href="/auth/login" asChild>
            <Pressable style={styles.backButton} hitSlop={8}>
              <Text style={styles.backIcon}>‹</Text>
              <Text style={styles.backText}>返回登录</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>创建灵山账号</Text>
          <Text style={styles.title}>把你的导览、打卡和旅行回忆都收好</Text>
          <Text style={styles.subtitle}>注册后可同步个性化路线、回忆册和游客反馈。</Text>
        </View>

        <View style={styles.formPanel}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>用户名</Text>
            <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="3-20 位字母、数字或下划线"
                placeholderTextColor={Colors.textTertiary}
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  clearFieldError('username');
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
            <Text style={styles.label}>昵称</Text>
            <View style={[styles.inputWrapper, errors.nickname && styles.inputError]}>
              <Text style={styles.inputPrefix}>名</Text>
              <TextInput
                style={styles.input}
                placeholder="选填，游客页会优先展示"
                placeholderTextColor={Colors.textTertiary}
                value={nickname}
                onChangeText={(value) => {
                  setNickname(value);
                  clearFieldError('nickname');
                }}
                maxLength={16}
                returnKeyType="next"
              />
            </View>
            {errors.nickname ? <Text style={styles.errorText}>{errors.nickname}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>密码</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Text style={styles.inputPrefix}>*</Text>
              <TextInput
                style={styles.input}
                placeholder="6-32 位"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearFieldError('password');
                }}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                textContentType="newPassword"
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
            {password ? (
              <View style={styles.strengthBlock}>
                <View style={styles.strengthTrack}>
                  {[0, 1, 2, 3].map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.strengthSegment,
                        item < passwordScore && styles.strengthSegmentActive,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.strengthText}>{passwordHint}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>确认密码</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Text style={styles.inputPrefix}>*</Text>
              <TextInput
                style={styles.input}
                placeholder="再次输入密码"
                placeholderTextColor={Colors.textTertiary}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearFieldError('confirmPassword');
                }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                textContentType="newPassword"
                onSubmitEditing={handleRegister}
              />
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {errors.submit ? <Text style={styles.submitError}>{errors.submit}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>注册并进入</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerHint}>已有账号？</Text>
            <Link href="/auth/login" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>直接登录</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 22,
  },
  topBar: {
    minHeight: 42,
    justifyContent: 'center',
    marginBottom: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backIcon: {
    color: Colors.primaryDark,
    fontSize: 30,
    lineHeight: 32,
  },
  backText: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  heroBlock: {
    marginBottom: 18,
  },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 35,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
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
  fieldGroup: {
    marginBottom: 15,
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
    width: 24,
    color: Colors.primaryDark,
    fontSize: 15,
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
  strengthBlock: {
    marginTop: 8,
  },
  strengthTrack: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 6,
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
  strengthText: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 18,
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
