import fs from 'node:fs';
import path from 'node:path';
import React, { type ReactElement, type ReactNode } from 'react';
import ts from 'typescript';

let platformOS = 'ios';

const reactNativeMock = {
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { get OS() { return platformOS; } },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
  useWindowDimensions: () => ({ width: 320, height: 640 }),
};

const safeAreaMock = {
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 18, left: 0 }),
};

const colorsMock = {
  Colors: new Proxy({}, { get: (_target, key) => String(key) }),
};

function loadComponent<T>(fileName: string): T {
  const filePath = path.join(__dirname, '..', 'components', 'auth', fileName);
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
  const module = { exports: {} as T };
  const localRequire = (id: string) => {
    if (id === 'react/jsx-runtime') return require('react/jsx-runtime');
    if (id === 'react-native') return reactNativeMock;
    if (id === 'react-native-safe-area-context') return safeAreaMock;
    if (id === '@/constants/colors') return colorsMock;
    throw new Error(`Unexpected component dependency: ${id}`);
  };

  new Function('module', 'exports', 'require', compiled)(module, module.exports, localRequire);
  return module.exports;
}

const { AuthField } = loadComponent<{
  AuthField: (props: Record<string, unknown>) => ReactElement;
}>('AuthField.tsx');
const { AuthBrandHeader } = loadComponent<{
  AuthBrandHeader: (props: Record<string, unknown>) => ReactElement;
}>('AuthBrandHeader.tsx');
const { AuthScreenShell } = loadComponent<{
  AuthScreenShell: (props: Record<string, unknown>) => ReactElement;
}>('AuthScreenShell.tsx');
const { AuthSubmitButton } = loadComponent<{
  AuthSubmitButton: (props: Record<string, unknown>) => ReactElement;
}>('AuthSubmitButton.tsx');

function walk(node: ReactNode): ReactElement[] {
  if (!React.isValidElement(node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  return [element, ...React.Children.toArray(element.props.children).flatMap(walk)];
}

function stylesOf(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(stylesOf));
  }
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

describe('auth component element contracts', () => {
  beforeEach(() => {
    platformOS = 'ios';
  });

  test('AuthScreenShell combines safe-area insets with narrow-screen spacing', () => {
    const tree = AuthScreenShell({ children: React.createElement('Child') });
    const elements = walk(tree);
    const keyboardView = elements.find((element) => element.type === 'KeyboardAvoidingView');
    const scrollView = elements.find((element) => element.type === 'ScrollView');
    const scrollStyle = stylesOf(scrollView?.props.contentContainerStyle);

    expect(keyboardView?.props.behavior).toBe('padding');
    expect(scrollStyle.paddingHorizontal).toBe(16);
    expect(scrollStyle.paddingTop).toBe(56);
    expect(scrollStyle.paddingBottom).toBe(50);
    expect(elements.some((element) => element.type === 'Child')).toBe(true);
  });

  test('AuthScreenShell centers a max-width panel on web', () => {
    platformOS = 'web';
    const tree = AuthScreenShell({ children: React.createElement('Child') });
    const content = walk(tree).find((element) => {
      const style = stylesOf(element.props.style);
      return style.maxWidth === 480;
    });

    expect(stylesOf(content?.props.style)).toMatchObject({
      maxWidth: 480,
      alignSelf: 'center',
    });
  });

  test('AuthBrandHeader renders compact hierarchy and the 灵 seal', () => {
    const tree = AuthBrandHeader({
      compact: true,
      eyebrow: '灵山智慧导览',
      title: '欢迎归来',
      subtitle: '继续你的文化旅程',
    });
    const elements = walk(tree);
    const texts = elements
      .filter((element) => element.type === 'Text')
      .map((element) => element.props.children);

    expect(texts).toEqual(expect.arrayContaining([
      '灵',
      '灵山智慧导览',
      '欢迎归来',
      '继续你的文化旅程',
    ]));
    expect(stylesOf(tree.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
    });
    const title = elements.find((element) => element.props.children === '欢迎归来');
    expect(stylesOf(title?.props.style).fontSize).toBe(23);
  });

  test('AuthField renders a leading element before the input and adjacent error text', () => {
    const leading = React.createElement('LeadingMark', { testID: 'leading' });
    const tree = AuthField({
      label: '账号',
      value: '',
      onChangeText: jest.fn(),
      leading,
      error: '请输入账号',
    });
    const elements = walk(tree);
    const leadingIndex = elements.findIndex((element) => element.type === 'LeadingMark');
    const inputIndex = elements.findIndex((element) => element.type === 'TextInput');
    const fieldChildren = React.Children.toArray(tree.props.children).filter(
      React.isValidElement,
    ) as ReactElement<{ children?: ReactNode; accessibilityLiveRegion?: string }>[];
    const inputFrameIndex = fieldChildren.findIndex((element) =>
      walk(element).some((child) => child.type === 'TextInput'),
    );
    const errorIndex = fieldChildren.findIndex(
      (element) => element.type === 'Text' && element.props.children === '请输入账号',
    );
    const error = fieldChildren[errorIndex];

    expect(leadingIndex).toBeGreaterThan(-1);
    expect(leadingIndex).toBeLessThan(inputIndex);
    expect(errorIndex).toBe(inputFrameIndex + 1);
    expect(error?.props.accessibilityLiveRegion).toBe('polite');
  });

  test('AuthField exposes accessible password toggle state', () => {
    const onTogglePassword = jest.fn();
    const tree = AuthField({
      label: '密码',
      value: 'secret',
      onChangeText: jest.fn(),
      secureTextEntry: true,
      showPassword: false,
      onTogglePassword,
    });
    const pressable = walk(tree).find((element) => element.type === 'Pressable');

    expect(pressable?.props.accessibilityLabel).toBe('显示密码');
    expect(pressable?.props.accessibilityState).toEqual({ expanded: false });
    expect(pressable?.props.onPress).toBe(onTogglePassword);
  });

  test('AuthSubmitButton disables and shows progress while loading', () => {
    const tree = AuthSubmitButton({ label: '登录', loading: true, onPress: jest.fn() });
    const elements = walk(tree);
    const pressable = elements.find((element) => element.type === 'Pressable');

    expect(pressable?.props.disabled).toBe(true);
    expect(pressable?.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(elements.some((element) => element.type === 'ActivityIndicator')).toBe(true);
    expect(stylesOf(pressable?.props.style({ pressed: false })).minHeight).toBe(52);
  });
});
