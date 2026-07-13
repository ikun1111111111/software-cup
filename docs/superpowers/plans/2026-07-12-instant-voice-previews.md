# Instant Voice Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace slow real-time admin voice previews with three instant, clearly differentiated static MP3 previews while preserving the saved `voiceId` and production TTS behavior.

**Architecture:** Generate three short MP3 assets from the existing Edge TTS voice IDs and serve them from Vite's `public` directory. Move voice labels and preview URLs into a focused configuration module, use a small React hook to own one-at-a-time audio playback, and integrate that hook into `AvatarPage` without calling `/api/tts/cache`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, Edge TTS, Ant Design

## Completion status (2026-07-12)

- Implemented all three static MP3 previews, typed preview metadata, one-at-a-time playback, preloading, distinct descriptions, and independent selection/preview controls.
- Hardened playback cleanup against pending `play()` races: stale `AbortError` rejections are ignored and a media failure is reported only once when both `onerror` and the `play()` promise reject.
- Focused verification passed: 3 test files, 28 tests.
- `npx vite build` passed. The admin page, backend docs, and all three MP3 URLs returned HTTP 200 from the running local services.
- No commits were created because repository Git metadata writes were unavailable in the current sandbox. Unrelated existing backend and mobile changes were left untouched.

---

## File structure

- Create `frontend/public/audio/voice-previews/mandarin.mp3`: fixed preview for `zh-CN-XiaoxiaoNeural`.
- Create `frontend/public/audio/voice-previews/female.mp3`: fixed preview for `zh-CN-XiaoyiNeural`.
- Create `frontend/public/audio/voice-previews/liaoning.mp3`: fixed preview for `zh-CN-liaoning-XiaobeiNeural`.
- Create `frontend/src/config/voicePreviewOptions.ts`: typed voice names, descriptions, and static preview URLs.
- Create `frontend/src/hooks/useStaticVoicePreview.ts`: audio creation, toggle, one-at-a-time playback, failure handling, and unmount cleanup.
- Create `frontend/src/__tests__/VoicePreviewAssets.test.ts`: contract test for the three MP3 assets and configuration.
- Create `frontend/src/__tests__/useStaticVoicePreview.test.tsx`: playback lifecycle tests.
- Modify `frontend/src/pages/admin/AvatarPage.tsx`: replace backend preview calls with the static preview hook and improve visual differentiation.
- Modify `frontend/src/__tests__/AvatarPage.test.tsx`: verify labels, static preview behavior, selection independence, and playback state.

### Task 1: Generate and verify the three static MP3 previews

**Files:**
- Create: `frontend/src/__tests__/VoicePreviewAssets.test.ts`
- Create: `frontend/public/audio/voice-previews/mandarin.mp3`
- Create: `frontend/public/audio/voice-previews/female.mp3`
- Create: `frontend/public/audio/voice-previews/liaoning.mp3`

- [ ] **Step 1: Write the failing asset contract test**

Create `frontend/src/__tests__/VoicePreviewAssets.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const previewFiles = ['mandarin.mp3', 'female.mp3', 'liaoning.mp3'];

describe('voice preview assets', () => {
  it.each(previewFiles)('provides a valid MP3 for %s', (fileName) => {
    const filePath = resolve(
      process.cwd(),
      'public',
      'audio',
      'voice-previews',
      fileName,
    );
    const bytes = readFileSync(filePath);
    const hasId3Header = bytes.subarray(0, 3).toString('ascii') === 'ID3';
    const hasMpegFrameHeader = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;

    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(hasId3Header || hasMpegFrameHeader).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-asset failure**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/VoicePreviewAssets.test.ts
```

Expected: three failures with `ENOENT` for `public/audio/voice-previews/*.mp3`.

- [ ] **Step 3: Generate the three short previews with the approved voices and parameters**

Run from the repository root:

