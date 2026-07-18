import { confirmLogout } from '../utils/logoutConfirmation';

describe('logout confirmation', () => {
  test('runs logout after the user confirms on web', () => {
    const onConfirm = jest.fn();

    confirmLogout({
      platform: 'web',
      confirm: jest.fn(() => true),
      onConfirm,
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('uses the browser confirm function with the global context', () => {
    const browserGlobal = globalThis as unknown as { confirm?: unknown };
    const originalConfirm = browserGlobal.confirm;
    const browserConfirm = jest.fn(function (this: unknown) {
      return this === globalThis;
    });
    Object.defineProperty(globalThis, 'confirm', {
      configurable: true,
      value: browserConfirm,
    });
    const onConfirm = jest.fn();

    try {
      confirmLogout({ platform: 'web', onConfirm });
    } finally {
      if (originalConfirm === undefined) {
        delete browserGlobal.confirm;
      } else {
        Object.defineProperty(globalThis, 'confirm', {
          configurable: true,
          value: originalConfirm,
        });
      }
    }

    expect(browserConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
