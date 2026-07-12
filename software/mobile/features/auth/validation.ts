export type LoginErrors = Partial<Record<'username' | 'password' | 'submit', string>>;

export type RegisterErrors = Partial<
  Record<'username' | 'nickname' | 'password' | 'confirmPassword' | 'submit', string>
>;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateLogin(username: string, password: string): LoginErrors {
  const errors: LoginErrors = {};

  if (!username.trim()) {
    errors.username = '请输入用户名';
  }
  if (!password.trim()) {
    errors.password = '请输入密码';
  }

  return errors;
}

export function validateRegister(
  username: string,
  nickname: string,
  password: string,
  confirmPassword: string,
): RegisterErrors {
  const errors: RegisterErrors = {};
  const trimmedUsername = username.trim();
  const trimmedNickname = nickname.trim();

  if (!trimmedUsername) {
    errors.username = '请输入用户名';
  } else if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    errors.username = '用户名需为 3-20 位';
  } else if (!USERNAME_PATTERN.test(trimmedUsername)) {
    errors.username = '仅支持字母、数字和下划线';
  }

  if (trimmedNickname.length > 16) {
    errors.nickname = '昵称最多 16 个字符';
  }

  if (!password) {
    errors.password = '请输入密码';
  } else if (password.length < 6 || password.length > 32) {
    errors.password = '密码需为 6-32 位';
  }

  if (!confirmPassword) {
    errors.confirmPassword = '请再次输入密码';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致';
  }

  return errors;
}

export function getPasswordScore(password: string): number {
  let score = 0;

  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  return Math.min(score, 4);
}