```powershell
New-Item -ItemType Directory -Path "frontend\public\audio\voice-previews" -Force

backend\venv\Scripts\edge-tts.exe --voice "zh-CN-XiaoxiaoNeural" --rate=-5% --pitch=+0Hz --text "你好，欢迎来到灵山景区，我是你的数字导游。" --write-media "frontend\public\audio\voice-previews\mandarin.mp3"

backend\venv\Scripts\edge-tts.exe --voice "zh-CN-XiaoyiNeural" --rate=+8% --pitch=+6Hz --text "你好，欢迎来到灵山景区，我是你的数字导游。" --write-media "frontend\public\audio\voice-previews\female.mp3"

backend\venv\Scripts\edge-tts.exe --voice "zh-CN-liaoning-XiaobeiNeural" --rate=+0% --pitch=-2Hz --text "你好，欢迎来到灵山景区，我是你的数字导游。" --write-media "frontend\public\audio\voice-previews\liaoning.mp3"
```

Expected: each command exits with code 0 and creates a non-empty MP3 file.

- [ ] **Step 4: Run the asset test and verify it passes**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/VoicePreviewAssets.test.ts
```

Expected: one test file passes with three passing parameterized tests.

- [ ] **Step 5: Commit the static previews and asset contract**

```powershell
git add frontend/public/audio/voice-previews frontend/src/__tests__/VoicePreviewAssets.test.ts
git commit -m "feat: add instant voice preview audio"
```

### Task 2: Define typed voice preview metadata

**Files:**
- Create: `frontend/src/config/voicePreviewOptions.ts`
- Modify: `frontend/src/__tests__/VoicePreviewAssets.test.ts`

- [ ] **Step 1: Extend the asset test with the desired configuration contract**

Add this import and test to `frontend/src/__tests__/VoicePreviewAssets.test.ts`:

```ts
import { VOICE_PREVIEW_OPTIONS } from '../config/voicePreviewOptions';

