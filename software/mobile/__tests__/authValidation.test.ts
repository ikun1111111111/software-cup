import {
  getPasswordScore,
  validateLogin,
  validateRegister,
} from '../features/auth/validation';
import type { LoginErrors, RegisterErrors } from '../features/auth/validation';

describe('validateLogin', () => {
  test('rejects empty login fields', () => {
    const errors: LoginErrors = validateLogin('', '');

    expect(errors).toEqual({
      username: '请输入用户名',
      password: '请输入密码',
    });
  });

  test('checks the trimmed username for required input', () => {
    expect(validateLogin('   ', 'secret')).toEqual({ username: '请输入用户名' });
    expect(validateLogin('  traveler  ', 'secret')).toEqual({});
  });

  test('requires a password independently', () => {
    expect(validateLogin('traveler', '')).toEqual({ password: '请输入密码' });
  });

  test('rejects a whitespace-only password', () => {
    expect(validateLogin('traveler', '   ')).toEqual({ password: '请输入密码' });
  });
});

describe('validateRegister', () => {
  const validRegistration = (
    username = 'traveler_2026',
    nickname = '山客',
    password = 'secret1',
    confirmPassword = password,
  ): RegisterErrors => validateRegister(username, nickname, password, confirmPassword);

  test('uses trimmed username and nickname values for validation', () => {
    expect(validRegistration('   ', '   ')).toEqual({ username: '请输入用户名' });
    expect(validRegistration('  traveler  ', `  ${'灵'.repeat(16)}  `)).toEqual({});
  });

  test.each([
    ['ab', '用户名需为 3-20 位'],
    ['a'.repeat(21), '用户名需为 3-20 位'],
    ['user-name', '仅支持字母、数字和下划线'],
    ['用户123', '仅支持字母、数字和下划线'],
  ])('rejects invalid username %p', (username, message) => {
    expect(validRegistration(username)).toEqual({ username: message });
  });

  test.each(['abc', 'a'.repeat(20), 'User_2026'])('accepts valid username boundary %p', (username) => {
    expect(validRegistration(username)).toEqual({});
  });

  test('rejects a trimmed nickname longer than 16 characters', () => {
    expect(validRegistration('traveler', `  ${'灵'.repeat(17)}  `)).toEqual({
      nickname: '昵称最多 16 个字符',
    });
  });

  test.each([
    ['', { password: '请输入密码', confirmPassword: '请再次输入密码' }],
    ['a'.repeat(5), { password: '密码需为 6-32 位' }],
    ['a'.repeat(33), { password: '密码需为 6-32 位' }],
  ])('rejects invalid password %p', (password, expectedErrors) => {
    expect(validRegistration('traveler', '', password, password)).toEqual(expectedErrors);
  });

  test.each(['a'.repeat(6), 'a'.repeat(32)])('accepts valid password boundary %p', (password) => {
    expect(validRegistration('traveler', '', password, password)).toEqual({});
  });

  test('requires confirmation and rejects a mismatch', () => {
    expect(validRegistration('traveler', '', 'secret1', '')).toEqual({
      confirmPassword: '请再次输入密码',
    });
    expect(validRegistration('traveler', '', 'secret1', 'secret2')).toEqual({
      confirmPassword: '两次输入的密码不一致',
    });
  });

  test('reports independent registration errors together', () => {
    expect(validateRegister('ab', '', '123', '456')).toEqual({
      username: '用户名需为 3-20 位',
      password: '密码需为 6-32 位',
      confirmPassword: '两次输入的密码不一致',
    });
  });
});

describe('getPasswordScore', () => {
  test.each([
    ['', 0],
    ['abcde', 0],
    ['123456', 2],
    ['abcdefghij', 2],
    ['Abcdef1', 3],
    ['Abcdef1!', 4],
    ['Abcdefgh1!', 4],
  ])('scores %p as %i', (password, expectedScore) => {
    expect(getPasswordScore(password)).toBe(expectedScore);
  });

  test('scores stronger passwords higher while capping at four', () => {
    expect(getPasswordScore('123456')).toBeLessThan(getPasswordScore('Travel_2026!'));
    expect(getPasswordScore('Travel_2026!')).toBe(4);
  });
});
