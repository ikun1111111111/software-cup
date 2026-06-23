import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('登录失败', err.message || '用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🏔️</Text>
          <Text style={styles.logoTitle}>灵山智慧导览</Text>
        </View>

        {/* Welcome */}
        <Text style={styles.welcomeTitle}>欢迎回来</Text>
        <View style={styles.divider} />

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="用户名"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="密码"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>登 录</Text>
            )}
          </Pressable>

          <Link href="/auth/register" asChild>
            <Pressable style={styles.linkBtn}>
              <Text style={styles.linkText}>还没有账号？去注册 →</Text>
            </Pressable>
          </Link>

          <Link href="/(tabs)" asChild>
            <Pressable style={styles.guestBtn}>
              <Text style={styles.guestBtnText}>先逛逛（游客模式）</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1614',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1614',
    marginBottom: 8,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: '#6A9C89',
    borderRadius: 2,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#E8E4DF',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1614',
  },
  loginBtn: {
    backgroundColor: '#6A9C89',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6A9C89',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#6A9C89',
    fontSize: 14,
  },
  guestBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D4CFC7',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  guestBtnText: {
    color: '#8A8580',
    fontSize: 15,
  },
});
