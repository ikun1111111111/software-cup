import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceSelector from '../components/Settings/VoiceSelector';
import AvatarSelector from '../components/Settings/AvatarSelector';

beforeEach(() => {
  localStorage.clear();
});

describe('Settings/VoiceSelector', () => {
  it('renders voice selector button', () => {
    render(<VoiceSelector />);
    expect(screen.getByTestId('voice-selector-btn')).toBeDefined();
  });

  it('shows default voice label', () => {
    render(<VoiceSelector />);
    expect(screen.getByText('普通话')).toBeDefined();
  });

  it('opens dropdown on click', () => {
    render(<VoiceSelector />);
    fireEvent.click(screen.getByTestId('voice-selector-btn'));
    expect(screen.getByTestId('voice-selector-dropdown')).toBeDefined();
  });

  it('selects a voice and calls onChange', () => {
    const onChange = vi.fn();
    render(<VoiceSelector onChange={onChange} />);
    fireEvent.click(screen.getByTestId('voice-selector-btn'));
    fireEvent.click(screen.getByTestId('voice-option-sichuanhua'));
    expect(onChange).toHaveBeenCalledWith('sichuanhua');
  });

  it('saves selection to localStorage', () => {
    render(<VoiceSelector />);
    fireEvent.click(screen.getByTestId('voice-selector-btn'));
    fireEvent.click(screen.getByTestId('voice-option-nanjinghua'));
    expect(localStorage.getItem('voice_selector')).toBe('nanjinghua');
  });
});

describe('Settings/AvatarSelector', () => {
  it('renders avatar selector button', () => {
    render(<AvatarSelector />);
    expect(screen.getByTestId('avatar-selector-btn')).toBeDefined();
  });

  it('shows default skin label', () => {
    render(<AvatarSelector />);
    expect(screen.getByText('古风')).toBeDefined();
  });

  it('opens dropdown on click', () => {
    render(<AvatarSelector />);
    fireEvent.click(screen.getByTestId('avatar-selector-btn'));
    expect(screen.getByTestId('avatar-selector-dropdown')).toBeDefined();
  });

  it('selects a skin and calls onChange', () => {
    const onChange = vi.fn();
    render(<AvatarSelector onChange={onChange} />);
    fireEvent.click(screen.getByTestId('avatar-selector-btn'));
    fireEvent.click(screen.getByTestId('avatar-option-modern'));
    expect(onChange).toHaveBeenCalledWith('modern');
  });

  it('saves selection to localStorage', () => {
    render(<AvatarSelector />);
    fireEvent.click(screen.getByTestId('avatar-selector-btn'));
    fireEvent.click(screen.getByTestId('avatar-option-cartoon'));
    expect(localStorage.getItem('avatar_skin')).toBe('cartoon');
  });
});
