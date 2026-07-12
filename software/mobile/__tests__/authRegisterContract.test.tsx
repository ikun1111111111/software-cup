import fs from 'node:fs';
import path from 'node:path';
import React, { type ReactElement, type ReactNode } from 'react';
import ts from 'typescript';
import {
  getPasswordScore as actualGetPasswordScore,
  validateRegister as actualValidateRegister,
} from '../features/auth/validation';

type StateSetter = (value: unknown | ((previous: unknown) => unknown)) => void;

let hookCursor = 0;
let hookStates: unknown[] = [];

const useStateMock = (initialValue: unknown): [unknown, StateSetter] => {
  const stateIndex = hookCursor;
  hookCursor += 1;

  if (!(stateIndex in hookStates)) {
    hookStates[stateIndex] = initialValue;
  }

  const setState: StateSetter = (nextValue) => {
    hookStates[stateIndex] = typeof nextValue === 'function'
      ? (nextValue as (previous: unknown) => unknown)(hookStates[stateIndex])
      : nextValue;
  };

  return [hookStates[stateIndex], setState];
};

const useRefMock = (initialValue: unknown): { current: unknown } => {
  const stateIndex = hookCursor;
  hookCursor += 1;

  if (!(stateIndex in hookStates)) {
    hookStates[stateIndex] = { current: initialValue };
  }

  return hookStates[stateIndex] as { current: unknown };
};

const useMemoMock = <T,>(factory: () => T): T => factory();

const registerMock = jest.fn<Promise<unknown>, [string, string, string?]>();
const replaceMock = jest.fn();
const validateRegisterMock = jest.fn(actualValidateRegister);
const getPasswordScoreMock = jest.fn(actualGetPasswordScore);

function AuthScreenShellMock(_props: Record<string, unknown>) {
  return null;
}

function AuthBrandHeaderMock(_props: Record<string, unknown>) {
  return null;
}

function AuthFieldMock(_props: Record<string, unknown>) {
  return null;
}

function AuthSubmitButtonMock(_props: Record<string, unknown>) {
  return null;
}

const reactNativeMock = {
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
};

const colorsMock = {
  Colors: new Proxy({}, { get: (_target, key) => String(key) }),
};

function loadRegisterPage(): () => ReactElement {
  const filePath = path.join(__dirname, '..', 'app', 'auth', 'register.tsx');
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} as { default: () => ReactElement } };
  const localRequire = (id: string) => {
    if (id === 'react') {
      return { useMemo: useMemoMock, useRef: useRefMock, useState: useStateMock };
    }
    if (id === 'react/jsx-runtime') return require('react/jsx-runtime');
    if (id === 'react-native') return reactNativeMock;
    if (id === 'expo-router') {
      return {
        Link: 'Link',
        useRouter: () => ({ replace: replaceMock }),
      };
    }
    if (id === '@/hooks/useAuth') return { useAuth: () => ({ register: registerMock }) };
    if (id === '@/constants/colors') return colorsMock;
    if (id === '@/features/auth/validation') {
      return {
        getPasswordScore: getPasswordScoreMock,
        validateRegister: validateRegisterMock,
      };
    }
    if (id === '@/components/auth/AuthScreenShell') {
      return { AuthScreenShell: AuthScreenShellMock };
    }
    if (id === '@/components/auth/AuthBrandHeader') {
      return { AuthBrandHeader: AuthBrandHeaderMock };
    }
    if (id === '@/components/auth/AuthField') return { AuthField: AuthFieldMock };
    if (id === '@/components/auth/AuthSubmitButton') {
      return { AuthSubmitButton: AuthSubmitButtonMock };
    }
    throw new Error(`Unexpected register dependency: ${id}`);
  };

  new Function('module', 'exports', 'require', compiled)(module, module.exports, localRequire);
  return module.exports.default;
}

const RegisterPage = loadRegisterPage();

function renderRegister(): ReactElement {
  hookCursor = 0;
  return RegisterPage();
}

