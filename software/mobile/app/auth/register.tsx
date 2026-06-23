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

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    if (username.length < 3 || username.length > 20) {
      Alert.alert('提示', '用户名长度为 3-20 位字母数字');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('提示', '用户名只能包含字母、数字和下划线');
      return;
    }
    if (password.length < 6 || password.length > 32) {
      Alert.alert('提示', '密码长度为 6-32 位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), password, nickname.trim() || undefined);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('注册失败', err.message || '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Link href="/auth/login" asChild>
          <Pressable style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>创建账号</Text>
        <View style={styles.divider} />

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="用户名（3-20位字母数字）"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="密码（6-32位）"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="确认密码"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>✏️</Text>
            <TextInput
              style={styles.input}
              placeholder="昵称（选填）"
              placeholderTextColor="#999"
              value={nickname}
              onChangeText={setNickname}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.registerBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>注 册</Text>
            )}
          </Pressable>

          <Link href="/auth/login" asChild>
            <Pressable style={styles.linkBtn}>
              <Text style={styles.linkText}>已有账号？去登录 →</Text>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backText: {
    color: '#6A9C89',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  title: {
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
  registerBtn: {
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
  registerBtnText: {
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
});
