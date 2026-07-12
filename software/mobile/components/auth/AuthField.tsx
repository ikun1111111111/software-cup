import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface AuthFieldProps
  extends Omit<
    TextInputProps,
    'value' | 'onChangeText' | 'placeholder' | 'secureTextEntry' | 'style'
  > {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  leading?: ReactNode;
  secureTextEntry?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  leading,
  secureTextEntry = false,
  showPassword = false,
  onTogglePassword,
  accessibilityLabel,
  ...inputProps
}: AuthFieldProps) {
  const hasPasswordToggle = secureTextEntry && Boolean(onTogglePassword);
  const passwordToggleLabel = showPassword ? '隐藏密码' : '显示密码';

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, error && styles.inputFrameError]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          {...inputProps}
          accessibilityLabel={accessibilityLabel ?? label}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={secureTextEntry && !showPassword}
        />
        {hasPasswordToggle ? (
          <Pressable
            accessibilityLabel={passwordToggleLabel}
            accessibilityRole="button"
            accessibilityState={{ expanded: showPassword }}
            hitSlop={6}
            onPress={onTogglePassword}
            style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
          >
            <Text style={styles.passwordToggleText}>{showPassword ? '隐藏' : '显示'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputFrame: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.paperWarm,
    paddingLeft: 14,
  },
  inputFrameError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
  },
  input: {
    minHeight: 52,
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingVertical: 0,
    paddingRight: 14,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  passwordToggle: {
    minWidth: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordToggleText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.68,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
