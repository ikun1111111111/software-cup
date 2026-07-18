interface LogoutConfirmationButton {
  text: string;
  style?: 'cancel' | 'destructive';
  onPress?: () => void;
}

interface ConfirmLogoutOptions {
  platform: string;
  onConfirm: () => void | Promise<void>;
  alert?: (
    title: string,
    message: string,
    buttons: LogoutConfirmationButton[],
  ) => void;
  confirm?: (message: string) => boolean;
}

const TITLE = '退出登录';
const MESSAGE = '确定退出当前账号吗？';

export function confirmLogout({
  platform,
  onConfirm,
  alert,
  confirm,
}: ConfirmLogoutOptions) {
  if (platform === 'web') {
    const browserConfirm = confirm
      ?? (globalThis as typeof globalThis & { confirm?: (message: string) => boolean }).confirm;
    if (browserConfirm?.call(globalThis, `${TITLE}\n${MESSAGE}`)) void onConfirm();
    return;
  }

  alert?.(TITLE, MESSAGE, [
    { text: '取消', style: 'cancel' },
    {
      text: '退出',
      style: 'destructive',
      onPress: () => void onConfirm(),
    },
  ]);
}