it('defines distinct URLs and descriptive labels for all voices', () => {
  expect(VOICE_PREVIEW_OPTIONS.map((voice) => voice.id)).toEqual([
    'mandarin',
    'female',
    'liaoning',
  ]);
  expect(new Set(VOICE_PREVIEW_OPTIONS.map((voice) => voice.previewUrl)).size).toBe(3);
  expect(VOICE_PREVIEW_OPTIONS.map((voice) => voice.description)).toEqual([
    '温柔清晰 · 稳重 · 标准普通话',
    '青春明亮 · 轻快 · 更有活力',
    '亲切爽朗 · 地域感 · 更有记忆点',
  ]);
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/VoicePreviewAssets.test.ts
```

Expected: failure because `../config/voicePreviewOptions` does not exist.

- [ ] **Step 3: Create the typed configuration module**

Create `frontend/src/config/voicePreviewOptions.ts`:

```ts
export type VoicePreviewId = 'mandarin' | 'female' | 'liaoning';

export interface VoicePreviewOption {
  id: VoicePreviewId;
  name: string;
  description: string;
  previewUrl: string;
}

export const VOICE_PREVIEW_OPTIONS: VoicePreviewOption[] = [
  {
    id: 'mandarin',
    name: '标准女声',
    description: '温柔清晰 · 稳重 · 标准普通话',
    previewUrl: '/audio/voice-previews/mandarin.mp3',
  },
  {
    id: 'female',
    name: '年轻女声',
    description: '青春明亮 · 轻快 · 更有活力',
    previewUrl: '/audio/voice-previews/female.mp3',
  },
  {
    id: 'liaoning',
    name: '东北女声',
    description: '亲切爽朗 · 地域感 · 更有记忆点',
    previewUrl: '/audio/voice-previews/liaoning.mp3',
  },
];
```

- [ ] **Step 4: Run the configuration and asset tests**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/VoicePreviewAssets.test.ts
```

Expected: four tests pass.

- [ ] **Step 5: Commit the typed voice metadata**

```powershell
git add frontend/src/config/voicePreviewOptions.ts frontend/src/__tests__/VoicePreviewAssets.test.ts
git commit -m "feat: define voice preview metadata"
```

### Task 3: Implement a one-at-a-time static audio preview hook

**Files:**
- Create: `frontend/src/hooks/useStaticVoicePreview.ts`
- Create: `frontend/src/__tests__/useStaticVoicePreview.test.tsx`

- [ ] **Step 1: Write the failing playback lifecycle tests**

Create `frontend/src/__tests__/useStaticVoicePreview.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStaticVoicePreview } from '../hooks/useStaticVoicePreview';

const audioInstances: MockAudio[] = [];

class MockAudio {
  src: string;
  currentTime = 0;
  preload = '';
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => {
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });

  constructor(src = '') {
    this.src = src;
    audioInstances.push(this);
  }
}

describe('useStaticVoicePreview', () => {
  beforeEach(() => {
    audioInstances.length = 0;
    vi.stubGlobal('Audio', MockAudio);
  });

  it('plays a static URL and exposes the playing voice id', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));

    expect(audioInstances[0].src).toBe('/audio/mandarin.mp3');
    expect(audioInstances[0].play).toHaveBeenCalledOnce();
    expect(result.current.playingVoiceId).toBe('mandarin');
  });

  it('stops the previous preview before playing another voice', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));
    await act(() => result.current.togglePreview('female', '/audio/female.mp3'));

    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
    expect(audioInstances[0].currentTime).toBe(0);
    expect(audioInstances[1].play).toHaveBeenCalledOnce();
    expect(result.current.playingVoiceId).toBe('female');
  });

  it('toggles the current voice off', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));
    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
    expect(result.current.playingVoiceId).toBeNull();
  });

  it('clears playback state and reports an audio error', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useStaticVoicePreview(onError));

    await act(() => result.current.togglePreview('liaoning', '/audio/liaoning.mp3'));
    act(() => audioInstances[0].onerror?.());

    expect(result.current.playingVoiceId).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('clears playback state when audio ends', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('female', '/audio/female.mp3'));
    act(() => audioInstances[0].onended?.());

    expect(result.current.playingVoiceId).toBeNull();
  });

  it('stops active audio when the component unmounts', async () => {
    const { result, unmount } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));
    unmount();

    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
    expect(audioInstances[0].currentTime).toBe(0);
  });
});
```

- [ ] **Step 2: Run the hook tests and verify the missing-module failure**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/useStaticVoicePreview.test.tsx
```

Expected: failure because `../hooks/useStaticVoicePreview` does not exist.

- [ ] **Step 3: Implement the minimal playback hook**

Create `frontend/src/hooks/useStaticVoicePreview.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

type PreviewErrorHandler = (error: Error) => void;

export function useStaticVoicePreview(onError?: PreviewErrorHandler) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  }, []);

  const togglePreview = useCallback(async (voiceId: string, previewUrl: string) => {
    if (playingVoiceId === voiceId) {
      stopPreview();
      return;
    }

    stopPreview();
    const audio = new Audio(previewUrl);
    audio.preload = 'auto';
    audioRef.current = audio;

    const clearCurrent = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingVoiceId(null);
      }
    };

    audio.onended = clearCurrent;
    audio.onerror = () => {
      clearCurrent();
      onError?.(new Error(`Voice preview failed: ${previewUrl}`));
    };

    try {
      await audio.play();
      if (audioRef.current === audio) {
        setPlayingVoiceId(voiceId);
      }
    } catch (error) {
      clearCurrent();
      onError?.(error instanceof Error ? error : new Error('Voice preview failed'));
    }
  }, [onError, playingVoiceId, stopPreview]);

  useEffect(() => stopPreview, [stopPreview]);

  return { playingVoiceId, togglePreview, stopPreview };
}
```

- [ ] **Step 4: Run the hook tests and verify they pass**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/useStaticVoicePreview.test.tsx
```

Expected: six tests pass.

- [ ] **Step 5: Commit the playback hook**

```powershell
git add frontend/src/hooks/useStaticVoicePreview.ts frontend/src/__tests__/useStaticVoicePreview.test.tsx
git commit -m "feat: add static voice preview player"
```

### Task 4: Integrate instant previews and clearer labels into AvatarPage

**Files:**
- Modify: `frontend/src/pages/admin/AvatarPage.tsx:1-128`
- Modify: `frontend/src/pages/admin/AvatarPage.tsx:426-475`
- Modify: `frontend/src/__tests__/AvatarPage.test.tsx`

- [ ] **Step 1: Replace the old TTS mock with an Audio mock and add failing page tests**

Remove this mock from `frontend/src/__tests__/AvatarPage.test.tsx`:

