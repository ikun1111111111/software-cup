import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MobileBridgeQRCode from '../components/tourist/MobileBridgeQRCode';

vi.mock('antd', () => ({
  QRCode: ({ value }: { value: string }) => <div data-testid="mobile-bridge-qr" data-value={value} />,
  message: {
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 900px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('MobileBridgeQRCode', () => {
  it('keeps the QR panel collapsed until the user clicks the trigger', () => {
    render(<MobileBridgeQRCode />);

    expect(screen.getByRole('button', { name: /手机扫码/ })).toBeInTheDocument();
    expect(screen.queryByText('手机继续游览')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /手机扫码/ }));

    expect(screen.getByText('手机继续游览')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-bridge-qr')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /手机扫码/ })).not.toBeInTheDocument();
  });
});
