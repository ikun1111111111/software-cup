import fs from 'node:fs';
import path from 'node:path';
import React, { type ReactElement, type ReactNode } from 'react';
import ts from 'typescript';
import { validateLogin as actualValidateLogin } from '../features/auth/validation';

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

const loginMock = jest.fn<Promise<unknown>, [string, string]>();
const replaceMock = jest.fn();
const validateLoginMock = jest.fn(actualValidateLogin);

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

function loadLoginPage(): () => ReactElement {
  const filePath = path.join(__dirname, '..', 'app', 'auth', 'login.tsx');
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
    if (id === 'react') return { useRef: useRefMock, useState: useStateMock };
    if (id === 'react/jsx-runtime') return require('react/jsx-runtime');
    if (id === 'react-native') return reactNativeMock;
    if (id === 'expo-router') {
      return {
        Link: 'Link',
        useRouter: () => ({ replace: replaceMock }),
      };
    }
    if (id === '@/hooks/useAuth') return { useAuth: () => ({ login: loginMock }) };
    if (id === '@/constants/colors') return colorsMock;
    if (id === '@/features/auth/validation') {
      return { validateLogin: validateLoginMock };
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
    throw new Error(`Unexpected login dependency: ${id}`);
  };

  new Function('module', 'exports', 'require', compiled)(module, module.exports, localRequire);
  return module.exports.default;
}

const LoginPage = loadLoginPage();

function renderLogin(): ReactElement {
  hookCursor = 0;
  return LoginPage();
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

async function enterCredentials(username = '  traveler  ', password = 'secret') {
  let tree = renderLogin();
  const usernameField = findField(tree, '用户名');
  const passwordField = findField(tree, '密码');

  expect(usernameField).toBeDefined();
  expect(passwordField).toBeDefined();
  if (!usernameField || !passwordField) return tree;

  usernameField.props.onChangeText(username);
  passwordField.props.onChangeText(password);
  tree = renderLogin();
  return tree;
}

describe('login page element and interaction contract', () => {
  beforeEach(() => {
    hookCursor = 0;
    hookStates = [];
    loginMock.mockReset();
    replaceMock.mockReset();
    validateLoginMock.mockClear();
  });

  test('composes the shared auth UI and preserves guest and registration links', () => {
    const tree = renderLogin();
    const elements = walk(tree);
    const brandHeader = findComponent(tree, AuthBrandHeaderMock);
    const fields = elements.filter((element) => element.type === AuthFieldMock);
    const links = elements.filter((element) => element.type === 'Link');

    expect(tree.type).toBe(AuthScreenShellMock);
    expect(brandHeader?.props).toMatchObject({
      eyebrow: '灵山智慧导览',
      title: '欢迎回来',
    });
    expect(fields.map((field) => field.props.label)).toEqual(['用户名', '密码']);
    expect(elements.some((element) => element.type === AuthSubmitButtonMock)).toBe(true);
    expect(links.map((link) => link.props.href)).toEqual(
      expect.arrayContaining(['/(tabs)', '/auth/register']),
    );
  });

  test('uses validateLogin and keeps field errors adjacent until that input changes', async () => {
    let tree = renderLogin();
    const submitButton = findSubmitButton(tree);

    expect(submitButton).toBeDefined();
    if (!submitButton) return;
    await submitButton.props.onPress();

    expect(validateLoginMock).toHaveBeenCalledWith('', '');
    expect(loginMock).not.toHaveBeenCalled();

    tree = renderLogin();
    const usernameField = findField(tree, '用户名');
    const passwordField = findField(tree, '密码');
    expect(usernameField?.props.error).toBe('请输入用户名');
    expect(passwordField?.props.error).toBe('请输入密码');

    usernameField?.props.onChangeText('traveler');
    tree = renderLogin();
    expect(findField(tree, '用户名')?.props.error).toBeUndefined();
    expect(findField(tree, '密码')?.props.error).toBe('请输入密码');
  });

  test('trims username, forwards loading, and prevents duplicate login requests', async () => {
    const pendingLogin = deferred<unknown>();
    loginMock.mockReturnValue(pendingLogin.promise);
    let tree = await enterCredentials();
    let submitButton = findSubmitButton(tree);

    expect(submitButton).toBeDefined();
    if (!submitButton) return;
    const originalSubmit = submitButton.props.onPress;
    const firstSubmit = originalSubmit();
    const duplicateSubmit = originalSubmit();

    tree = renderLogin();
    submitButton = findSubmitButton(tree);
    expect(loginMock).toHaveBeenCalledWith('traveler', 'secret');
    expect(submitButton?.props.loading).toBe(true);

    pendingLogin.resolve({});
    await Promise.all([firstSubmit, duplicateSubmit]);
    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });

  test('password submit uses the same handler and password visibility is toggleable', async () => {
    loginMock.mockResolvedValue({});
    let tree = await enterCredentials('traveler', 'secret');
    let passwordField = findField(tree, '密码');
    const submitButton = findSubmitButton(tree);

    expect(passwordField?.props.secureTextEntry).toBe(true);
    expect(passwordField?.props.showPassword).toBe(false);
    expect(passwordField?.props.onSubmitEditing).toBe(submitButton?.props.onPress);

    passwordField?.props.onTogglePassword();
    tree = renderLogin();
    passwordField = findField(tree, '密码');
    expect(passwordField?.props.showPassword).toBe(true);
  });

  test('shows a prominent submit error after a 401 and stays on the login page', async () => {
    loginMock.mockRejectedValueOnce(new Error('用户名或密码错误'));
    let tree = await enterCredentials();
    const submitButton = findSubmitButton(tree);

    expect(submitButton).toBeDefined();
    if (!submitButton) return;
    await submitButton.props.onPress();

    expect(replaceMock).not.toHaveBeenCalled();
    tree = renderLogin();
    const submitError = walk(tree).find(
      (element) => element.type === 'Text' && element.props.children === '用户名或密码错误',
    );
    expect(submitError?.props.accessibilityRole).toBe('alert');

    const passwordField = findField(tree, '密码');
    passwordField?.props.onChangeText('new-secret');
    tree = renderLogin();
    expect(walk(tree).some((element) => element.props.children === '用户名或密码错误')).toBe(false);
  });
});