```ts
vi.mock('../api/tts', () => ({
  previewVoice: vi.fn(() => Promise.resolve('blob:mock-audio-url')),
}));
```

Add this audio mock above `describe('AvatarPage', ...)`:

```tsx
const pageAudioInstances: Array<{
  src: string;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  currentTime: number;
  preload: string;
  onended: (() => void) | null;
  onerror: (() => void) | null;
}> = [];

class PageAudioMock {
  src: string;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
  currentTime = 0;
  preload = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src = '') {
    this.src = src;
    pageAudioInstances.push(this);
  }
}
```

Add this line to `beforeEach`:

```ts
pageAudioInstances.length = 0;
vi.stubGlobal('Audio', PageAudioMock);
```

Add these tests:

```tsx
it('shows a distinct description for every voice option', async () => {
  render(<AvatarPage />);

  expect(await screen.findByText('温柔清晰 · 稳重 · 标准普通话')).toBeDefined();
  expect(screen.getByText('青春明亮 · 轻快 · 更有活力')).toBeDefined();
  expect(screen.getByText('亲切爽朗 · 地域感 · 更有记忆点')).toBeDefined();
});

it('preloads all three static previews when the page mounts', async () => {
  render(<AvatarPage />);

  await waitFor(() => {
    const preloadedUrls = pageAudioInstances
      .filter((audio) => audio.load.mock.calls.length > 0)
      .map((audio) => audio.src);
    expect(preloadedUrls).toEqual([
      '/audio/voice-previews/mandarin.mp3',
      '/audio/voice-previews/female.mp3',
      '/audio/voice-previews/liaoning.mp3',
    ]);
  });
});

it('plays the selected static preview without changing voice selection', async () => {
  render(<AvatarPage />);
  const femaleCard = await screen.findByTestId('voice-female');
  const previewButton = screen.getByTestId('voice-preview-female');

  fireEvent.click(previewButton);

  const playedAudio = await waitFor(() => {
    const audio = pageAudioInstances.find((instance) => instance.play.mock.calls.length > 0);
    expect(audio).toBeDefined();
    return audio;
  });
  expect(playedAudio?.src).toContain('/audio/voice-previews/female.mp3');
  expect(femaleCard.getAttribute('data-selected')).toBe('false');
});

it('shows a playing label while a preview is active', async () => {
  render(<AvatarPage />);
  fireEvent.click(await screen.findByTestId('voice-preview-mandarin'));

  expect(await screen.findByText('播放中')).toBeDefined();
});
```

- [ ] **Step 2: Run the page test and verify it fails for missing labels and static playback**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/AvatarPage.test.tsx
```

Expected: the new tests fail because `AvatarPage` still calls `previewVoice()` and only renders gender text.

- [ ] **Step 3: Replace backend preview imports and local voice metadata**

In `frontend/src/pages/admin/AvatarPage.tsx`:

- Add `PauseCircleOutlined` to the Ant Design icon import.
- Remove `previewVoice` from `../../api/tts`.
- Remove the local `VoiceOption` interface and `VOICE_OPTIONS` array.
- Add:

```ts
import { VOICE_PREVIEW_OPTIONS } from '../../config/voicePreviewOptions';
import { useStaticVoicePreview } from '../../hooks/useStaticVoicePreview';
```

Inside `AvatarPage`, add:

```ts
const handlePreviewError = useCallback(() => {
  message.error('试听音频加载失败，请检查静态资源');
}, []);

const { playingVoiceId, togglePreview } = useStaticVoicePreview(handlePreviewError);

useEffect(() => {
  const preloaders = VOICE_PREVIEW_OPTIONS.map(({ previewUrl }) => {
    const audio = new Audio(previewUrl);
    audio.preload = 'auto';
    audio.load();
    return audio;
  });

  return () => {
    preloaders.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  };
}, []);
```

Delete the existing async `handleVoicePreview` implementation that calls `previewVoice()` and browser `speechSynthesis`.

- [ ] **Step 4: Render descriptions and independent playback state**

Replace the voice map with `VOICE_PREVIEW_OPTIONS.map((voice) => ...)` and apply these behavioral changes:

```tsx
<div
  key={voice.id}
  data-testid={`voice-${voice.id}`}
  data-selected={selected ? 'true' : 'false'}
  onClick={() => handleVoiceChange(voice.id)}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 190,
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    border: selected
      ? '1.5px solid rgba(200, 75, 49, 0.35)'
      : '1px solid var(--border-light)',
    backgroundColor: selected ? 'rgba(200, 75, 49, 0.08)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 200ms',
  }}