function walk(node: ReactNode): ReactElement[] {
  if (!React.isValidElement(node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  return [element, ...React.Children.toArray(element.props.children).flatMap(walk)];
}

function findComponent(
  tree: ReactElement,
  component: (props: Record<string, unknown>) => null,
): ReactElement<Record<string, any>> | undefined {
  return walk(tree).find((element) => element.type === component) as
    | ReactElement<Record<string, any>>
    | undefined;
}

function findField(tree: ReactElement, label: string): ReactElement<Record<string, any>> | undefined {
  return walk(tree).find(
    (element) => element.type === AuthFieldMock && element.props.label === label,
  ) as ReactElement<Record<string, any>> | undefined;
}

function findSubmitButton(tree: ReactElement): ReactElement<Record<string, any>> | undefined {
  return findComponent(tree, AuthSubmitButtonMock);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function enterRegistration({
  username = '  traveler  ',
  nickname = '  行者  ',
  password = 'Travel_2026!',
  confirmPassword = 'Travel_2026!',
}: Partial<Record<'username' | 'nickname' | 'password' | 'confirmPassword', string>> = {}) {
  let tree = renderRegister();
  const fields = [
    ['用户名', username],
    ['昵称', nickname],
    ['密码', password],
    ['确认密码', confirmPassword],
  ] as const;

  for (const [label, value] of fields) {
    const field = findField(tree, label);
    expect(field).toBeDefined();
    field?.props.onChangeText(value);
    tree = renderRegister();
  }

  return tree;
}

describe('register page element and interaction contract', () => {
  beforeEach(() => {
    hookCursor = 0;
    hookStates = [];
    registerMock.mockReset();
    replaceMock.mockReset();
    validateRegisterMock.mockClear();
    getPasswordScoreMock.mockClear();
  });

  test('composes shared auth UI with four accessible fields and login links', () => {
    const tree = renderRegister();
    const elements = walk(tree);
    const brandHeader = findComponent(tree, AuthBrandHeaderMock);
    const fields = elements.filter((element) => element.type === AuthFieldMock);
    const links = elements.filter((element) => element.type === 'Link');

    expect(tree.type).toBe(AuthScreenShellMock);
    expect(brandHeader?.props).toMatchObject({
      eyebrow: '灵山智慧导览',
      title: '创建旅途档案',
    });
    expect(fields.map((field) => field.props.label)).toEqual([
      '用户名',
      '昵称',
      '密码',
      '确认密码',
    ]);
    for (const field of fields) {
      expect(field.props.accessibilityLabel).toBe(field.props.label);
      expect(field.props.leading).toBeDefined();
    }
    expect(findSubmitButton(tree)?.props.label).toBe('注册并进入');
    expect(links.map((link) => link.props.href)).toEqual(['/auth/login', '/auth/login']);
    const linkButtons = elements.filter(
      (element) => element.type === 'Pressable' && element.props.accessibilityRole === 'button',
    );
    expect(linkButtons).toHaveLength(2);
    expect(linkButtons.every((button) => button.props.hitSlop === 8)).toBe(true);
  });

  test('uses validateRegister and clears only the edited field error', async () => {
    let tree = renderRegister();
    const submitButton = findSubmitButton(tree);

    expect(submitButton).toBeDefined();
    await submitButton?.props.onPress();

    expect(validateRegisterMock).toHaveBeenCalledWith('', '', '', '');
    expect(registerMock).not.toHaveBeenCalled();

    const expectedErrors = actualValidateRegister('', '', '', '');
    tree = renderRegister();
    expect(findField(tree, '用户名')?.props.error).toBe(expectedErrors.username);
    expect(findField(tree, '密码')?.props.error).toBe(expectedErrors.password);
    expect(findField(tree, '确认密码')?.props.error).toBe(expectedErrors.confirmPassword);

    findField(tree, '用户名')?.props.onChangeText('traveler');
    tree = renderRegister();
    expect(findField(tree, '用户名')?.props.error).toBeUndefined();
    expect(findField(tree, '密码')?.props.error).toBe(expectedErrors.password);
  });

  test('trims registration values, forwards loading, and blocks same-render double submits', async () => {
    const pendingRegistration = deferred<unknown>();
    registerMock.mockReturnValue(pendingRegistration.promise);
    let tree = await enterRegistration({ nickname: '   ' });
    let submitButton = findSubmitButton(tree);
    const confirmPasswordField = findField(tree, '确认密码');

    expect(submitButton).toBeDefined();
    expect(confirmPasswordField?.props.onSubmitEditing).toBe(submitButton?.props.onPress);
    if (!submitButton) return;

    const originalSubmit = submitButton.props.onPress;
    const firstSubmit = originalSubmit();
    const duplicateSubmit = originalSubmit();

    tree = renderRegister();
    submitButton = findSubmitButton(tree);
    expect(registerMock).toHaveBeenCalledWith('traveler', 'Travel_2026!', undefined);
    expect(submitButton?.props.loading).toBe(true);

    pendingRegistration.resolve({});
    await Promise.all([firstSubmit, duplicateSubmit]);
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });

  test('stays on registration failure, shows the server error, and clears it on edit', async () => {
    registerMock.mockRejectedValueOnce(new Error('用户名已存在'));
    let tree = await enterRegistration();
    const submitButton = findSubmitButton(tree);

    expect(submitButton).toBeDefined();
    await submitButton?.props.onPress();

    expect(replaceMock).not.toHaveBeenCalled();
    tree = renderRegister();
    const submitError = walk(tree).find(
      (element) => element.type === 'Text' && element.props.children === '用户名已存在',
    );
    expect(submitError?.props.accessibilityRole).toBe('alert');

    findField(tree, '昵称')?.props.onChangeText('新行者');
    tree = renderRegister();
    expect(walk(tree).some((element) => element.props.children === '用户名已存在')).toBe(false);
  });

  test('toggles password visibility and renders four scored strength segments only after input', () => {
    let tree = renderRegister();
    let passwordField = findField(tree, '密码');

    expect(passwordField?.props.secureTextEntry).toBe(true);
    expect(passwordField?.props.showPassword).toBe(false);
    expect(walk(tree).some((element) => element.props.accessibilityLabel === '密码强度')).toBe(false);

    passwordField?.props.onTogglePassword();
    tree = renderRegister();
    passwordField = findField(tree, '密码');
    expect(passwordField?.props.showPassword).toBe(true);
    expect(findField(tree, '确认密码')?.props.showPassword).toBe(true);

    passwordField?.props.onChangeText('Travel_2026!');
    tree = renderRegister();
    let elements = walk(tree);
    let segments = elements.filter((element) =>
      String(element.props.accessibilityLabel ?? '').startsWith('密码强度第'),
    );
    expect(getPasswordScoreMock).toHaveBeenLastCalledWith('Travel_2026!');
    expect(segments).toHaveLength(4);
    expect(segments.filter((segment) => segment.props.accessibilityState?.selected)).toHaveLength(4);
    expect(elements.some((element) => element.props.children === '很强')).toBe(true);

    findField(tree, '密码')?.props.onChangeText('a');
    tree = renderRegister();
    elements = walk(tree);
    segments = elements.filter((element) =>
      String(element.props.accessibilityLabel ?? '').startsWith('密码强度第'),
    );
    expect(segments).toHaveLength(4);
    expect(elements.some((element) => element.props.children === '较弱')).toBe(true);
  });
});