>
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{
      fontSize: 13,
      fontWeight: selected ? 600 : 500,
      color: selected ? '#A83828' : 'var(--text-secondary)',
    }}>
      {voice.name}
    </div>
    <div style={{
      marginTop: 3,
      fontSize: 11,
      lineHeight: 1.45,
      color: 'var(--text-tertiary)',
    }}>
      {voice.description}
    </div>
  </div>
  <button
    type="button"
    data-testid={`voice-preview-${voice.id}`}
    onClick={(event) => {
      event.stopPropagation();
      void togglePreview(voice.id, voice.previewUrl);
    }}
    aria-label={`${playingVoiceId === voice.id ? '停止' : '试听'}${voice.name}`}
    title={playingVoiceId === voice.id ? '停止试听' : '试听'}
    style={{
      padding: 4,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: playingVoiceId === voice.id ? '#A83828' : 'var(--mountain-mid)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {playingVoiceId === voice.id ? (
      <>
        <PauseCircleOutlined style={{ fontSize: 18 }} />
        <span style={{ marginLeft: 4, fontSize: 11 }}>播放中</span>
      </>
    ) : (
      <PlayCircleOutlined style={{ fontSize: 18 }} />
    )}
  </button>
</div>
```

- [ ] **Step 5: Run all voice preview tests**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/VoicePreviewAssets.test.ts src/__tests__/useStaticVoicePreview.test.tsx src/__tests__/AvatarPage.test.tsx
```

Expected: all three test files pass.

- [ ] **Step 6: Commit the AvatarPage integration**

```powershell
git add frontend/src/pages/admin/AvatarPage.tsx frontend/src/__tests__/AvatarPage.test.tsx
git commit -m "fix: make voice previews instant and distinct"
```

### Task 5: Verify runtime behavior and package output

**Files:**
- Verify: `frontend/public/audio/voice-previews/*.mp3`
- Verify: `frontend/src/pages/admin/AvatarPage.tsx`

- [ ] **Step 1: Run the focused test suite again from a clean command**

Run:

```powershell
cd frontend
npm test -- --run src/__tests__/VoicePreviewAssets.test.ts src/__tests__/useStaticVoicePreview.test.tsx src/__tests__/AvatarPage.test.tsx
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Build the Vite bundle without the repository's unrelated TypeScript gate**

Run:

```powershell
cd frontend
npx vite build
```

Expected: Vite build completes and copies the three MP3 files into `dist/audio/voice-previews/`.

The repository's current `npm run build` invokes `tsc` first and is already blocked by unrelated `DigitalHumanPose`/`mobileLayout` errors. Do not modify those files as part of this plan; confirm this work introduces no new failures in the focused tests or Vite bundle.

- [ ] **Step 3: Verify all three static URLs through the running dev server**

Run:

```powershell
$files = 'mandarin.mp3','female.mp3','liaoning.mp3'
$files | ForEach-Object {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:5173/audio/voice-previews/$_" -UseBasicParsing
  [PSCustomObject]@{
    File = $_
    Status = $response.StatusCode
    Bytes = $response.RawContentLength
  }
}
```

Expected: every file returns HTTP 200 and more than 1,000 bytes.

- [ ] **Step 4: Manually verify the admin interaction**

Open `http://localhost:5173/admin/avatar` and verify:

1. Each voice card shows its unique description.
2. Clicking a preview starts promptly and shows “播放中”.
3. Starting a second preview stops the first.
4. Clicking the preview button does not change the selected card.
5. Stopping the backend does not prevent static preview playback.

- [ ] **Step 5: Record final verification status**

Run:

```powershell
git status --short
git log -n 4 --oneline
```

Expected: only pre-existing unrelated user changes remain unstaged; the voice-preview commits are visible in recent history.
